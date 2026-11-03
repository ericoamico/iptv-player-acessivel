import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Faz o leitor de tela (TalkBack/VoiceOver) falar uma mensagem.
 * Pequeno atraso para não ser engolido por uma troca de tela em andamento.
 */
export function announce(message: string, delayMs = Platform.OS === 'android' ? 250 : 100) {
  setTimeout(() => AccessibilityInfo.announceForAccessibility(message), delayMs);
}

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralForm}`;
}
