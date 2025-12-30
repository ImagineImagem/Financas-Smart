
import React, { useState, useEffect, useMemo } from 'react';
import { Expense, PaymentType, PersonName, SummaryData } from './types';
import { PEOPLE, MONTHS } from './constants';
import SummaryCards from './components/SummaryCards';
import ExpenseCard from './components/ExpenseCard';
import ExpenseForm from './components/ExpenseForm';

const App: React.FC = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('expenses_smart_v5');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load expenses:", error);
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [filterPerson, setFilterPerson] = useState<PersonName | 'Todos'>('Todos');
  const [activeView, setActiveView] = useState<'dashboard' | 'expenses'>('dashboard');
  
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  useEffect(() => {
    try {
      localStorage.setItem('expenses_smart_v5', JSON.stringify(expenses));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, [expenses]);

  const saveExpense = (data: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'currentInstallment'> & { id?: string }) => {
    if (data.id) {
      setExpenses(prev => prev.map(exp => 
        exp.id === data.id ? { ...exp, ...data } : exp
      ));
    } else {
      const newExpenses: Expense[] = [];
      const baseDate = new Date(data.date + 'T12:00:00');
      
      for (let i = 0; i < data.installments; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setMonth(baseDate.getMonth() + i);
        
        const expense: Expense = {
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now() + i,
          isPaid: false,
          currentInstallment: i + 1,
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
          day: currentDate.getDate(),
          date: currentDate.toISOString().split('T')[0]
        };
        newExpenses.push(expense);
      }
      setExpenses(prev => [...newExpenses, ...prev]);
    }
    setEditingExpense(undefined);
    setShowForm(false);
  };

  const deleteExpense = (id: string) => {
    if (confirm('Deseja excluir esta despesa permanentemente?')) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      setEditingExpense(undefined);
      setShowForm(false);
    }
  };

  const togglePaid = (id: string) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, isPaid: !exp.isPaid } : exp
    ));
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const exportData = () => {
    try {
      const jsonString = JSON.stringify(expenses);
      const code = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      setGeneratedCode(code);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        });
      }
    } catch (e) {
      alert("Erro ao gerar código.");
    }
  };

  const importData = () => {
    if (!syncCode) return;
    try {
      const decodedString = decodeURIComponent(Array.prototype.map.call(atob(syncCode.trim()), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(decodedString);
      if (Array.isArray(decoded)) {
        if (confirm(`Restaurar ${decoded.length} despesas?`)) {
          setExpenses(decoded);
          setShowSync(false);
          setSyncCode('');
          alert('Sincronizado!');
        }
      }
    } catch (e) {
      alert('Código inválido.');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchPerson = filterPerson === 'Todos' || exp.splitBetween.includes(filterPerson as PersonName);
      const matchMonth = exp.month === filterMonth;
      const matchYear = exp.year === filterYear;
      return matchPerson && matchMonth && matchYear;
    }).sort((a, b) => b.day - a.day);
  }, [expenses, filterPerson, filterMonth, filterYear]);

  const summaryData = useMemo((): SummaryData => {
    const summary: SummaryData = {
      totalPending: 0,
      totalPaid: 0,
      byPaymentType: {
        [PaymentType.NUBANK]: 0,
        [PaymentType.INTER]: 0,
        [PaymentType.BOLETO]: 0,
        [PaymentType.PIX]: 0,
      } as Record<PaymentType, number>,
      byPerson: {} as any
    };

    filteredExpenses.forEach(exp => {
      const amountToCount = filterPerson === 'Todos' 
        ? exp.amount 
        : exp.amount / exp.splitBetween.length;

      if (exp.isPaid) {
        summary.totalPaid += amountToCount;
      } else {
        summary.totalPending += amountToCount;
      }
      summary.byPaymentType[exp.paymentType] = (summary.byPaymentType[exp.paymentType] || 0) + amountToCount;
    });

    return summary;
  }, [filteredExpenses, filterPerson]);

  const nextMonthDebt = useMemo(() => {
    let nextM = filterMonth + 1;
    let nextY = filterYear;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    return expenses
      .filter(exp => exp.month === nextM && exp.year === nextY && !exp.isPaid)
      .reduce((sum, exp) => {
        const amount = filterPerson === 'Todos' ? exp.amount : exp.amount / exp.splitBetween.length;
        return sum + amount;
      }, 0);
  }, [expenses, filterMonth, filterYear, filterPerson]);

  const yearOptions = useMemo(() => {
    const startY = Math.min(2025, currentYear);
    const endY = Math.max(2027, currentYear);
    const years = [];
    for (let y = startY; y <= endY; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col pt-6 pb-32">
      <header className="px-6 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setShowSync(true); setGeneratedCode(''); setSyncCode(''); }}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#1ed760] active:scale-90 transition-transform"
          >
            <i className="fas fa-sync-alt text-sm"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              {activeView === 'dashboard' ? 'Dashboard' : 'Despesas'}
            </h1>
            <p className="text-[#1ed760] text-[10px] font-bold uppercase tracking-widest mt-1">
              {now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="bg-[#1a241f] text-white/60 text-[10px] font-bold px-2 py-2 rounded-xl uppercase tracking-wider outline-none border border-white/10"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i} className="bg-[#0d1511]">{m.substring(0, 3)}</option>
            ))}
          </select>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="bg-[#1a241f] text-white/60 text-[10px] font-bold px-2 py-2 rounded-xl uppercase tracking-wider outline-none border border-white/10"
          >
            {yearOptions.map(y => (
              <option key={y} value={y} className="bg-[#0d1511]">{y}</option>
            ))}
          </select>
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <main className="px-6 space-y-8 animate-in fade-in duration-300">
          <div className="bg-[#1a241f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-[#1ed760] text-sm font-bold">A pagar em {MONTHS[filterMonth]}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-3xl font-black">R$ {summaryData.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/10 flex items-center justify-center">
                <i className="fas fa-wallet text-[#1ed760]"></i>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <div className="text-white/30 text-[10px] uppercase font-bold tracking-wider">Gasto Mensal</div>
                <div className="text-white font-bold">R$ {(summaryData.totalPending + summaryData.totalPaid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-white/30 text-[10px] uppercase font-bold tracking-wider">Previsão Próx. Mês</div>
                <div className="text-[#1ed760] font-bold">R$ {nextMonthDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-white/30 uppercase">Uso do orçamento</span>
                <span className="text-white/60">Controle Ativo</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#1ed760] rounded-full transition-all duration-700" 
                  style={{ width: `${Math.min(100, (summaryData.totalPaid / ((summaryData.totalPending + summaryData.totalPaid) || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Resumo por tipo</h3>
              <button onClick={() => setActiveView('expenses')} className="text-[#1ed760] text-sm font-medium">Ver todos</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[PaymentType.NUBANK, PaymentType.INTER, PaymentType.BOLETO, PaymentType.PIX].map(type => (
                <div key={type} className="bg-[#1a241f] p-5 rounded-3xl border border-white/5 transition-transform active:scale-95">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      type === PaymentType.NUBANK ? 'bg-purple-500/10 text-purple-500' :
                      type === PaymentType.INTER ? 'bg-orange-500/10 text-orange-500' :
                      type === PaymentType.BOLETO ? 'bg-blue-500/10 text-blue-500' : 'bg-teal-500/10 text-teal-500'
                    }`}>
                      <i className={`fas ${
                        type === PaymentType.NUBANK ? 'fa-credit-card' : 
                        type === PaymentType.INTER ? 'fa-university' :
                        type === PaymentType.BOLETO ? 'fa-barcode' : 'fa-bolt'
                      }`}></i>
                    </div>
                  </div>
                  <div className="text-white/30 text-xs mb-1">{type}</div>
                  <div className="text-white font-black text-lg">
                    R$ {(summaryData.byPaymentType[type] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="flex-1 animate-in fade-in duration-300">
          <section className="px-6 mb-8">
            <SummaryCards summary={summaryData} />
          </section>

          <section className="px-6 mb-8 overflow-x-auto no-scrollbar">
            <div className="flex gap-3">
              <button 
                onClick={() => setFilterPerson('Todos')}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                  filterPerson === 'Todos' ? 'bg-[#1ed760] text-black shadow-lg shadow-[#1ed760]/20' : 'bg-[#1a241f] text-white/40'
                }`}
              >
                Todos
              </button>
              {PEOPLE.map(person => (
                <button 
                  key={person}
                  onClick={() => setFilterPerson(person)}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                    filterPerson === person ? 'bg-[#1ed760] text-black shadow-lg shadow-[#1ed760]/20' : 'bg-[#1a241f] text-white/40'
                  }`}
                >
                  {person}
                </button>
              ))}
            </div>
          </section>

          <section className="px-6 pb-24">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-black text-xl">
                {filterPerson === 'Todos' ? `Em ${MONTHS[filterMonth]}` : `Gastos de ${filterPerson}`}
              </h3>
              <span className="bg-[#1a241f] text-white/20 text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                {filteredExpenses.length} itens
              </span>
            </div>

            <div className="space-y-4">
              {filteredExpenses.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-10">
                  <i className="fas fa-receipt text-6xl mb-4"></i>
                  <p className="font-bold">Sem registros em {MONTHS[filterMonth]}</p>
                </div>
              ) : (
                filteredExpenses.map(exp => (
                  <ExpenseCard 
                    key={exp.id} 
                    expense={exp} 
                    onTogglePaid={togglePaid} 
                    onEdit={handleEdit}
                    filterPerson={filterPerson}
                  />
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {/* Sync Modal */}
      {showSync && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex flex-col p-6 overflow-y-auto">
           <div className="flex justify-end mb-4">
             <button onClick={() => setShowSync(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
               <i className="fas fa-times text-xl"></i>
             </button>
           </div>
           <div className="flex flex-col items-center text-center mb-8">
             <div className="w-16 h-16 rounded-2xl bg-[#1ed760]/10 flex items-center justify-center mb-4">
               <i className="fas fa-sync text-[#1ed760] text-2xl"></i>
             </div>
             <h2 className="text-white text-xl font-black">Sincronizar</h2>
           </div>
           <div className="space-y-6">
             <div className="bg-[#1a241f] p-5 rounded-[1.5rem] border border-white/5">
                <button onClick={exportData} className="w-full bg-[#1ed760] text-black font-black py-4 rounded-xl flex items-center justify-center gap-2">
                  <i className="fas fa-file-export"></i> Gerar Backup
                </button>
                {generatedCode && (
                  <div className="mt-4">
                    <textarea readOnly value={generatedCode} className="w-full bg-black/40 border border-[#1ed760]/30 rounded-lg p-3 text-white text-[10px] font-mono h-20 outline-none" />
                  </div>
                )}
             </div>
             <div className="bg-[#1a241f] p-5 rounded-[1.5rem] border border-white/5">
                <textarea value={syncCode} onChange={(e) => setSyncCode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-[10px] font-mono h-24 outline-none" placeholder="Cole o código aqui..." />
                <button onClick={importData} disabled={!syncCode} className={`w-full py-4 mt-3 rounded-xl font-black ${syncCode ? 'bg-white text-black' : 'bg-white/5 text-white/10'}`}>
                  Restaurar
                </button>
             </div>
           </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-8 py-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/5 px-8 py-4 rounded-full flex gap-12 pointer-events-auto shadow-2xl">
          <button onClick={() => setActiveView('dashboard')} className={`${activeView === 'dashboard' ? 'text-[#1ed760]' : 'text-white/20'}`}>
            <i className="fas fa-th-large text-xl"></i>
          </button>
          <button onClick={() => setActiveView('expenses')} className={`${activeView === 'expenses' ? 'text-[#1ed760]' : 'text-white/20'}`}>
            <i className="fas fa-receipt text-xl"></i>
          </button>
        </div>
        <button 
          onClick={() => { setEditingExpense(undefined); setShowForm(true); }}
          className="w-16 h-16 bg-[#1ed760] rounded-full flex items-center justify-center text-black text-2xl border-[6px] border-[#0d1511] pointer-events-auto fixed bottom-6 right-6 shadow-xl"
        >
          <i className="fas fa-plus"></i>
        </button>
      </nav>

      {showForm && (
        <ExpenseForm onSave={saveExpense} onClose={() => { setShowForm(false); setEditingExpense(undefined); }} initialData={editingExpense} onDelete={deleteExpense} />
      )}
    </div>
  );
};

export default App;
