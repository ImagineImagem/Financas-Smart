
import React, { useState, useRef } from 'react';
import { Expense, PaymentType, PersonName } from '../types';
import { PAYMENT_TYPES } from '../constants';

interface ExpenseFormProps {
  onSave: (expense: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'currentInstallment'> & { id?: string }) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  initialData?: Expense;
  peopleList: PersonName[];
  personLabels: Record<string, string>;
  onAddPerson: (sigla: string, name: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  onSave, 
  onClose, 
  onDelete, 
  initialData, 
  peopleList, 
  personLabels,
  onAddPerson 
}) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [paymentType, setPaymentType] = useState<PaymentType>(initialData?.paymentType || PaymentType.NUBANK);
  const [installments, setInstallments] = useState(initialData?.installments || 1);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [splitBetween, setSplitBetween] = useState<PersonName[]>(initialData?.splitBetween || ['Jo']); 
  const [isDivided, setIsDivided] = useState(initialData ? initialData.splitBetween.length > 0 : true);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      alert("Preencha a descrição e o valor.");
      return;
    }
    if (isDivided && splitBetween.length === 0) {
      alert("Selecione pelo menos uma pessoa para dividir ou desative a divisão.");
      return;
    }

    const normalizedAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(normalizedAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Valor inválido.");
      return;
    }

    const selectedDate = new Date(date + 'T12:00:00'); 

    onSave({
      id: initialData?.id,
      description,
      amount: parsedAmount,
      paymentType,
      installments,
      month: selectedDate.getMonth(),
      year: selectedDate.getFullYear(),
      day: selectedDate.getDate(),
      date,
      splitBetween: isDivided ? splitBetween : ['Jo'],
    });
    onClose();
  };

  const togglePerson = (person: PersonName) => {
    setSplitBetween(prev => 
      prev.includes(person) ? prev.filter(p => p !== person) : [...prev, person]
    );
  };

  const handleAddNewPerson = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    const sigla = prompt("Digite a sigla (Max 3 letras, Ex: Edu):");
    if (!sigla) return;
    
    if (sigla.length > 3) {
      alert("A sigla deve ter no máximo 3 letras.");
      return;
    }
    
    const name = prompt("Digite o nome completo:");
    if (!name) return;
    
    onAddPerson(sigla, name);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col pt-10 animate-in fade-in duration-200">
      <div className="flex justify-between items-center px-6 py-4">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>
        <h2 className="text-white font-bold text-lg">{initialData ? 'Editar Despesa' : 'Nova Despesa'}</h2>
        {initialData ? (
          <button onClick={() => onDelete?.(initialData.id)} className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors">Excluir</button>
        ) : (
          <button onClick={() => { setDescription(''); setAmount(''); }} className="text-white/40 text-sm font-medium hover:text-white transition-colors">Limpar</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 space-y-8 custom-scrollbar pb-32">
        {/* Value Section */}
        <div className="space-y-2">
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
             {initialData ? 'Valor da Parcela/Despesa' : 'Valor Total da Compra'}
          </label>
          <div className="bg-[#1a241f] border border-white/10 rounded-[2rem] p-6 flex items-baseline gap-2 focus-within:border-[#1ed760] transition-colors">
            <span className="text-[#1ed760] text-3xl font-bold">R$</span>
            <input
              type="text" 
              inputMode="decimal"
              autoFocus
              className="bg-transparent text-white text-5xl font-black outline-none w-full placeholder:text-white/10"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {!initialData && installments > 1 && amount && (
             <p className="text-white/40 text-xs text-right px-2">
               Serão geradas {installments} parcelas de R$ {(parseFloat(amount.replace(',', '.') || '0') / installments).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Descrição</label>
          <div className="bg-[#1a241f] border border-white/10 rounded-2xl p-4 flex items-center gap-4 focus-within:border-[#1ed760] transition-colors">
            <i className="fas fa-edit text-white/20"></i>
            <input
              type="text"
              className="bg-transparent text-white font-medium outline-none w-full placeholder:text-white/20"
              placeholder="Ex: Supermercado, Jantar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="space-y-3">
          <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Forma de Pagamento</label>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setPaymentType(type)}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 ${
                  paymentType === type 
                  ? 'bg-[#1ed760] border-[#1ed760] text-black shadow-lg shadow-[#1ed760]/20' 
                  : 'bg-[#1a241f] border-white/5 text-white/40 hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentType === type ? 'bg-black/10' : 'bg-white/5'}`}>
                   <i className={`fas ${
                     type === PaymentType.NUBANK ? 'fa-credit-card' : 
                     type === PaymentType.INTER ? 'fa-university' :
                     type === PaymentType.PIX ? 'fa-bolt' : 'fa-barcode'
                   }`}></i>
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm leading-none">{type}</div>
                  <div className={`text-[10px] ${paymentType === type ? 'text-black/60' : 'text-white/20'}`}>
                    {type === PaymentType.PIX ? 'Instantâneo' : 'Crédito'}
                  </div>
                </div>
                {paymentType === type && <i className="fas fa-check-circle ml-auto"></i>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 relative group">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Data da Compra</label>
            <div 
              className="bg-[#1a241f] border border-white/10 rounded-2xl p-4 flex items-center justify-between relative hover:bg-white/5 transition-colors active:scale-95"
            >
              <div className="flex-1 pointer-events-none">
                <div className="text-white font-bold text-lg">
                  {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                </div>
                <div className="text-white/20 text-[10px] uppercase">{new Date(date + 'T12:00:00').getFullYear()}</div>
              </div>
              <input 
                ref={dateInputRef}
                type="date" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => {
                  if ('showPicker' in e.currentTarget) {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {
                      // ignore
                    }
                  }
                }}
              />
              <i className="fas fa-calendar-alt text-white/20 pointer-events-none"></i>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Parcelas</label>
            <div className="bg-[#1a241f] border border-white/10 rounded-2xl p-2 flex items-center justify-between h-[84px]">
              <button type="button" onClick={() => setInstallments(Math.max(1, installments - 1))} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white active:scale-90 transition-transform">
                <i className="fas fa-minus"></i>
              </button>
              <div className="text-center">
                <div className="text-white font-black">{installments}x</div>
                <div className="text-white/20 text-[10px] uppercase font-bold tracking-tighter">
                  {installments === 1 ? 'À Vista' : 'Parcelado'}
                </div>
              </div>
              <button type="button" onClick={() => setInstallments(installments + 1)} className="bg-[#1ed760] w-10 h-10 rounded-xl flex items-center justify-center text-black active:scale-90 transition-transform">
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Split Section */}
        <div className="bg-[#1a241f]/50 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <i className="fas fa-arrows-split-up-and-left text-white/30 rotate-180"></i>
               <span className="text-white font-bold">Dividir Valor</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsDivided(!isDivided)}
              className={`w-12 h-6 rounded-full relative transition-all ${isDivided ? 'bg-[#1ed760]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDivided ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          {isDivided && (
            <>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-center">
                {peopleList.map(person => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => togglePerson(person)}
                    className="flex flex-col items-center gap-2 group min-w-[60px]"
                  >
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center relative transition-all ${
                      splitBetween.includes(person) ? 'border-[#1ed760] bg-[#1ed760]/10 shadow-[0_0_15px_rgba(30,215,96,0.3)]' : 'border-white/10 grayscale'
                    }`}>
                       <span className={`text-lg font-black ${splitBetween.includes(person) ? 'text-[#1ed760]' : 'text-white/20'}`}>
                         {person}
                       </span>
                       {splitBetween.includes(person) && (
                         <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black border border-[#1ed760] rounded-full flex items-center justify-center">
                            <i className="fas fa-check text-[#1ed760] text-[8px]"></i>
                         </div>
                       )}
                    </div>
                    <span className={`text-[10px] font-bold whitespace-nowrap ${splitBetween.includes(person) ? 'text-white' : 'text-white/20'}`}>
                      {personLabels[person] || person}
                    </span>
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddNewPerson}
                  className="flex flex-col items-center gap-2 group min-w-[60px] cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-white/10 border-dashed flex items-center justify-center text-white/20 hover:text-white hover:border-white/40 transition-all active:scale-95 bg-white/5">
                    <i className="fas fa-plus"></i>
                  </div>
                  <span className="text-[10px] font-bold text-white/20">Novo</span>
                </button>
              </div>

              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-white/20 text-[10px] font-bold uppercase">
                  Total por pessoa<br/>
                  <span className="text-white/40">({splitBetween.length} pessoas selecionadas)</span>
                </div>
                <div className="text-[#1ed760] text-xl font-black">
                  R$ {(( (!initialData && installments > 1) 
                        ? (parseFloat(amount.replace(',', '.') || '0') / installments) 
                        : parseFloat(amount.replace(',', '.') || '0') || 0
                       ) / (splitBetween.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </>
          )}
        </div>
      </form>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1ed760] text-black font-black py-5 rounded-[2rem] shadow-2xl shadow-[#1ed760]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <i className="fas fa-check"></i>
          {initialData ? 'Salvar Alterações' : 'Adicionar Despesa'}
        </button>
      </div>
    </div>
  );
};

export default ExpenseForm;
