
import React from 'react';
import { Expense, PaymentType, PersonName } from '../types';
import { MONTHS } from '../constants';

interface ExpenseCardProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onEdit: (expense: Expense) => void;
  filterPerson: PersonName | 'Todos';
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onTogglePaid, onEdit, filterPerson }) => {
  const getIcon = () => {
    switch (expense.paymentType) {
      case PaymentType.NUBANK: return 'fa-shopping-cart text-purple-400';
      case PaymentType.INTER: return 'fa-university text-orange-400';
      case PaymentType.PIX: return 'fa-bolt text-teal-400';
      case PaymentType.BOLETO: return 'fa-barcode text-gray-400';
      default: return 'fa-receipt text-green-400';
    }
  };

  const isIndividual = filterPerson !== 'Todos';
  const displayAmount = isIndividual 
    ? expense.amount / expense.splitBetween.length 
    : expense.amount;

  return (
    <div className={`bg-[#1a241f] rounded-3xl p-5 mb-4 border border-white/5 shadow-lg transition-all ${expense.isPaid ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#26312a] flex items-center justify-center">
            <i className={`fas ${getIcon()} text-xl`}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-white font-bold text-lg leading-tight ${expense.isPaid ? 'line-through decoration-white/40' : ''}`}>
                {expense.description}
              </h4>
              <button 
                onClick={() => onEdit(expense)}
                className="text-white/20 hover:text-[#1ed760] transition-colors p-1"
              >
                <i className="fas fa-pen text-[10px]"></i>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/40 text-xs flex items-center gap-1">
                <i className="fas fa-credit-card text-[10px]"></i>
                {expense.paymentType === PaymentType.NUBANK || expense.paymentType === PaymentType.INTER ? 'Crédito' : expense.paymentType}
              </span>
              <span className="text-white/20 text-[10px]">•</span>
              <span className="text-white/40 text-xs">
                {expense.currentInstallment}/{expense.installments}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
             <span className={`text-white font-bold text-xl ${expense.isPaid ? 'line-through' : ''}`}>
              R$ {displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <button 
              onClick={() => onTogglePaid(expense.id)}
              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                expense.isPaid 
                ? 'bg-[#1ed760] border-[#1ed760] text-black' 
                : 'border-white/20 text-transparent'
              }`}
            >
              <i className="fas fa-check text-xs"></i>
            </button>
          </div>
          <span className="text-white/30 text-xs mt-1">
            {expense.day} {MONTHS[expense.month].substring(0, 3)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="flex -space-x-2">
          {expense.splitBetween.map(p => (
            <div 
              key={p} 
              className={`w-7 h-7 rounded-full border-2 border-[#1a241f] flex items-center justify-center text-[10px] font-black
                ${p === 'Ju' ? 'bg-purple-500 text-white' : 
                  p === 'Jo' ? 'bg-blue-500 text-white' :
                  p === 'Dy' ? 'bg-emerald-500 text-white' :
                  p === 'Gi' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                }`}
            >
              {p.toUpperCase()}
            </div>
          ))}
        </div>
        
        <span className={`text-xs font-bold ${expense.isPaid ? 'text-white/30' : 'text-[#1ed760]'}`}>
          {expense.isPaid 
            ? 'Pago' 
            : isIndividual
              ? 'Sua parte'
              : expense.splitBetween.length > 1 
                ? `R$ ${(expense.amount / expense.splitBetween.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / pessoa` 
                : 'Individual'
          }
        </span>
      </div>
    </div>
  );
};

export default ExpenseCard;
