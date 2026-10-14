// Dig: the save code. The whole save as one line of text a player can copy and paste into another browser.
// No DOM, no rules: only text in, text out. Format:  DIG1-<save version>-<check sum, 8 hex>-<deflated save, base64url>
// The check sum is of the compressed text, so a code that was cut or mistyped is refused before it is unpacked.
import { SAVE_VERSION, deserialize } from '../../core/state.js';

const PREFIX = 'DIG1';
const MAX_CODE = 4 * 1024 * 1024;            // a pasted wall of text is refused, not unpacked

// FNV-1a, 32 bits: plenty to catch a cut or mistyped code (it is not a lock)
export function checkSum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const toB64 = bytes => {
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = text => {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('not base64url');
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
async function pipe(bytes, stream) {
  const w = stream.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

// the save text (what G.serialize gives) -> a code
export async function encodeSave(text, version = SAVE_VERSION) {
  const packed = toB64(await pipe(new TextEncoder().encode(text), new CompressionStream('deflate')));
  return `${PREFIX}-${version}-${checkSum(packed)}-${packed}`;
}

// a pasted code -> { ok: true, text, state, info } or { ok: false, why: 'empty' | 'format' | 'sum' | 'newer' | 'broken' }.
// It never touches the stored save: the caller stores `text` only when ok.
export async function decodeSave(code) {
  const c = String(code == null ? '' : code).replace(/\s+/g, '');
  if (!c) return { ok: false, why: 'empty' };
  if (c.length > MAX_CODE) return { ok: false, why: 'format' };
  const m = /^DIG1-(\d{1,4})-([0-9a-f]{8})-([A-Za-z0-9_-]+)$/.exec(c);
  if (!m) return { ok: false, why: 'format' };
  const [, v, sum, packed] = m;
  if (checkSum(packed) !== sum) return { ok: false, why: 'sum' };
  if (Number(v) > SAVE_VERSION) return { ok: false, why: 'newer' };
  try {
    const text = new TextDecoder().decode(await pipe(fromB64(packed), new DecompressionStream('deflate')));
    const state = deserialize(text);       // runs the normal migrations; null when the save is not one of ours or is too new
    if (!state) return { ok: false, why: 'broken' };
    return { ok: true, text, state, info: { stars: state.stars, savedAt: state.savedAt || 0, v: Number(v) } };
  } catch { return { ok: false, why: 'broken' }; }
}
