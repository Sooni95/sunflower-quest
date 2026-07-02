import { ko } from './lang/ko.js';
import { en } from './lang/en.js';
import { ja } from './lang/ja.js';
import { LANG_KEY } from './config.js';

const DICTS = { ko, en, ja };
const FALLBACK_LANG = 'en';

let currentLang = 'ko';

export function setLang(lang) {
  currentLang = DICTS[lang] ? lang : FALLBACK_LANG;
  try {
    localStorage.setItem(LANG_KEY, currentLang);
  } catch (err) {
    console.warn('[i18n] failed to save language preference', err);
  }
}

export function getLang() {
  return currentLang;
}

export function hasSavedLang() {
  try {
    return !!localStorage.getItem(LANG_KEY);
  } catch (err) {
    return false;
  }
}

// 저장된 언어 → navigator.language 자동 감지(ko/ja/그 외→en) 순으로 기본 언어를 정한다.
export function detectInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch (err) {
    // localStorage 접근 불가 시 navigator 감지로 폴백
  }

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('ja')) return 'ja';
  return 'en';
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

// 세 언어 파일의 키 셋을 비교해 누락된 키가 있으면 콘솔에 경고한다.
function validateDictionaries() {
  const entries = Object.entries(DICTS).map(([lang, dict]) => [lang, new Set(Object.keys(dict))]);
  const allKeys = new Set();
  entries.forEach(([, keys]) => keys.forEach((key) => allKeys.add(key)));

  entries.forEach(([lang, keys]) => {
    const missing = [...allKeys].filter((key) => !keys.has(key));
    if (missing.length > 0) {
      console.warn(`[i18n] "${lang}" is missing ${missing.length} key(s):`, missing);
    }
  });
}

validateDictionaries();
