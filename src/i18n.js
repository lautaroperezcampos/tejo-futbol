// Languages: Spanish (the default), English and Brazilian Portuguese. Every text the
// player sees goes through t(key, params): it looks the key up in the current language
// (src/lang/), falls back to Spanish and fills {name} placeholders from params.
// The choice is saved in localStorage.
import * as es from './lang/es.js';
import * as en from './lang/en.js';
import * as pt from './lang/pt.js';

const LANGS = { es, en, pt };
const STORAGE_KEY = 'tejo-futbol-idioma';

// In the order the options screen cycles through them; each label in its own language.
export const LANGUAGES = [
  { id: 'es', label: 'ESPAÑOL', html: 'es' },
  { id: 'en', label: 'ENGLISH', html: 'en' },
  { id: 'pt', label: 'PORTUGUÊS', html: 'pt-BR' },
];

let current = load();
setHtmlLang();

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LANGS[saved] ? saved : 'es';
  } catch {
    return 'es';
  }
}

function setHtmlLang() {
  if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGES.find((l) => l.id === current).html;
}

export function getLang() {
  return current;
}

export function setLang(id) {
  if (!LANGS[id]) return;
  current = id;
  setHtmlLang();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode: the language goes back to Spanish next time.
  }
}

export function t(key, params = {}) {
  const text = LANGS[current].STRINGS[key] ?? es.STRINGS[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

// A national team's [name, short name] in the current language, or undefined to keep the
// Spanish ones from src/cup/nations.js.
export function nationName(id) {
  return LANGS[current].NATIONS?.[id];
}

// Bot difficulty as shown in sentences ("Muy fácil"); levelLabel() in ui.js upper-cases it.
export function botLevelName(id) {
  return t(`bot.${id}`);
}
