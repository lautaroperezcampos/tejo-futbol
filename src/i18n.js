// Languages: Spanish (the default), English and Brazilian Portuguese. Every text the
// player sees goes through t(key, params) and {name} placeholders are filled from params.
// Translations come from the Traducila API, whose keys are the Spanish texts (see
// loadTranslations); src/lang/ has the Spanish texts and the copy used for anything the
// API didn't deliver. The choice is saved in localStorage.
import { TRADUCILA } from './config.js';
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

const language = (id) => LANGUAGES.find((l) => l.id === id);

let current = load();
setHtmlLang();

// Language id -> { Spanish text: translation }, filled by loadTranslations().
const traducila = {};

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

// Downloads the Traducila translations (call before the game starts). Never fails: a
// language that doesn't arrive just keeps using src/lang/.
export async function loadTranslations() {
  const { url, projectId, timeout } = TRADUCILA;
  // The API stores line breaks as \r\n; the game's texts use \n.
  const clean = (text) => text.replace(/\r\n/g, '\n');
  await Promise.all(LANGUAGES.filter((l) => l.id !== 'es').map(async ({ id }) => {
    try {
      const res = await fetch(`${url}/${projectId}/${id}`, { signal: AbortSignal.timeout(timeout) });
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      traducila[id] = Object.fromEntries(data.words.map((w) => [clean(w.key), clean(w.translate)]));
    } catch (err) {
      console.warn(`Traducila: ${id} no disponible, se usa src/lang/`, err);
    }
  }));
}

// Traducila's translation of a Spanish text in the current language, if it has one.
function fromTraducila(spanish) {
  return traducila[current]?.[spanish];
}

export function t(key, params = {}) {
  const text = fromTraducila(es.STRINGS[key]) ?? LANGS[current].STRINGS[key] ?? es.STRINGS[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

// A national team's name in the current language. `index` is 0 for the full name and 1 for
// the short one; `spanish` is that name in src/cup/nations.js.
export function nationName(id, index, spanish) {
  return fromTraducila(spanish) ?? LANGS[current].NATIONS?.[id]?.[index] ?? spanish;
}

// Bot difficulty as shown in sentences ("Muy fácil"); levelLabel() in ui.js upper-cases it.
export function botLevelName(id) {
  return t(`bot.${id}`);
}
