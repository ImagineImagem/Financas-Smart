
import { PaymentType, PersonName } from './types';

// Updated Order: Jo, Dy, Gi, Ju, Ra
export const PEOPLE: PersonName[] = ['Jo', 'Dy', 'Gi', 'Ju', 'Ra'];

export const PERSON_FULL_NAMES: Record<string, string> = {
  'Jo': 'Joubert',
  'Dy': 'Dyene',
  'Gi': 'Gilberto',
  'Ju': 'Juracy',
  'Ra': 'Raimunda'
};

export const PAYMENT_TYPES: PaymentType[] = [
  PaymentType.NUBANK,
  PaymentType.INTER,
  PaymentType.PIX,
  PaymentType.BOLETO,
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_MONTH = new Date().getMonth();
