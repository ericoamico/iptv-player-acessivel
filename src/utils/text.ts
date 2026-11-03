/** Decodifica bytes UTF-8 em texto, com ou sem TextDecoder disponível. */
export function utf8Decode(bytes: Uint8Array): string {
  const TD = (globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder;
  if (TD) {
    try {
      return new TD('utf-8').decode(bytes);
    } catch {
      // segue para a implementação manual
    }
  }
  let out = '';
  const chunk: number[] = [];
  const flush = () => {
    out += String.fromCharCode.apply(null, chunk);
    chunk.length = 0;
  };
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    let cp: number;
    if (b < 0x80) cp = b;
    else if (b >= 0xc0 && b < 0xe0) cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    else if (b >= 0xe0 && b < 0xf0)
      cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else if (b >= 0xf0)
      cp =
        ((b & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
    else cp = 0xfffd;
    if (cp > 0xffff) {
      cp -= 0x10000;
      chunk.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      chunk.push(cp);
    }
    if (chunk.length >= 8192) flush();
  }
  flush();
  return out;
}

/** Devolve o controle para a interface (toques, animações) antes de continuar. */
export const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Recua `end` para não cortar um caractere UTF-8 no meio. */
export function utf8SafeEnd(buf: Uint8Array, end: number, min = 0): number {
  let i = end;
  while (i > min && i > end - 3 && (buf[i - 1] & 0xc0) === 0x80) i--;
  if (i <= min) return end;
  const b = buf[i - 1];
  const need = b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
  return end - (i - 1) < need ? i - 1 : end;
}

/**
 * Decodifica UTF-8 em fatias de 1 MB, liberando a interface entre elas.
 * Aceita vários pedaços (ex.: saída do descompactador).
 */
export async function utf8DecodeAsync(parts: Uint8Array[], pause: () => Promise<void> = yieldToUI): Promise<string> {
  const SLICE = 1 << 20;
  const out: string[] = [];
  let carry: Uint8Array | null = null;
  let n = 0;
  for (let pi = 0; pi < parts.length; pi++) {
    const isLast = pi === parts.length - 1;
    let buf = parts[pi];
    if (carry) {
      const joined = new Uint8Array(carry.length + buf.length);
      joined.set(carry);
      joined.set(buf, carry.length);
      buf = joined;
      carry = null;
    }
    let pos = 0;
    while (pos < buf.length) {
      let end = Math.min(pos + SLICE, buf.length);
      if (end < buf.length || !isLast) end = utf8SafeEnd(buf, end, pos);
      if (end <= pos) {
        carry = buf.slice(pos);
        break;
      }
      out.push(utf8Decode(buf.subarray(pos, end)));
      pos = end;
      if (++n % 2 === 0) await pause();
    }
  }
  if (carry) out.push(utf8Decode(carry));
  return out.join('');
}

/** Decodifica base64 (usado no EPG curto do Xtream) para texto UTF-8. */
export function base64ToUtf8(input: string): string {
  if (!input) return '';
  try {
    const bin = atob(input.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return utf8Decode(bytes);
  } catch {
    return input;
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decodifica entidades XML/HTML básicas e numéricas. */
export function decodeEntities(s: string): string {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

/** Normaliza nomes para comparar canais da lista com canais do EPG. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/\b(fhd|uhd|hd|sd|4k|h265|hevc|alt|backup)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}
