import { File, Paths } from 'expo-file-system';

/** Cache em arquivo (listas e EPG podem passar do limite do AsyncStorage). */
export async function readJson<T>(name: string): Promise<T | null> {
  try {
    const file = new File(Paths.document, `${name}.json`);
    if (!file.exists) return null;
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

/** Falha ao gravar o cache não deve impedir o app de funcionar. */
export async function writeJson(name: string, data: unknown): Promise<void> {
  try {
    const file = new File(Paths.document, `${name}.json`);
    if (!file.exists) file.create();
    await file.write(JSON.stringify(data));
  } catch (e) {
    console.warn(`Não foi possível salvar o cache ${name}:`, e);
  }
}

export function removeJson(name: string) {
  try {
    const file = new File(Paths.document, `${name}.json`);
    if (file.exists) file.delete();
  } catch {
    // ignora
  }
}
