import { Inflate, inflate } from 'pako';

import { EPG_MAX_BYTES, REQUEST_TIMEOUT_MS } from '../config';
import { utf8Decode, utf8DecodeAsync, yieldToUI } from '../utils/text';

export class AppError extends Error {
  constructor(message: string, public readonly kind: 'auth' | 'network' | 'server' | 'format' = 'server') {
    super(message);
    this.name = 'AppError';
  }
}

async function request(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: '*/*' } });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      throw new AppError('O servidor demorou demais para responder. Tente novamente.', 'network');
    }
    throw new AppError('Não foi possível conectar ao servidor. Verifique o endereço e a sua internet.', 'network');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AppError('Acesso negado pelo servidor. Verifique usuário e senha.', 'auth');
  }
  if (!res.ok) throw new AppError(`O servidor respondeu com erro ${res.status}.`, 'server');
  return res;
}

export async function getJson<T>(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const res = await request(url, timeoutMs);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError('Resposta inesperada do servidor. Confira se o endereço está correto.', 'format');
  }
}

/** Baixa texto, descompactando automaticamente arquivos .gz. */
export async function getText(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string> {
  const res = await request(url, timeoutMs);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytesToText(bytes);
}

export function bytesToText(bytes: Uint8Array): string {
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      return inflate(bytes, { toText: true });
    } catch {
      throw new AppError('Não foi possível descompactar o arquivo do guia.', 'format');
    }
  }
  return utf8Decode(bytes);
}

const tooBig = () =>
  new AppError('O guia de programação é grande demais para este aparelho. Use um endereço de guia menor nas configurações.', 'format');

/**
 * Igual a bytesToText, mas descompacta e decodifica em partes,
 * sem travar a interface. Usado para o guia completo (XMLTV), que pode ser enorme.
 */
export async function bytesToTextAsync(bytes: Uint8Array, maxBytes = EPG_MAX_BYTES): Promise<string> {
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const inf = new Inflate();
    const parts: Uint8Array[] = [];
    let total = 0;
    inf.onData = (chunk) => {
      parts.push(chunk);
      total += chunk.length;
    };
    const STEP = 256 * 1024;
    for (let i = 0; i < bytes.length; i += STEP) {
      inf.push(bytes.subarray(i, i + STEP), i + STEP >= bytes.length);
      if (inf.err) throw new AppError('Não foi possível descompactar o arquivo do guia.', 'format');
      if (total > maxBytes) throw tooBig();
      await yieldToUI();
    }
    return utf8DecodeAsync(parts);
  }
  if (bytes.length > maxBytes) throw tooBig();
  return utf8DecodeAsync([bytes]);
}

/** Baixa um arquivo grande de texto (.xml ou .xml.gz) sem travar a interface. */
export async function getLargeText(url: string, timeoutMs: number): Promise<string> {
  const res = await request(url, timeoutMs);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await yieldToUI();
  return bytesToTextAsync(bytes);
}
