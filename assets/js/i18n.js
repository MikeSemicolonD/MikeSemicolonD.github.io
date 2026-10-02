// Swaps text/attributes tagged with data-i18n* for the chosen language (strings live in assets/lang/<code>.json)

const LANG_KEY = 'lang';
const LANG_DIR = 'assets/lang/';
const I18N_ATTRS = ['title', 'aria-label', 'alt'];

// Picker entries; each non-English code needs a matching assets/lang/<code>.json
const LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
};

let currentLang = 'en';
let currentDict = null;            // null = English (the HTML's own text)
let langRequest = 0;               // bumps per switch so a slow fetch can't override a newer pick
const dictCache = {};
const i18nOriginals = new WeakMap(); // element -> { text, html, title, ... } as first seen

function pickLanguage() {
  let stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch (e) {}
  if (stored && LANGUAGES[stored]) return stored;

  for (const tag of navigator.languages || [navigator.language || 'en']) {
    const base = tag.toLowerCase().split('-')[0];
    if (LANGUAGES[base]) return base;
  }
  return 'en';
}

function loadDictionary(lang) {
  if (lang === 'en') return Promise.resolve(null);
  if (!dictCache[lang]) {
    dictCache[lang] = fetch(LANG_DIR + lang + '.json')
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .catch(e => { delete dictCache[lang]; throw e; });
  }
  return dictCache[lang];
}

// Looks up a key for the current language; falls back to `fallback`, then fills {tokens}
function t(key, fallback, vars) {
  let str = currentDict && key in currentDict ? currentDict[key] : fallback;
  if (vars) str = str.replace(/\{(\w+)\}/g, (m, name) => name in vars ? vars[name] : m);
  return str;
}

function originalsFor(el) {
  let o = i18nOriginals.get(el);
  if (!o) {
    o = { text: el.textContent, html: el.innerHTML };
    for (const attr of I18N_ATTRS) o[attr] = el.getAttribute(attr);
    i18nOriginals.set(el, o);
  }
  return o;
}

function applyLanguage(lang, dict) {
  currentLang = lang;
  currentDict = dict;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, originalsFor(el).text);
  });

  for (const attr of I18N_ATTRS) {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`), originalsFor(el)[attr]));
    });
  }

  // Hero words are SVG images in English; other languages swap in matching styled text
  document.querySelectorAll('[data-i18n-word]').forEach(el => {
    const o = originalsFor(el);
    const key = el.dataset.i18nWord;
    if (dict && key in dict) {
      const word = document.createElement('span');
      word.className = 'hero-word';
      word.textContent = dict[key];
      el.replaceChildren(word);
    } else {
      el.innerHTML = o.html;
    }
  });

  const select = document.querySelector('.lang-select');
  if (select) select.value = lang;

  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

// Fetches + applies a language; resolves to the language actually shown
function setLanguage(lang, persist = true) {
  if (!LANGUAGES[lang]) return Promise.resolve(currentLang);
  if (persist) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  const request = ++langRequest;
  return loadDictionary(lang)
    .then(dict => {
      if (request === langRequest) applyLanguage(lang, dict);
    })
    .catch(e => {
      console.warn('Could not load language "' + lang + '":', e);
      if (request === langRequest) applyLanguage('en', null);
    })
    .finally(() => {
      if (request === langRequest) document.documentElement.classList.remove('i18n-pending');
    })
    .then(() => currentLang);
}

function buildLanguagePicker() {
  const select = document.querySelector('.lang-select');
  if (!select) return;

  for (const [code, name] of Object.entries(LANGUAGES)) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = name;
    opt.lang = code;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => setLanguage(select.value));
}

buildLanguagePicker();

const initialLang = pickLanguage();
if (initialLang !== 'en') {
  // Hide the hero until its words arrive so English doesn't flash first
  document.documentElement.classList.add('i18n-pending');
  setLanguage(initialLang, false);
} else {
  applyLanguage('en', null);
}
