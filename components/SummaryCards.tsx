
import React from 'react';
import { SummaryData } from '../types';

interface SummaryCardsProps {
  summary: SummaryData;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="bg-[#1a241f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <i className="fas fa-arrow-up-right text-red-500 rotate-45"></i>
        </div>
        <div className="space-y-1">
          <span className="text-white/40 text-sm font-medium">Total Pendente</span>
          <div className="flex flex-col">
            <span className="text-white/80 text-lg font-bold">R$</span>
            <span className="text-white text-3xl font-black">
              {summary.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
      </div>

      <div className="bg-[#1a241f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/10 flex items-center justify-center mb-6">
          <i className="fas fa-check text-[#1ed760]"></i>
        </div>
        <div className="space-y-1">
          <span className="text-white/40 text-sm font-medium">Total Pago</span>
          <div className="flex flex-col">
            <span className="text-white/80 text-lg font-bold">R$</span>
            <span className="text-white text-3xl font-black">
              {summary.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#1ed760]/5 blur-3xl rounded-full -mr-10 -mt-10"></div>
      </div>
    </div>
  );
};

export default SummaryCards;
