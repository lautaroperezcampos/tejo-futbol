// Live translation with the MyMemory API (https://mymemory.translated.net/doc/spec.php),
// for the languages nobody wrote by hand. It needs no account, but it allows about 5000
// characters a day per connection, roughly the whole game once. So each text is asked for
// only once: what comes back stays in localStorage, and if the quota or the connection
// runs out, the next attempt carries on from there. The source is the English text, which
// the API understands better than the Argentine Spanish one.
import { TRANSLATE } from './config.js';

const API_URL = 'https://api.mymemory.translated.net/get';
const CACHE_PREFIX = 'tejo-futbol-traduccion-';

export function loadTranslation(lang) {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + lang)) ?? {};
  } catch {
    return {};
  }
}

function saveTranslation(lang, strings) {
  try {
    localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(strings));
  } catch {
    // Private mode or storage full: it's translated again next time.
  }
}

function decodeEntities(text) {
  return text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function placeholders(text) {
  return (text.match(/\{\w+\}/g) ?? []).sort().join();
}

// One line of text. Throws if the API says no (usually the daily quota).
async function translateLine(line, lang) {
  const url = `${API_URL}?q=${encodeURIComponent(line)}&langpair=en|${lang}`;
  const response = await fetch(url);
  const json = await response.json();
  const text = json.responseData?.translatedText;
  if (Number(json.responseStatus) !== 200 || json.quotaFinished || !text || text.includes('MYMEMORY WARNING')) {
    throw new Error('translation refused');
  }
  const translated = decodeEntities(text);
  // The titles are in capitals, and the API often answers in lower case.
  return line === line.toUpperCase() ? translated.toUpperCase() : translated;
}

// A text can have several lines, each one sent on its own so the line breaks stay. If
// the API broke a {placeholder}, the English text stays.
async function translateText(text, lang) {
  const lines = [];
  for (const line of text.split('\n')) lines.push(await translateLine(line, lang));
  const translated = lines.join('\n');
  return placeholders(translated) === placeholders(text) ? translated : text;
}

// Adds to `strings` whatever is missing from `source` ({ key: English text }), a few at
// a time. onProgress(done, total) runs after each text; stop() is checked before each one.
// Returns { fetched, complete }.
export async function translateMissing(lang, source, strings, { onProgress, stop }) {
  const worthIt = (key) => !TRANSLATE.skip.includes(key) && /\p{L}{2}/u.test(source[key]);
  const queue = Object.keys(source).filter((key) => worthIt(key) && !(key in strings));
  const total = queue.length;
  let done = 0;
  let failed = false;

  const worker = async () => {
    while (queue.length && !failed && !stop()) {
      const key = queue.shift();
      try {
        strings[key] = await translateText(source[key], lang);
        done++;
        if (done % TRANSLATE.saveEvery === 0) saveTranslation(lang, strings);
        onProgress(done, total);
      } catch {
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: TRANSLATE.parallel }, worker));
  if (done) saveTranslation(lang, strings);
  return { fetched: done, complete: !failed && !queue.length };
}
