
export enum PaymentType {
  INTER = 'Inter',
  NUBANK = 'Nubank',
  BOLETO = 'Boleto',
  PIX = 'Pix'
}

export type PersonName = 'Ju' | 'Jo' | 'Dy' | 'Gi' | 'Ra';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paymentType: PaymentType;
  installments: number;
  currentInstallment: number;
  month: number;
  year: number;
  day: number;
  date: string; // ISO format YYYY-MM-DD
  splitBetween: PersonName[];
  isPaid: boolean;
  createdAt: number;
}

export interface SummaryData {
  totalPending: number;
  totalPaid: number;
  byPaymentType: Record<PaymentType, number>;
  byPerson: Record<PersonName, number>;
}
