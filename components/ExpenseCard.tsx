
import React, { useState } from 'react';
import { Expense, PaymentType, PersonName } from '../types';
import { MONTHS } from '../constants';

interface ExpenseCardProps {
  expense: Expense;
  onTogglePaid: (id: string) => void;
  onEdit: (expense: Expense) => void;
  filterPerson: PersonName | 'Todos';
  futureInstallments: Expense[];
  onPayInstallment: (futureId: string) => void;
  onRevert?: (id: string) => void;
  currentViewMonth?: number;
  currentViewYear?: number;
  onAdvance?: (id: string) => void; 
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ 
  expense, 
  onTogglePaid, 
  onEdit, 
  filterPerson, 
  futureInstallments,
  onPayInstallment,
  onRevert,
  currentViewMonth, 
  currentViewYear 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = () => {
    switch (expense.paymentType) {
      case PaymentType.NUBANK: return 'fa-credit-card text-purple-400';
      case PaymentType.INTER: return 'fa-university text-orange-400';
      case PaymentType.PIX: return 'fa-bolt text-teal-400';
      case PaymentType.BOLETO: return 'fa-barcode text-gray-400';
      default: return 'fa-receipt text-green-400';
    }
  };

  const getPersonColor = (name: string) => {
    if (name === 'Ju') return 'bg-purple-500 text-white';
    if (name === 'Jo') return 'bg-blue-500 text-white';
    if (name === 'Dy') return 'bg-emerald-500 text-white';
    if (name === 'Gi') return 'bg-orange-500 text-white';
    if (name === 'Ra') return 'bg-red-500 text-white';
    
    // Fallback for dynamic users
    const colors = [
      'bg-pink-500 text-white',
      'bg-indigo-500 text-white',
      'bg-cyan-500 text-white',
      'bg-lime-500 text-black',
      'bg-yellow-500 text-black'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  const isIndividual = filterPerson !== 'Todos';
  const displayAmount = isIndividual 
    ? expense.amount / expense.splitBetween.length 
    : expense.amount;

  // Determine if this expense is from a previous month (Overdue)
  const isOverdue = (currentViewMonth !== undefined && currentViewYear !== undefined) &&
    (expense.year < currentViewYear || (expense.year === currentViewYear && expense.month < currentViewMonth));

  // Extract advanced info from description
  const advancedMatch = expense.description.match(/\(\+(\d+).*?\)/);
  const advancedText = advancedMatch ? advancedMatch[1] : null; 
  
  // Clean description removing the entire tag at the end
  const cleanDescription = expense.description.replace(/\s*\(\+.*\)$/, '').trim();

  return (
    <div className={`bg-[#1a241f] rounded-3xl p-5 mb-4 border border-white/5 shadow-lg transition-all ${expense.isPaid ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#26312a] flex items-center justify-center relative">
            <i className={`fas ${getIcon()} text-xl`}></i>
            {isOverdue && !expense.isPaid && (
               <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#1a241f]"></div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-white font-bold text-lg leading-tight ${expense.isPaid ? 'line-through decoration-white/40' : ''}`}>
                {cleanDescription}
              </h4>
              <button 
                onClick={() => onEdit(expense)}
                className="text-white/20 hover:text-[#1ed760] transition-colors p-1"
              >
                <i className="fas fa-pen text-[10px]"></i>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-white/40 text-xs flex items-center gap-1">
                <i className="fas fa-credit-card text-[10px]"></i>
                {expense.paymentType === PaymentType.NUBANK || expense.paymentType === PaymentType.INTER ? 'Crédito' : expense.paymentType}
              </span>
              <span className="text-white/20 text-[10px]">•</span>
              <span className="text-white/40 text-xs">
                {expense.currentInstallment}/{expense.installments}
                {advancedText && (
                   <span className="text-[#1ed760] ml-1 flex items-center gap-1">
                      <span>({advancedText} adiantada{advancedText !== '1' ? 's' : ''})</span>
                      {onRevert && !expense.isPaid && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onRevert(expense.id); }}
                          className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[8px] text-white/60 hover:text-white transition-colors ml-1"
                          title="Desfazer Adiantamento"
                        >
                          <i className="fas fa-undo"></i>
                        </button>
                      )}
                   </span>
                )}
              </span>
              {isOverdue && !expense.isPaid && (
                 <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-1">Atrasado</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
             <span className={`text-white font-bold text-xl ${expense.isPaid ? 'line-through' : ''}`}>
              R$ {displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            
            {!expense.isPaid && futureInstallments.length > 0 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${isExpanded ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/40 hover:text-white'}`}
                title="Ver parcelas futuras"
              >
                <i className={`fas fa-chevron-down text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
              </button>
            )}

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
              className={`w-7 h-7 rounded-full border-2 border-[#1a241f] flex items-center justify-center text-[10px] font-black ${getPersonColor(p)}`}
            >
              {p.substring(0, 2).toUpperCase()}
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

      {/* Expanded List of Future Installments */}
      {isExpanded && futureInstallments.length > 0 && (
        <div className="mt-4 bg-black/20 rounded-xl p-3 space-y-2 border border-white/5 animate-in slide-in-from-top-2 duration-200">
           <div className="flex items-center justify-between mb-3 px-1">
             <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Adiantar Parcelas</span>
             <span className="text-white/20 text-[10px]">{futureInstallments.length} restantes</span>
           </div>
           {futureInstallments.map(future => (
             <div key={future.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
               <div className="flex flex-col">
                 <span className="text-white text-xs font-bold">
                   {future.currentInstallment}ª Parcela
                 </span>
                 <span className="text-white/40 text-[10px] capitalize">
                   {MONTHS[future.month]} {future.year}
                 </span>
               </div>
               <div className="flex items-center gap-3">
                 <span className="text-[#1ed760] text-xs font-bold">
                   R$ {future.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
                 <label className="relative flex items-center justify-center w-5 h-5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded-md checked:bg-[#1ed760] checked:border-[#1ed760] transition-colors"
                      onChange={() => onPayInstallment(future.id)}
                    />
                    <i className="fas fa-check text-black text-[10px] absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                 </label>
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseCard;
