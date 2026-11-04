/**
 * OpenCode v2 Desktop GUI Queue Manager.
 * Source entry for the official @opencode/plugin/gui/vite preset.
 * Vite emits one CommonJS bundle in dist/gui-experimental.cjs.
 * The Desktop host provides the shared GUI SDK, Effect and Solid runtime.
 * The npm consumer does not need Vite or any GUI build dependencies.
 */
import { Plugin, Panel, Command, Style, MenuItem } from "@opencode/plugin/gui";
import { Schema } from "effect";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { shiftSelected, moveSelectedToEdge, dropSelected } from "./draft-order.mjs";
import { LANGUAGE_OPTIONS, MESSAGES, isRtl, resolveLocale, translate } from "./i18n/index.mjs";

const MAX_REPEAT = 500;
const MAX_DRAFTS = 2000;
const MAX_IMPORT = 1000;
const PER_PAGE = 75;
const DRAFT_SCHEMA = Schema.Struct({ items: Schema.Array(Schema.String) });
function assertRepeat(raw, t) {
  if (String(raw).trim() === "") throw new Error(t("error.countEmpty"));
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_REPEAT) throw new Error(t("error.countRange", { max: MAX_REPEAT }));
  return n;
}
function parseLines(raw, t) {
  const lines = String(raw ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error(t("error.linesEmpty"));
  if (lines.length > MAX_IMPORT) throw new Error(t("error.linesMax", { max: MAX_IMPORT }));
  return lines;
}
function limitDrafts(next, t) {
  if (next.length > MAX_DRAFTS) throw new Error(t("error.draftsMax", { max: MAX_DRAFTS }));
  return next;
}
function summary(raw, max = 135) {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
function asMessage(item) {
  if (item.type === "user" || item.type === "synthetic") return item.payload?.text ?? "";
  return `[${item.type}]`;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const css = `
.oqm-root { box-sizing:border-box; color:var(--text-strong,inherit); padding:12px 12px 20px; overflow:auto; height:100%; min-width:250px; font:inherit; }
.oqm-root * { box-sizing:border-box; }
.oqm-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
.oqm-title strong { font-size:15px; }
.oqm-sub { color:var(--text-muted,var(--text-weak,#91919a)); font-size:12px; line-height:1.5; }
.oqm-section { border:1px solid var(--border-base,var(--border-weak,#414149)); border-radius:9px; padding:10px; margin-bottom:10px; }
.oqm-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin:7px 0; }
.oqm-row > label { flex:1 1 120px; }
.oqm-root input, .oqm-root textarea, .oqm-root select { color:inherit; background:var(--surface-raised,var(--background-base,#202026)); border:1px solid var(--border-base,#44444c); border-radius:6px; font:inherit; font-size:12px; padding:7px; min-width:0; max-width:100%; }
.oqm-root input[type=checkbox] { flex:none; accent-color:var(--text-accent,#76b0ff); }
.oqm-root textarea { display:block; width:100%; min-height:65px; resize:vertical; }
.oqm-root button { cursor:pointer; color:inherit; background:var(--surface-raised,#2a2a30); border:1px solid var(--border-base,#484852); border-radius:6px; font:inherit; font-size:12px; padding:6px 9px; overflow-wrap:anywhere; }
.oqm-root[dir="rtl"] { direction:rtl; }
.oqm-language { justify-content:flex-end; margin:0 0 8px; gap:10px; }
.oqm-language label { flex:0 1 auto; }
.oqm-root .oqm-locale { min-width:135px; max-width:215px; flex:1 1 145px; }
.oqm-feature { margin:0 0 10px; padding:6px 10px; border:1px solid var(--border-base,#414149); border-radius:8px; }
.oqm-feature summary { cursor:pointer; font-weight:600; font-size:12px; }
.oqm-feature p { margin:7px 0 4px; line-height:1.6; overflow-wrap:anywhere; }
.oqm-root button:hover:not(:disabled) { filter:brightness(1.15); }
.oqm-root button:disabled { opacity:.4; cursor:not-allowed; }
.oqm-root button.oqm-primary { border-color:var(--text-accent,#6da4ed); }
.oqm-root button.oqm-danger { border-color:#a24d55; }
.oqm-root .oqm-flex { flex:1; }
.oqm-root .oqm-number { width:82px; }
.oqm-root .oqm-search { width:100%; flex:1; }
.oqm-root .oqm-tab { padding:7px 10px; }
.oqm-root .oqm-tab[aria-selected=true] { border-color:var(--text-accent,#6da4ed); font-weight:700; }
.oqm-list { max-height:55vh; overflow:auto; border:1px solid var(--border-base,#393942); border-radius:6px; }
.oqm-item { padding:8px 6px; display:flex; gap:8px; align-items:start; border-bottom:1px solid var(--border-weak,#34343b); }
.oqm-item:last-child { border-bottom:none; }
.oqm-item[aria-selected=true] { background:var(--surface-raised,#2a2a30); }
.oqm-item.oqm-drop-before { box-shadow: inset 0 3px var(--text-accent,#76b0ff); }
.oqm-item.oqm-drop-after { box-shadow: inset 0 -3px var(--text-accent,#76b0ff); }
.oqm-drag-handle { cursor:grab !important; flex:none; padding:6px 5px !important; touch-action:manipulation; user-select:none; }
.oqm-drag-handle:active { cursor:grabbing !important; }
.oqm-bulk-actions { background:var(--surface-raised,#242429); border-radius:6px; padding:5px; }
.oqm-bulk-actions button { white-space:nowrap; }
.oqm-item .oqm-row { margin:0; }
.oqm-item:focus-within { outline:1px solid var(--text-accent,#76b0ff); outline-offset:-1px; }
.oqm-index { font-variant-numeric:tabular-nums; font-size:11px; color:var(--text-muted,#97979d); width:32px; flex:none; }
.oqm-content { min-width:0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; line-height:1.55; flex:1; }
.oqm-muted { color:var(--text-muted,#999); }
.oqm-status { color:var(--text-accent,#83b5ff); padding:7px 0; min-height:23px; font-size:12px; }
`;

function element(tag, className, textValue) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = String(textValue);
  return node;
}
function button(text, handler, className) {
  const node = element("button", className, text);
  node.type = "button";
  node.addEventListener("click", () => { void handler(); });
  return node;
}
function input(type, placeholder, className) {
  const node = element("input", className);
  node.type = type;
  if (placeholder) node.placeholder = placeholder;
  return node;
}
function wipe(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function QueueView(ctx, props) {
  // props.session MUST be read reactively: the same panel may stay mounted
  // while the host routes from one session to another.
  const session = () => props.session;
  // Host IPC-backed global preferences survive restarts and all sessions.
  const preferences = ctx.storage.store("queue-manager.preferences.v1", {
    schema: Schema.Struct({ locale: Schema.String }),
    initial: { locale: "auto" },
    scope: "global",
  });
  const languageChoice = () => {
    const value = preferences.value?.locale;
    return LANGUAGE_OPTIONS.some(({ code }) => code === value) ? value : "auto";
  };
  const language = () => resolveLocale(languageChoice(), ctx.locale?.locale?.() ?? "tr");
  const t = (key, params) => translate(language(), key, params);
  const localized = [];
  const localize = (node, key, property = "textContent") => {
    const update = () => { node[property] = t(key); };
    update();
    localized.push(update);
    return node;
  };
  const langButton = (key, handler, style) => localize(button(t(key), handler, style), key);
  const draftStore = createMemo(() => ctx.storage.store("queue-manager.drafts.v2", {
    schema: DRAFT_SCHEMA,
    initial: { items: [] },
    scope: { session: session() },
  }));
  const [section, setSection] = createSignal("draft");
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(0);
  const [selected, setSelected] = createSignal([]);
  const [pendingSelected, setPendingSelected] = createSignal([]);
  const [native, setNative] = createSignal([]);
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  let token = 0;
  let dragged = null;
  let highlightedDrop = null;
  const current = () => [...(draftStore().value?.items ?? [])];
  const save = (rows) => {
    if (!draftStore().ready()) throw new Error(t("error.draftsLoading"));
    draftStore().set({ items: limitDrafts(rows, t) });
  };
  const clearSelection = () => { setSelected([]); setPage(0); };
  const error = (err) => { setStatus(`${t("error.prefix")}: ${errorMessage(err)}`); ctx.toast.show({ title: t("error.title"), description: errorMessage(err), variant: "error" }); };
  const notice = (text) => { setStatus(text); ctx.toast.show({ title: "Queue Manager", description: text, variant: "success" }); };

  async function refreshInbox(ref = session()) {
    if (!ref) return;
    const id = ref.key;
    const seq = ++token;
    setLoading(true);
    try {
      const response = await ref.server.client.session.inbox.list({ sessionID: ref.id });
      if (seq !== token || session()?.key !== id) return;
      setNative(Array.isArray(response) ? response : []);
      setPendingSelected((was) => was.filter((key) => response.some((item) => item.id === key)));
    } catch (err) {
      if (seq === token && session()?.key === id) error(err);
    } finally {
      if (seq === token) setLoading(false);
    }
  }

  async function stageRepeated() {
    if (busy()) return;
    try {
      const n = assertRepeat(count.value);
      const text = content.value.trim();
      if (!text) throw new Error("Mesaj boş olamaz.");
      const ok = await ctx.dialogs.confirm({ title: "Mesajları taslağa ekle", description: `${n} adet “${summary(text, 70)}” eklenecek. Henüz AI'ya gönderilmeyecek.`, confirm: "Taslağa ekle" });
      if (!ok) return;
      save([...current(), ...Array(n).fill(text)]);
      clearSelection();
      notice(`${n} mesaj taslağa eklendi.`);
    } catch (err) { error(err); }
  }
  async function addLines(raw) {
    if (busy()) return;
    try {
      const rows = parseLines(raw);
      save([...current(), ...rows]);
      clearSelection();
      notice(`${rows.length} satır eklendi.`);
    } catch (err) { error(err); }
  }
  async function runFile(file) {
    if (!file) return;
    try { await addLines(await file.text()); }
    catch (err) { error(err); }
  }
  async function publish() {
    if (busy()) return;
    const rows = current();
    const ref = session();
    if (!ref || !rows.length) return;
    const ok = await ctx.dialogs.confirm({
      title: "Gerçek kuyruğa gönder",
      description: `${rows.length} mesaj ${ref.id} oturumuna sırayla eklenecek. İşlem başlayabilir ve model maliyeti oluşturabilir.`,
      confirm: "Kuyruğa aktar",
    });
    if (!ok) return;
    setBusy(true);
    let sent = 0;
    try {
      while (sent < rows.length) {
        // Do not accidentally send into a different routed session.
        if (session()?.key !== ref.key) throw new Error("Oturum değişti; gönderim durduruldu.");
        const currentRows = current();
        if (currentRows[0] !== rows[sent]) throw new Error("Taslak gönderim sırasında değişti; gönderim durduruldu.");
        await ref.server.client.session.prompt({ sessionID: ref.id, text: rows[sent], delivery: "queue" });
        // Checkpoint after acceptance. A hard crash between these two calls may duplicate one item.
        draftStore().set({ items: currentRows.slice(1) });
        sent += 1;
        if (sent % 10 === 0) setStatus(`${sent}/${rows.length} mesaj kuyruğa eklendi…`);
      }
      clearSelection();
      notice(`${sent} mesaj gerçek OpenCode kuyruğuna eklendi.`);
    } catch (err) { error(new Error(`${sent} mesaj aktarıldı. ${errorMessage(err)}`)); }
    finally { setBusy(false); await refreshInbox(ref); }
  }

  async function edit(index) {
    if (busy()) return;
    const old = current()[index];
    if (old === undefined) return;
    const text = await ctx.dialogs.prompt({ title: `#${index + 1} mesajını düzenle`, value: old, submit: "Kaydet" });
    if (!text?.trim()) return;
    const rows = current();
    if (rows[index] !== old) return error(new Error("Liste değişti; tekrar dene."));
    rows[index] = text.trim();
    save(rows);
  }
  // Publish has no native reorder API: only staged drafts may move.
  function commitOrder(result) {
    if (busy() || !result.changed) return;
    try {
      save(result.items);
      setSelected(result.selected);
      // Unfilter after a move so the new position is visible and unambiguous.
      if (search()) { setSearch(""); searchBox.value = ""; }
      setPage(Math.floor((result.selected[0] ?? 0) / PER_PAGE));
    } catch (err) { error(err); }
  }
  function reorder(index, target) {
    const rows = current();
    if (busy() || index < 0 || index >= rows.length || target < 0 || target >= rows.length) return;
    commitOrder(dropSelected(rows, [index], target, target > index ? "after" : "before"));
  }
  function selectedOrder(mode) {
    if (busy()) return;
    const rows = current();
    const selection = selected();
    const result = mode === "up" || mode === "down"
      ? shiftSelected(rows, selection, mode)
      : moveSelectedToEdge(rows, selection, mode);
    commitOrder(result);
  }
  function clearDropMarker() {
    if (highlightedDrop) {
      highlightedDrop.classList?.remove("oqm-drop-before", "oqm-drop-after");
      highlightedDrop = null;
    }
  }
  function dragPlacement(event, item) {
    const rect = item.getBoundingClientRect?.();
    return rect && Number.isFinite(event.clientY)
      && event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
  }
  function prepareDrag(event, index) {
    if (busy()) { event.preventDefault(); return; }
    const rows = current();
    const selection = selected().includes(index) ? selected() : [index];
    dragged = { selection, rows, sessionKey: session()?.key };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "queue-manager-drafts");
    }
  }
  function finishDrag() { dragged = null; clearDropMarker(); }
  function previewDrop(event, item) {
    if (!dragged || busy()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const placement = dragPlacement(event, item);
    if (highlightedDrop !== item) clearDropMarker();
    highlightedDrop = item;
    item.classList?.toggle("oqm-drop-before", placement === "before");
    item.classList?.toggle("oqm-drop-after", placement === "after");
  }
  function dropOn(event, index, item) {
    if (!dragged) return;
    event.preventDefault();
    const from = dragged;
    const position = dragPlacement(event, item);
    finishDrag();
    if (busy() || from.sessionKey !== session()?.key) return;
    const rows = current();
    if (rows.length !== from.rows.length || rows.some((value, i) => value !== from.rows[i])) {
      error(new Error("Liste sürükleme sırasında değişti. Yeniden dene."));
      return;
    }
    commitOrder(dropSelected(rows, from.selection, index, position));
  }
  async function deleteSelected() {
    if (busy()) return;
    const ids = selected();
    if (!ids.length) return;
    const ok = await ctx.dialogs.confirm({ title: "Taslak mesajları sil", description: `${ids.length} seçili taslak mesajı silinsin mi?`, confirm: "Sil", danger: true });
    if (!ok) return;
    const keep = new Set(ids);
    save(current().filter((_, i) => !keep.has(i)));
    clearSelection();
  }
  async function clearAll() {
    if (busy() || !current().length) return;
    const ok = await ctx.dialogs.confirm({ title: "Bütün taslakları temizle", description: `${current().length} taslak silinecek. Gerçek kuyruk değişmez.`, confirm: "Taslakları temizle", danger: true });
    if (!ok) return;
    save([]); clearSelection();
  }
  async function cancelNative(all = false) {
    if (busy()) return;
    const ref = session();
    if (!ref) return;
    const selectedSet = new Set(pendingSelected());
    const items = native().filter((item) => item.type === "user" && item.delivery === "queue" && (all || selectedSet.has(item.id)));
    if (!items.length) return;
    const ok = await ctx.dialogs.confirm({ title: "Gerçek kuyruğu temizle", description: `${items.length} bekleyen kullanıcı mesajı iptal edilecek. Çalışan görev durdurulmaz.`, confirm: "Mesajları iptal et", danger: true });
    if (!ok) return;
    setBusy(true);
    let removed = 0;
    try {
      for (const item of items) {
        if (session()?.key !== ref.key) throw new Error("Oturum değişti.");
        await ref.server.client.session.inbox.cancel({ sessionID: ref.id, inboxID: item.id });
        removed++;
      }
      notice(`${removed} bekleyen mesaj için iptal gönderildi.`);
    } catch (err) { error(new Error(`${removed} mesaj iptal edildi. ${errorMessage(err)}`)); }
    finally { setBusy(false); setPendingSelected([]); await refreshInbox(ref); }
  }

  const root = element("div", "oqm-root");
  const heading = element("div", "oqm-title");
  heading.append(element("strong", "", "Queue Manager"));
  const countLabel = element("span", "oqm-sub");
  heading.append(countLabel);
  root.append(heading);
  const languageBar = element("div", "oqm-row oqm-language");
  const languageLabel = localize(element("label", "oqm-sub"), "language");
  const languageSelect = element("select", "oqm-locale");
  languageSelect.setAttribute("aria-label", t("language"));
  for (const entry of LANGUAGE_OPTIONS) {
    const option = element("option", "", entry.name);
    option.value = entry.code;
    languageSelect.append(option);
  }
  languageSelect.value = languageChoice();
  languageSelect.addEventListener("change", () => {
    if (!LANGUAGE_OPTIONS.some(({ code }) => code === languageSelect.value)) return;
    preferences.set({ locale: languageSelect.value });
  });
  languageBar.append(languageLabel, languageSelect);
  root.append(languageBar);
  root.append(localize(element("div", "oqm-sub"), "subtitle"));
  const feature = element("details", "oqm-feature");
  const featureTitle = localize(element("summary"), "featureTitle");
  const featureBody = localize(element("p", "oqm-sub"), "featureBody");
  feature.append(featureTitle, featureBody);
  root.append(feature);
  const tabs = element("div", "oqm-row");
  const draftTab = langButton("drafts", () => setSection("draft"), "oqm-tab");
  const nativeTab = langButton("native", () => { setSection("native"); void refreshInbox(); }, "oqm-tab");
  tabs.append(draftTab, nativeTab); root.append(tabs);

  const repeatSection = element("div", "oqm-section");
  repeatSection.append(element("div", "oqm-sub", "Aynı mesajı N kez oluştur"));
  const repeatRow = element("div", "oqm-row");
  const count = input("number", "Adet", "oqm-number"); count.min = "1"; count.max = "500"; count.step = "1"; count.value = "100"; count.title = "Tekrar sayısı";
  repeatRow.append(count);
  for (const n of [10, 25, 50, 100, 200]) repeatRow.append(button(String(n), () => { count.value = String(n); }));
  repeatSection.append(repeatRow);
  const content = element("textarea"); content.value = "devam et"; content.setAttribute("aria-label", "Tekrarlanacak mesaj");
  repeatSection.append(content);
  repeatSection.append(button("Taslağa ekle", stageRepeated, "oqm-primary"));
  const pasteSection = element("div", "oqm-section");
  pasteSection.append(element("div", "oqm-sub", "Alt alta mesaj yapıştır veya TXT dosyası seç (1 satır = 1 mesaj)"));
  const pasted = element("textarea"); pasted.placeholder = "devam et\nTestleri çalıştır\nHataları düzelt";
  pasted.setAttribute("aria-label", "Her satıra bir mesaj");
  pasteSection.append(pasted);
  const pasteActions = element("div", "oqm-row");
  pasteActions.append(button("Satırları ekle", () => { void addLines(pasted.value); }));
  const fileInput = input("file", "", ""); fileInput.accept = ".txt,text/plain"; fileInput.setAttribute("aria-label", "TXT dosyası seç");
  fileInput.addEventListener("change", () => { void runFile(fileInput.files?.[0]); fileInput.value = ""; });
  pasteActions.append(fileInput); pasteSection.append(pasteActions);

  const listSection = element("div", "oqm-section");
  const tools = element("div", "oqm-row");
  const searchBox = input("search", "Mesajlarda ara", "oqm-search");
  searchBox.addEventListener("input", () => { setSearch(searchBox.value); setPage(0); });
  tools.append(searchBox);
  tools.append(button("A-Z", () => { if (!busy()) { save(current().sort((a,b) => a.localeCompare(b, "tr"))); clearSelection(); } }));
  tools.append(button("Z-A", () => { if (!busy()) { save(current().sort((a,b) => b.localeCompare(a, "tr"))); clearSelection(); } }));
  tools.append(button("Ters", () => { if (!busy()) { save(current().reverse()); clearSelection(); } }));
  listSection.append(tools);
  const selectTools = element("div", "oqm-row");
  const selectCount = element("span", "oqm-sub oqm-flex");
  selectTools.append(selectCount);
  selectTools.append(button("Eşleşenleri seç", () => {
    const indices = current().map((text,i) => ({text,i})).filter(({text}) => text.toLocaleLowerCase("tr").includes(search().toLocaleLowerCase("tr"))).map(({i}) => i);
    setSelected(indices);
  }));
  selectTools.append(button("Bu sayfayı seç", () => {
    if (busy()) return;
    const query = search().toLocaleLowerCase("tr");
    const found = current().map((text, index) => ({ text, index })).filter(({text}) => text.toLocaleLowerCase("tr").includes(query));
    const lastPage = Math.max(0, Math.ceil(found.length / PER_PAGE) - 1);
    const offset = Math.max(0, Math.min(page(), lastPage)) * PER_PAGE;
    const visible = found.slice(offset, offset + PER_PAGE).map(({ index }) => index);
    setSelected((was) => [...new Set([...was, ...visible])]);
  }));
  selectTools.append(button("Tümünü seç", () => { if (!busy()) setSelected(current().map((_, i) => i)); }));
  selectTools.append(button("Seçimi kaldır", () => setSelected([])));
  selectTools.append(button("Seçilileri sil", deleteSelected, "oqm-danger"));
  listSection.append(selectTools);
  const bulk = element("div", "oqm-row oqm-bulk-actions");
  const bulkButtons = [
    button("↑ Seçilileri yukarı", () => selectedOrder("up")),
    button("↓ Seçilileri aşağı", () => selectedOrder("down")),
    button("⇡ Başa", () => selectedOrder("start")),
    button("⇣ Sona", () => selectedOrder("end")),
  ];
  bulk.append(...bulkButtons);
  listSection.append(bulk);
  listSection.append(element("div", "oqm-sub", "☑ Satırları işaretle; ⠿ tutamacından sürükle-bırak ile tekli veya toplu taşı. Klavye: Alt+↑/↓, Alt+Home/End. Değişiklikler yalnızca taslaktadır."));
  const draftList = element("div", "oqm-list"); draftList.setAttribute("role", "list"); listSection.append(draftList);
  const paging = element("div", "oqm-row");
  paging.append(button("Önceki", () => setPage(Math.max(0, page() - 1))));
  const pageLabel = element("span", "oqm-sub oqm-flex"); paging.append(pageLabel);
  paging.append(button("Sonraki", () => setPage(page() + 1))); listSection.append(paging);
  const bottom = element("div", "oqm-row");
  bottom.append(button("Bütün taslakları temizle", clearAll, "oqm-danger"));
  bottom.append(button("Tümünü kuyruğa aktar", publish, "oqm-primary")); listSection.append(bottom);

  const nativeSection = element("div", "oqm-section");
  nativeSection.append(element("div", "oqm-sub", "OpenCode'un gerçek bekleyen kuyruğu (çalışan görev ayrı). Burada sıralama değiştirilmez; taslakta sırala, sonra kuyruğa gönder."));
  const nativeActions = element("div", "oqm-row");
  nativeActions.append(button("Yenile", () => refreshInbox()));
  nativeActions.append(button("Seçili mesajları iptal et", () => cancelNative(false), "oqm-danger"));
  nativeActions.append(button("Tüm bekleyenleri iptal et", () => cancelNative(true), "oqm-danger"));
  nativeSection.append(nativeActions);
  const nativeList = element("div", "oqm-list"); nativeSection.append(nativeList);

  root.append(repeatSection, pasteSection, listSection, nativeSection);
  const statusLabel = element("div", "oqm-status"); statusLabel.setAttribute("role", "status"); root.append(statusLabel);

  // Reactivity only touches the changing sections; inputs never lose focus.
  createEffect(() => {
    const active = section();
    draftTab.setAttribute("aria-selected", String(active === "draft"));
    nativeTab.setAttribute("aria-selected", String(active === "native"));
    repeatSection.hidden = active !== "draft";
    pasteSection.hidden = active !== "draft";
    listSection.hidden = active !== "draft";
    nativeSection.hidden = active !== "native";
  });
  createEffect(() => {
    const rows = current();
    const query = search().toLocaleLowerCase("tr");
    const all = rows.map((text, index) => ({ text, index })).filter(({text}) => text.toLocaleLowerCase("tr").includes(query));
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const pageIndex = Math.max(0, Math.min(page(), pages - 1));
    const visible = all.slice(pageIndex * PER_PAGE, (pageIndex + 1) * PER_PAGE);
    const chosen = new Set(selected());
    const isBusy = busy();
    countLabel.textContent = `${rows.length} taslak / ${native().length} bekleyen`;
    selectCount.textContent = `${chosen.size} seçili / ${all.length} eşleşen`;
    for (const action of bulkButtons) action.disabled = isBusy || chosen.size === 0;
    pageLabel.textContent = `${pageIndex + 1}/${pages} sayfa`;
    wipe(draftList);
    if (!draftStore().ready()) draftList.append(element("div", "oqm-item oqm-muted", "Taslaklar yükleniyor…"));
    else if (!visible.length) draftList.append(element("div", "oqm-item oqm-muted", "Mesaj bulunamadı."));
    for (const row of visible) {
      const item = element("div", "oqm-item");
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-selected", String(chosen.has(row.index)));
      item.addEventListener("dragover", (event) => previewDrop(event, item));
      item.addEventListener("drop", (event) => dropOn(event, row.index, item));
      item.addEventListener("dragleave", () => { if (highlightedDrop === item) clearDropMarker(); });
      const check = input("checkbox", "", ""); check.checked = chosen.has(row.index); check.disabled = isBusy;
      check.setAttribute("aria-label", `#${row.index + 1} seç`);
      check.addEventListener("change", () => setSelected((was) => check.checked ? [...new Set([...was,row.index])] : was.filter((i) => i !== row.index)));
      const handle = button("⠿", () => {}, "oqm-drag-handle");
      handle.title = "Sürükleyip başka sıraya bırak (işaretli satırları birlikte taşır)";
      handle.setAttribute("aria-label", `#${row.index + 1} taşı: sürükle-bırak veya Alt+ok tuşları`);
      handle.draggable = !isBusy;
      handle.disabled = isBusy;
      handle.addEventListener("dragstart", (event) => prepareDrag(event, row.index));
      handle.addEventListener("dragend", finishDrag);
      handle.addEventListener("keydown", (event) => {
        if (busy() || !event.altKey) return;
        const mode = event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down"
          : event.key === "Home" ? "start" : event.key === "End" ? "end" : null;
        if (!mode) return;
        event.preventDefault();
        const selection = selected().includes(row.index) ? selected() : [row.index];
        const rows = current();
        commitOrder(mode === "up" || mode === "down"
          ? shiftSelected(rows, selection, mode)
          : moveSelectedToEdge(rows, selection, mode));
      });
      item.append(check, handle, element("span", "oqm-index", String(row.index + 1).padStart(3,"0")));
      const msg = element("div", "oqm-content", summary(row.text, 600)); item.append(msg);
      const actions = element("div", "oqm-row");
      const up = button("↑", () => reorder(row.index, row.index - 1)); up.title = "Yukarı taşı"; up.disabled = isBusy || row.index === 0;
      const down = button("↓", () => reorder(row.index, row.index + 1)); down.title = "Aşağı taşı"; down.disabled = isBusy || row.index === rows.length - 1;
      const editBtn = button("Düzenle", () => edit(row.index)); editBtn.disabled = isBusy;
      const duplicate = button("+", () => {
        if (busy()) return;
        const now = current();
        now.splice(row.index + 1, 0, row.text);
        try { save(now); clearSelection(); } catch(err) { error(err); }
      }); duplicate.title = "Kopyala"; duplicate.disabled = isBusy;
      const top = button("⇡", () => reorder(row.index, 0)); top.title = "En başa taşı"; top.disabled = isBusy || row.index === 0;
      const end = button("⇣", () => reorder(row.index, rows.length - 1)); end.title = "En sona taşı"; end.disabled = isBusy || row.index === rows.length - 1;
      actions.append(up, down, top, end, editBtn, duplicate); item.append(actions); draftList.append(item);
    }
  });
  createEffect(() => {
    const rows = native(); const chosen = new Set(pendingSelected());
    const isBusy = busy();
    wipe(nativeList);
    if (loading() && !rows.length) nativeList.append(element("div", "oqm-item oqm-muted", "Kuyruk yükleniyor…"));
    else if (!rows.length) nativeList.append(element("div", "oqm-item oqm-muted", "Bekleyen mesaj yok."));
    rows.forEach((row, i) => {
      const item = element("div", "oqm-item");
      if (row.type === "user" && row.delivery === "queue") {
        const check = input("checkbox", "", ""); check.checked = chosen.has(row.id); check.disabled = isBusy;
        check.setAttribute("aria-label", `Gerçek kuyruk #${i + 1} seç`);
        check.addEventListener("change", () => setPendingSelected((was) => check.checked ? [...new Set([...was, row.id])] : was.filter((id) => id !== row.id)));
        item.append(check);
      }
      item.append(element("span", "oqm-index", String(i + 1).padStart(3, "0")));
      item.append(element("span", "oqm-content", `${summary(asMessage(row), 600)}\n${row.type} · ${row.delivery ?? ""}`));
      nativeList.append(item);
    });
  });
  createEffect(() => { statusLabel.textContent = status(); });
  // Follow OpenCode's locale in Auto mode; a user choice overrides it and is persisted.
  createEffect(() => {
    const code = language();
    root.setAttribute("lang", code);
    root.setAttribute("dir", isRtl(code) ? "rtl" : "ltr");
    languageSelect.value = languageChoice();
    languageSelect.setAttribute("aria-label", t("language"));
    for (const update of localized) update();
  });
  createEffect(() => {
    const key = session()?.key;
    if (!key) return;
    setSelected([]); setPendingSelected([]); setNative([]); setPage(0); setStatus("");
    void refreshInbox(session());
  });
  const timer = setInterval(() => { if (!busy() && section() === "native") void refreshInbox(); }, 6000);
  onCleanup(() => { clearInterval(timer); token++; finishDrag(); });
  return root;
}

const definition = Plugin.define({
  i18n: MESSAGES,
  setup(ctx) {
    const tab = { id: "main", get title() { return ctx.t("title"); }, closable: "compact", fallback: true };
    ctx.add(Style, css);
    ctx.add(Panel, {
      id: "main",
      region: "side",
      mobile: { get title() { return ctx.t("panel.title"); }, kind: "menu", icon: "list-ordered", order: 45 },
      list: (input) => input.open.includes("main") ? [tab] : [],
      render: (props) => QueueView(ctx, props),
    });
    // Keep the launcher visible even before the first session is selected.
    // An "enabled: false" command disappears from both palette and / menu.
    const openManager = () => {
      const session = ctx.sessions.current();
      if (!session) {
        ctx.toast.show({
          title: ctx.t("title"),
          description: ctx.t("noSession"),
          variant: "info",
        });
        return;
      }
      ctx.layout.open(`${ctx.id}:main`, session);
    };
    ctx.add(Command, () => ({
      id: "open",
      title: ctx.t("open"),
      keywords: "queue manager qm devam et 100 200 sıra liste kuyruk",
      group: "Queue Manager",
      section: "session",
      slash: { name: "qm" },
      featured: true,
      run: openManager,
    }));
    ctx.add(MenuItem, () => {
      const session = ctx.sessions.current();
      return {
        menu: "session.panel",
        id: "open",
        title: ctx.t("panel.title"),
        icon: "list-ordered",
        keybind: `${ctx.id}.open`,
        opened: !!session && ctx.layout.state(`${ctx.id}:main`, session) !== "closed",
        run: openManager,
      };
    });
  },
});

export default definition;
