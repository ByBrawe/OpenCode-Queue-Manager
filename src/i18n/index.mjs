import { UI_LABELS, UI_KEYS } from "./labels.mjs";
import { DETAIL_LABELS, DETAIL_KEYS } from "./details.mjs";

export const LANGUAGE_OPTIONS = Object.freeze([
  { code: "auto", name: "🌐 Auto / Otomatik" },
  { code: "tr", name: "Türkçe" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "pl", name: "Polski" },
  { code: "nl", name: "Nederlands" },
  { code: "sv", name: "Svenska" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-CN", name: "简体中文" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "fa", name: "فارسی" },
]);

export const SUPPORTED_LANGUAGES = Object.freeze(LANGUAGE_OPTIONS.filter((entry) => entry.code !== "auto").map((entry) => entry.code));
export const REQUIRED_KEYS = Object.freeze([...UI_KEYS, ...DETAIL_KEYS]);

const fallback = {
  en: {
    "title": "Queue Manager",
    "error.title": "Queue Manager error",
    "error.prefix": "Error",
    "error.countEmpty": "Repeat count cannot be blank.",
    "error.countRange": "Repeat count must be between 1 and {max}.",
    "error.linesEmpty": "Add at least one non-empty line.",
    "error.linesMax": "Maximum {max} lines per import.",
    "error.draftsMax": "Maximum {max} drafts per session.",
    "error.messageEmpty": "Message cannot be blank.",
    "error.draftsLoading": "Drafts are still loading. Try again.",
    "error.sessionChanged": "Session changed; stopped sending.",
    "error.draftsChanged": "Draft list changed during sending; stopped.",
    "error.dragChanged": "Drafts changed while dragging. Try again.",
    "error.listChanged": "Draft list changed. Try again.",
    "error.sessionShort": "Session changed.",
  },
  tr: {
    "title": "Queue Manager",
    "error.title": "Queue Manager hatası",
    "error.prefix": "Hata",
    "error.countEmpty": "Tekrar sayısı boş olamaz.",
    "error.countRange": "Tekrar sayısı 1-{max} olmalı.",
    "error.linesEmpty": "Liste boş. Her satıra bir mesaj yaz.",
    "error.linesMax": "Bir seferde en fazla {max} satır.",
    "error.draftsMax": "Bir oturumda en fazla {max} taslak tutulabilir.",
    "error.messageEmpty": "Mesaj boş olamaz.",
    "error.draftsLoading": "Taslaklar henüz yüklenmedi; yeniden dene.",
    "error.sessionChanged": "Oturum değişti; gönderim durduruldu.",
    "error.draftsChanged": "Taslak gönderim sırasında değişti; gönderim durduruldu.",
    "error.dragChanged": "Liste sürükleme sırasında değişti. Yeniden dene.",
    "error.listChanged": "Liste değişti; tekrar dene.",
    "error.sessionShort": "Oturum değişti.",
  },
};
const catalog = {};
for (const code of SUPPORTED_LANGUAGES) {
  catalog[code] = Object.freeze({
    ...UI_LABELS[code],
    ...DETAIL_LABELS[code],
    ...fallback[code],
    title: "Queue Manager",
    "panel.title": "Queue Manager",
    "command.open": UI_LABELS[code].open,
  });
}
export const MESSAGES = Object.freeze(catalog);

export function normalizeLocale(input) {
  const locale = String(input || "").trim().replace(/_/g, "-").toLowerCase();
  if (locale === "pt" || locale.startsWith("pt-")) return "pt-BR";
  if (locale === "zh" || locale === "zh-hans" || locale.startsWith("zh-cn") || locale.startsWith("zh-sg")) return "zh-CN";
  const primary = locale.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(primary) ? primary : "en";
}

export function resolveLocale(choice, hostLocale) {
  return choice && choice !== "auto" && SUPPORTED_LANGUAGES.includes(choice)
    ? choice : normalizeLocale(hostLocale);
}

export function isRtl(locale) {
  return locale === "ar" || locale === "fa";
}

export function translate(locale, key, params = {}) {
  const language = normalizeLocale(locale);
  const text = MESSAGES[language]?.[key] ?? MESSAGES.en[key] ?? key;
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, token) =>
    Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : "{" + token + "}");
}
