import type { Programme } from '../types';
import { formatHour } from './time';

/** Texto curto do "agora / a seguir" para listas e para o leitor de tela. */
export function describeNow(current?: Programme, next?: Programme): string {
  if (current) return `Agora: ${current.title}, até ${formatHour(current.stop)}`;
  if (next) return `A seguir: ${next.title}, às ${formatHour(next.start)}`;
  return 'Sem programação disponível';
}
