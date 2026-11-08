// Phone and tablet version. It's decided once, when the game opens: touch screens (where
// the finger is the main pointer) get the match laid out for a phone held upright, with
// on-screen controls; PCs, laptops with a touch screen included, keep the normal version.
// ?celular forces the phone version (to try it from a PC) and ?pc the normal one.
import { t } from './i18n.js';

const params = new URLSearchParams(window.location.search);
export const MOBILE = params.has('celular')
  || (!params.has('pc') && window.matchMedia('(pointer: coarse)').matches);

// Joystick on the right and kick button on the left (chosen in the options).
const INVERT_KEY = 'tejo-futbol-controles-invertidos';
let inverted = loadInverted();

function loadInverted() {
  try {
    return localStorage.getItem(INVERT_KEY) === '1';
  } catch {
    return false;
  }
}

export function touchInverted() {
  return inverted;
}

export function setTouchInverted(value) {
  inverted = value;
  try {
    localStorage.setItem(INVERT_KEY, value ? '1' : '0');
  } catch {
    // Private mode: back to the usual side next time.
  }
}

// A short buzz on phones that can (not iPhones).
export function vibrate(ms) {
  if (MOBILE) navigator.vibrate?.(ms);
}

// Page tweaks for phones: no pinch zoom, scrolling or text selection, and a notice asking
// to turn the phone upright when it's held sideways.
export function setupMobilePage() {
  if (!MOBILE) return;
  document.querySelector('meta[name=viewport]')?.setAttribute(
    'content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  );
  const style = document.createElement('style');
  style.textContent = `
    html, body, #game { height: 100dvh; touch-action: none; user-select: none; -webkit-user-select: none; }
    #rotate { display: none; position: fixed; inset: 0; z-index: 10; align-items: center; justify-content: center;
      text-align: center; padding: 24px; background: #1d1240; color: #ffd23f; font: 22px Bungee, sans-serif; }
    @media (orientation: landscape) and (pointer: coarse) { #rotate { display: flex; } }
  `;
  document.head.appendChild(style);
  const notice = document.createElement('div');
  notice.id = 'rotate';
  notice.textContent = t('mobile.rotate');
  document.body.appendChild(notice);
  document.addEventListener('contextmenu', (event) => event.preventDefault());
}
