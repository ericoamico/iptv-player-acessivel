import * as Application from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

import { getJson } from '../api/http';
import { UPDATE_MANIFEST_URL } from '../config';

/** Conteúdo do latest.json publicado pelo GitHub Actions. */
export interface UpdateInfo {
  versionCode: number;
  version: string;
  apkUrl: string;
  notes?: string;
  publishedAt?: string;
}

const FLAG_GRANT_READ_URI_PERMISSION = 1;

/** Atualização automática só existe no Android (APK instalado fora da loja). */
export const updatesSupported = Platform.OS === 'android';

export function installedBuild(): number {
  return Number(Application.nativeBuildVersion) || 0;
}

export function installedVersion(): string {
  return Application.nativeApplicationVersion ?? '—';
}

/** Compara a versão instalada com a publicada. Retorna a nova versão ou null. */
export async function fetchLatest(): Promise<UpdateInfo> {
  const info = await getJson<UpdateInfo>(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, 20_000);
  if (!info || typeof info.versionCode !== 'number' || !info.apkUrl) {
    throw new Error('Informação de versão inválida.');
  }
  return info;
}

export function isNewer(info: UpdateInfo): boolean {
  return info.versionCode > installedBuild();
}

/** Baixa o APK e abre o instalador do Android. */
export async function downloadAndInstall(info: UpdateInfo, onProgress?: (fraction: number) => void): Promise<void> {
  const dir = new Directory(Paths.cache, 'updates');
  if (dir.exists) dir.delete(); // apaga APKs antigos
  dir.create();
  const dest = new File(dir, `iptv-acessivel-${info.versionCode}.apk`);

  const task = File.createDownloadTask(info.apkUrl, dest, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesWritten / totalBytes);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('Download cancelado.');

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: 'application/vnd.android.package-archive',
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
