import { I18n, I18nLocale, I18nLocaleTranslation } from "../frontwork.ts";
import { default as english } from "./i18n/english.json" with { type: "json" };
import { default as german } from "./i18n/german.json" with { type: "json" };

export const i18n = new I18n([
    new I18nLocale("en", english as I18nLocaleTranslation),
    new I18nLocale("de", german as I18nLocaleTranslation),
]);