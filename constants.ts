
import { PaymentType, PersonName } from './types';

export const PEOPLE: PersonName[] = ['Ju', 'Jo', 'Dy', 'Gi', 'Ra'];

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
