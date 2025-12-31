
import React from 'react';
import { PaymentType } from '../types';
import { MONTHS } from '../constants';

interface DashboardWidgetsProps {
  monthIndex: number;
  year: number;
  totalPending: number;
  totalMonth: number;
  nextMonthTotal: number;
  progress: number;
  walletSummary: Record<PaymentType, number>;
  onNavigateToExpenses: () => void;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  monthIndex,
  year,
  totalPending,
  totalMonth,
  nextMonthTotal,
  progress,
  walletSummary,
  onNavigateToExpenses
}) => {
  const nextMonthName = MONTHS[(monthIndex + 1) % 12];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Big Card */}
      <div className="bg-[#1a241f] rounded-[2.5rem] p-6 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[#1ed760] font-bold text-sm mb-1">A pagar em {MONTHS[monthIndex]}</h2>
            <div className="text-white text-4xl font-black tracking-tight">
              R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
             <i className="fas fa-wallet text-xl"></i>
          </div>
        </div>

        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total do Mês</div>
            <div className="text-white font-bold text-lg">R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{nextMonthName}</div>
            <div className="text-[#1ed760] font-bold text-lg">R$ {nextMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-white/40">Status de Pagamentos</span>
            <span className="text-[#1ed760]">{Math.round(progress)}% Pago</span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1ed760] rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {/* Background Blur */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1ed760]/5 blur-[50px] rounded-full -mr-10 -mt-10 pointer-events-none"></div>
      </div>

      {/* Wallet Summary */}
      <div>
        <div className="flex justify-between items-end mb-4 px-2">
           <h3 className="text-white font-bold text-lg">Resumo por Carteira</h3>
           <button onClick={() => onNavigateToExpenses()} className="text-[#1ed760] text-xs font-bold hover:underline">Ver Faturas</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(walletSummary).map(([type, amount]) => {
            let iconClass = '';
            let bgClass = '';
            let colorClass = '';
            
            switch (type) {
              case PaymentType.NUBANK:
                iconClass = 'fa-credit-card';
                bgClass = 'bg-[#820ad1]/10';
                colorClass = 'text-[#820ad1]';
                break;
              case PaymentType.INTER:
                iconClass = 'fa-university';
                bgClass = 'bg-[#ff7a00]/10';
                colorClass = 'text-[#ff7a00]';
                break;
              case PaymentType.BOLETO:
                iconClass = 'fa-barcode';
                bgClass = 'bg-blue-400/10';
                colorClass = 'text-blue-400';
                break;
              case PaymentType.PIX:
                iconClass = 'fa-bolt';
                bgClass = 'bg-[#32bcad]/10';
                colorClass = 'text-[#32bcad]';
                break;
            }

            return (
              <div key={type} className="bg-[#1a241f] p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-[#202c26] transition-colors">
                 <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center text-lg mb-2 ${colorClass}`}>
                   <i className={`fas ${iconClass}`}></i>
                 </div>
                 <div>
                   <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">{type}</div>
                   <div className="text-white font-bold text-lg">R$ {(amount as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
