const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** "20:15" no horário local. */
export function formatHour(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "03/11 às 14:20" no horário local. */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${formatHour(ms)}`;
}

/** "03/11/2026" */
export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "Hoje", "Amanhã" ou "quarta, 05/11". */
export function formatDayLabel(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Converte a data do XMLTV ("20261103200000 -0300") em milissegundos.
 * Sem fuso informado, assume UTC.
 */
export function parseXmltvDate(value: string): number {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{2}:?\d{2})?/.exec(value.trim());
  if (!m) return NaN;
  const [, y, mo, d, h, mi, s, tz] = m;
  let ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  if (tz) {
    const sign = tz[0] === '-' ? -1 : 1;
    const digits = tz.slice(1).replace(':', '');
    const offsetMin = +digits.slice(0, 2) * 60 + +digits.slice(2, 4);
    ms -= sign * offsetMin * 60_000;
  }
  return ms;
}
