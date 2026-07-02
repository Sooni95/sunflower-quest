import { ko } from './lang/ko.js';
import { en } from './lang/en.js';
import { ja } from './lang/ja.js';

const DICTS = { ko, en, ja };
const FALLBACK_LANG = 'en';

let currentLang = 'ko';

export function setLang(lang) {
  currentLang = DICTS[lang] ? lang : FALLBACK_LANG;
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  const dict = DICTS[currentLang] || {};
  if (key in dict) return dict[key];

  const fallback = DICTS[FALLBACK_LANG] || {};
  if (key in fallback) {
    console.warn(`[i18n] missing key "${key}" in "${currentLang}", falling back to ${FALLBACK_LANG}`);
    return fallback[key];
  }

  console.warn(`[i18n] missing key "${key}" in all dictionaries`);
  return key;
}
