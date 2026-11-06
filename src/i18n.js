// Languages: Spanish (the default), English and Brazilian Portuguese, written by hand, and
// French, Italian and German, translated live with an API (src/translator.js). Every text
// the player sees goes through t(key, params): it looks the key up in the current language
// (src/lang/ or the API's translation), falls back to Spanish and fills {name} placeholders
// from params. The choice is saved in localStorage.
import * as es from './lang/es.js';
import * as en from './lang/en.js';
import * as pt from './lang/pt.js';
import { loadTranslation, translateMissing } from './translator.js';

const LANGS = { es, en, pt };
const STORAGE_KEY = 'tejo-futbol-idioma';

// In the order the options screen cycles through them; each label in its own language.
export const LANGUAGES = [
  { id: 'es', label: 'ESPAÑOL', html: 'es' },
  { id: 'en', label: 'ENGLISH', html: 'en' },
  { id: 'pt', label: 'PORTUGUÊS', html: 'pt-BR' },
  { id: 'fr', label: 'FRANÇAIS', html: 'fr', api: true },
  { id: 'it', label: 'ITALIANO', html: 'it', api: true },
  { id: 'de', label: 'DEUTSCH', html: 'de', api: true },
];

const language = (id) => LANGUAGES.find((l) => l.id === id);

let current = load();
setHtmlLang();

// What the API has translated so far, by language.
const remote = {};
function remoteStrings(id) {
  remote[id] ??= loadTranslation(id);
  return remote[id];
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return language(saved) ? saved : 'es';
  } catch {
    return 'es';
  }
}

function setHtmlLang() {
  if (typeof document !== 'undefined') document.documentElement.lang = language(current).html;
}

export function getLang() {
  return current;
}

export function setLang(id) {
  if (!language(id)) return;
  current = id;
  setHtmlLang();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode: the language goes back to Spanish next time.
  }
}

// Asks the API for what's missing of the current language, if it's one of those.
let job = null; // the language being translated
let status = null;
let listener = null;

export function startTranslation() {
  const lang = current;
  if (!language(lang).api || job) return;
  job = lang;
  status = { percent: 0 };
  translateMissing(lang, en.STRINGS, remoteStrings(lang), {
    stop: () => current !== lang,
    onProgress: (done, total) => {
      status = { percent: Math.round((done / total) * 100) };
      listener?.();
    },
  }).then(({ fetched, complete }) => {
    job = null;
    status = complete || current !== lang ? null : { failed: true };
    listener?.(fetched);
  });
}

// null, or how the translation is going: { percent } or { failed: true }.
export function translationStatus() {
  return status;
}

// callback runs on every step; when it ends it gets how many texts arrived.
export function onTranslation(callback) {
  listener = callback;
}

export function t(key, params = {}) {
  const text = LANGS[current]?.STRINGS[key] ?? (language(current).api ? remoteStrings(current)[key] : null) ?? es.STRINGS[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

// A national team's [name, short name] in the current language, or undefined to keep the
// Spanish ones from src/cup/nations.js. Languages from the API use the English names.
export function nationName(id) {
  return (LANGS[current] ?? en).NATIONS?.[id];
}

// Bot difficulty as shown in sentences ("Muy fácil"); levelLabel() in ui.js upper-cases it.
export function botLevelName(id) {
  return t(`bot.${id}`);
}
