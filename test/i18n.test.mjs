import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGE_OPTIONS, SUPPORTED_LANGUAGES, REQUIRED_KEYS, MESSAGES, normalizeLocale, resolveLocale, isRtl, translate } from "../src/i18n/index.mjs";

test("20 supported natural languages and a separate Auto choice", () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 20);
  assert.equal(LANGUAGE_OPTIONS.length, 21);
  assert.equal(LANGUAGE_OPTIONS[0].code, "auto");
  assert.equal(new Set(SUPPORTED_LANGUAGES).size, 20);
  assert.deepEqual(new Set(SUPPORTED_LANGUAGES), new Set(Object.keys(MESSAGES)));
  for (const choice of LANGUAGE_OPTIONS) assert.ok(choice.name.trim());
});

test("every translated language covers all 60 primary GUI and feature keys", () => {
  assert.equal(REQUIRED_KEYS.length, 60);
  for (const code of SUPPORTED_LANGUAGES) {
    const strings = MESSAGES[code];
    assert.equal(strings.title, "Queue Manager");
    for (const key of REQUIRED_KEYS) {
      assert.equal(typeof strings[key], "string", code + ": " + key);
      assert.ok(strings[key].trim(), code + ": empty " + key);
      assert.notEqual(strings[key], key, code + ": untranslated key " + key);
    }
    for (const key of ["featureBody", "sendSafety", "cancelSafety", "stageSafety"]) {
      assert.ok(strings[key].trim().length >= (key === "featureBody" ? 35 : 10), code + ": missing useful safety/feature detail in " + key);
    }
    assert.equal(typeof strings["command.open"], "string");
    assert.equal(strings["panel.title"], "Queue Manager");
  }
});

test("auto mode follows host locale and manual override has priority", () => {
  assert.equal(normalizeLocale("tr-TR"), "tr");
  assert.equal(normalizeLocale("pt_PT"), "pt-BR");
  assert.equal(normalizeLocale("zh-Hans-CN"), "zh-CN");
  assert.equal(normalizeLocale("zh-CN"), "zh-CN");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("fr-FR"), "fr");
  assert.equal(normalizeLocale("zh-TW"), "en"); // Traditional Chinese is not mislabeled as simplified
  assert.equal(normalizeLocale("xx-ZZ"), "en");
  assert.equal(resolveLocale("auto", "ja-JP"), "ja");
  assert.equal(resolveLocale("de", "ja-JP"), "de");
  assert.equal(resolveLocale("", "ko-KR"), "ko");
  assert.equal(resolveLocale("invalid", "tr-TR"), "tr");
});

test("Arabic and Persian use RTL, other supported languages use LTR", () => {
  for (const code of SUPPORTED_LANGUAGES) {
    assert.equal(isRtl(code), ["ar", "fa"].includes(code), code);
  }
  assert.equal(isRtl(resolveLocale("auto", "ar-SA")), true);
  assert.equal(isRtl(resolveLocale("auto", "fa-IR")), true);
});

test("formatting is safe and missing deep errors fall back to English", () => {
  assert.equal(translate("tr", "error.countRange", { max: 500 }), "Tekrar sayısı 1-500 olmalı.");
  assert.equal(translate("de", "error.countRange", { max: 500 }), "Repeat count must be between 1 and 500.");
  assert.equal(translate("en", "error.messageEmpty"), "Message cannot be blank.");
  assert.equal(translate("tr", "addDraft"), "Taslağa ekle");
  assert.equal(translate("ja", "addDraft"), "下書きに追加");
  assert.equal(translate("ar", "addDraft"), "إضافة إلى المسودات");
  assert.equal(translate("fa", "featureTitle"), "امکانات Queue Manager");
  assert.equal(translate("zh-CN", "sendAll"), "全部加入队列");
  assert.equal(translate("tr", "unknown.key"), "unknown.key");
});

test("changing UI language never translates user-authored prompt text", () => {
  const userMessage = "devam et + API_KEY=@do-not-translate";
  for (const code of SUPPORTED_LANGUAGES) {
    assert.equal(userMessage, "devam et + API_KEY=@do-not-translate");
    assert.ok(translate(code, "sendSafety").trim().length >= 10);
  }
});

test("core English and Turkish send-safety warnings retain the cost notice", () => {
  assert.match(translate("tr", "sendSafety"), /maliyet/);
  assert.match(translate("en", "sendSafety"), /charges/);
  assert.match(translate("tr", "cancelSafety"), /çalışan görev/);
  assert.match(translate("en", "cancelSafety"), /running work/);
});
