import { ENGLISH } from './translations.js';

let displayLanguage = 'ja';
export function normalizeLanguage(value) { return ['auto','ja','en'].includes(value) ? value : 'auto'; }
export function resolveLanguage(setting, languages = []) {
  if (setting === 'ja' || setting === 'en') return setting;
  // Use the user's first preferred browser language; unsupported languages fall back to English.
  const preferred = (Array.isArray(languages) ? languages : [languages]).find(value => typeof value === 'string' && value.trim());
  return /^ja(?:[-_]|$)/i.test(preferred ?? '') ? 'ja' : 'en';
}
export function setLanguage(setting, languages) { displayLanguage = resolveLanguage(setting, languages); return displayLanguage; }
export function getLanguage() { return displayLanguage; }
export function t(source, ...values) {
  const key = Array.isArray(source) ? source.reduce((text, part, i) => text + (i ? `{${i - 1}}` : '') + part, '') : source;
  const message = displayLanguage === 'en' && Object.hasOwn(ENGLISH, key) ? ENGLISH[key] : key;
  // One pass: user-controlled values (including nicknames) are inserted verbatim, never interpreted.
  return values.length ? message.replace(/\{(\d+)\}/g, (match, index) => Number(index) < values.length ? String(values[index]) : match) : message;
}
export function onlineSeatName(seat, index = 0) {
  return seat.bot ? t`コンピューター ${seat.name.match(/\d+/)?.[0] ?? index + 1}` : seat.name;
}
export function onlineNotice(message, seats) {
  if (!message) return '';
  // The server keeps canonical Japanese messages so old/offline clients remain compatible.
  const timedOut = seats.find((seat) => message === `${seat.name}の手をAIが代行しました`);
  if (timedOut) return t`${onlineSeatName(timedOut, seats.indexOf(timedOut))}の手をAIが代行しました`;
  const skipped = /^(赤|青|黄|緑)(?:・(?:赤|青|黄|緑))*は置ける場所がありません。スキップ$/.test(message);
  if (skipped) return t`${message.split('は')[0].split('・').map(color => t(color)).join(' / ')}は置ける場所がありません。スキップ`;
  return t(message);
}
export function createStaticTranslations(doc) {
  // Capture the original, trusted UI once, before dynamic/player text is added.
  // Revisit only these bindings on an explicit language change, never on turns or pointer moves.
  const bindings = [];
  const walker = doc.createTreeWalker(doc.documentElement, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest('script,style,noscript')) continue;
    const source = node.nodeValue.trim();
    if (!Object.hasOwn(ENGLISH, source)) continue;
    const leading = node.nodeValue.match(/^\s*/)[0], trailing = node.nodeValue.match(/\s*$/)[0];
    bindings.push({ node, source, leading, trailing, last:node.nodeValue });
  }
  for (const node of doc.querySelectorAll('[aria-label],[title],[placeholder],meta[name="description"]')) {
    for (const attr of ['aria-label','title','placeholder','content']) {
      const source = node.getAttribute(attr);
      if (source && Object.hasOwn(ENGLISH, source)) bindings.push({node,attr,source,last:source});
    }
  }
  return () => {
    doc.documentElement.lang = displayLanguage;
    for (const binding of bindings) {
      const {node,attr,source,leading,trailing} = binding;
      if (!node.isConnected || (attr ? node.getAttribute(attr) : node.nodeValue) !== binding.last) continue;
      const next = attr ? t(source) : leading + t(source) + trailing;
      if (attr) node.setAttribute(attr,next); else node.nodeValue = next;
      binding.last = next;
    }
  };
}
