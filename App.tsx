
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Expense, PaymentType, PersonName, SummaryData } from './types';
import { PEOPLE, MONTHS } from './constants';
import SummaryCards from './components/SummaryCards';
import ExpenseCard from './components/ExpenseCard';
import ExpenseForm from './components/ExpenseForm';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('expenses_smart_v5');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [showForm, setShowForm] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [filterPerson, setFilterPerson] = useState<PersonName | 'Todos'>('Todos');
  const [activeView, setActiveView] = useState<'dashboard' | 'expenses'>('dashboard');
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  // 1. Carregar dados do Supabase ao iniciar
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const fetchExpenses = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          const mapped: Expense[] = data.map(item => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
            paymentType: item.payment_type as PaymentType,
            installments: item.installments,
            currentInstallment: item.current_installment,
            month: item.month,
            year: item.year,
            day: item.day,
            date: item.date,
            splitBetween: item.split_between as PersonName[],
            isPaid: item.is_paid,
            createdAt: item.created_at
          }));
          setExpenses(mapped);
          localStorage.setItem('expenses_smart_v5', JSON.stringify(mapped));
        }
      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // 2. Salvar despesa no Supabase e Local
  const saveExpense = async (data: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'currentInstallment'> & { id?: string }) => {
    const isEdit = !!data.id;
    
    if (isSupabaseConfigured) {
      if (isEdit) {
        const updatedItem = {
          description: data.description,
          amount: data.amount,
          payment_type: data.paymentType,
          installments: data.installments,
          month: data.month,
          year: data.year,
          day: data.day,
          date: data.date,
          split_between: data.splitBetween,
        };

        const { error } = await supabase
          .from('expenses')
          .update(updatedItem)
          .eq('id', data.id);

        if (error) {
          alert("Erro ao salvar no Supabase. Os dados serão mantidos apenas localmente.");
        }
      } else {
        const baseDate = new Date(data.date + 'T12:00:00');
        const newItems = [];
        
        for (let i = 0; i < data.installments; i++) {
          const currentDate = new Date(baseDate);
          currentDate.setMonth(baseDate.getMonth() + i);
          
          const expense = {
            id: Math.random().toString(36).substr(2, 9),
            description: data.description,
            amount: data.amount,
            payment_type: data.paymentType,
            installments: data.installments,
            current_installment: i + 1,
            month: currentDate.getMonth(),
            year: currentDate.getFullYear(),
            day: currentDate.getDate(),
            date: currentDate.toISOString().split('T')[0],
            split_between: data.splitBetween,
            is_paid: false,
            created_at: Date.now() + i
          };
          newItems.push(expense);
        }

        const { error } = await supabase.from('expenses').insert(newItems);
        if (error) {
          alert("Erro ao sincronizar com o banco. Adicionando localmente.");
        }
      }
    }

    // Atualização local imediata para melhor UX
    if (isEdit) {
      setExpenses(prev => prev.map(exp => exp.id === data.id ? { ...exp, ...data } : exp));
    } else {
      // Re-gerar os itens locais se não houver Supabase ou se houve erro
      const baseDate = new Date(data.date + 'T12:00:00');
      const localNewItems: Expense[] = [];
      for (let i = 0; i < data.installments; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setMonth(baseDate.getMonth() + i);
        localNewItems.push({
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now() + i,
          isPaid: false,
          currentInstallment: i + 1,
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
          day: currentDate.getDate(),
          date: currentDate.toISOString().split('T')[0]
        });
      }
      setExpenses(prev => [...localNewItems, ...prev]);
    }

    setEditingExpense(undefined);
    setShowForm(false);
  };

  const deleteExpense = async (id: string) => {
    if (confirm('Deseja excluir permanentemente?')) {
      if (isSupabaseConfigured) {
        await supabase.from('expenses').delete().eq('id', id);
      }
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      setEditingExpense(undefined);
      setShowForm(false);
    }
  };

  const togglePaid = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    const newState = !expense.isPaid;
    if (isSupabaseConfigured) {
      await supabase
        .from('expenses')
        .update({ is_paid: newState })
        .eq('id', id);
    }
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, isPaid: newState } : exp));
  };

  const downloadBackup = () => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `backup_financas_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    fileReader.onload = async (e) => {
      try {
        const decoded = JSON.parse(e.target?.result as string);
        if (Array.isArray(decoded) && confirm('Importar dados do arquivo?')) {
           setExpenses(decoded);
           localStorage.setItem('expenses_smart_v5', JSON.stringify(decoded));
           alert('Dados carregados com sucesso!');
        }
      } catch { alert('Erro no arquivo.'); }
    };
    fileReader.readAsText(files[0]);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchPerson = filterPerson === 'Todos' || exp.splitBetween.includes(filterPerson as PersonName);
      return matchPerson && exp.month === filterMonth && exp.year === filterYear;
    }).sort((a, b) => b.day - a.day);
  }, [expenses, filterPerson, filterMonth, filterYear]);

  const summaryData = useMemo((): SummaryData => {
    const summary: SummaryData = {
      totalPending: 0,
      totalPaid: 0,
      byPaymentType: { [PaymentType.NUBANK]: 0, [PaymentType.INTER]: 0, [PaymentType.BOLETO]: 0, [PaymentType.PIX]: 0 } as any,
      byPerson: {} as any
    };
    filteredExpenses.forEach(exp => {
      const amount = filterPerson === 'Todos' ? exp.amount : exp.amount / exp.splitBetween.length;
      if (exp.isPaid) summary.totalPaid += amount;
      else summary.totalPending += amount;
      summary.byPaymentType[exp.paymentType] += amount;
    });
    return summary;
  }, [filteredExpenses, filterPerson]);

  const yearOptions = [2024, 2025, 2026, 2027];

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col pt-6 pb-32">
      {isLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-[#1ed760] animate-pulse z-[300]"></div>}

      <header className="px-6 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSync(true)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#1ed760] active:scale-90 transition-transform"
          >
            <i className={`fas ${isSupabaseConfigured ? 'fa-database' : 'fa-exclamation-triangle text-amber-500'} text-sm`}></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              {activeView === 'dashboard' ? 'Início' : 'Faturas'}
            </h1>
            <p className={`${isSupabaseConfigured ? 'text-[#1ed760]' : 'text-amber-500'} text-[10px] font-bold uppercase tracking-widest mt-1`}>
              {isLoading ? 'Sincronizando...' : isSupabaseConfigured ? 'Nuvem Conectada' : 'Modo Offline (Sem Banco)'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="bg-[#1a241f] text-white/60 text-[10px] font-bold px-2 py-2 rounded-xl border border-white/10 outline-none">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m.substring(0, 3)}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="bg-[#1a241f] text-white/60 text-[10px] font-bold px-2 py-2 rounded-xl border border-white/10 outline-none">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <main className="px-6 space-y-8 animate-in fade-in duration-300">
          <div className="bg-[#1a241f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
             <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="text-white/40 text-xs font-bold uppercase">A pagar ({MONTHS[filterMonth]})</span>
                  <div className="text-white text-3xl font-black">R$ {summaryData.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/10 flex items-center justify-center">
                  <i className="fas fa-cloud text-[#1ed760]"></i>
                </div>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#1ed760] transition-all duration-1000" style={{ width: `${(summaryData.totalPaid / (summaryData.totalPaid + summaryData.totalPending || 1)) * 100}%` }}></div>
             </div>
          </div>

          <section className="grid grid-cols-2 gap-4">
             {Object.entries(summaryData.byPaymentType).map(([type, value]) => (
               <div key={type} className="bg-[#1a241f] p-5 rounded-3xl border border-white/5">
                 <div className="text-white/30 text-[10px] font-bold uppercase mb-1">{type}</div>
                 <div className="text-white font-black text-lg">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
               </div>
             ))}
          </section>
        </main>
      ) : (
        <main className="flex-1 animate-in fade-in duration-300">
          <section className="px-6 mb-6">
            <SummaryCards summary={summaryData} />
          </section>

          <section className="px-6 mb-6 overflow-x-auto no-scrollbar flex gap-2">
             <button onClick={() => setFilterPerson('Todos')} className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all ${filterPerson === 'Todos' ? 'bg-[#1ed760] text-black' : 'bg-[#1a241f] text-white/30'}`}>Todos</button>
             {PEOPLE.map(p => (
               <button key={p} onClick={() => setFilterPerson(p)} className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all ${filterPerson === p ? 'bg-[#1ed760] text-black' : 'bg-[#1a241f] text-white/30'}`}>{p}</button>
             ))}
          </section>

          <section className="px-6 pb-32 space-y-4">
             {filteredExpenses.map(exp => (
               <ExpenseCard key={exp.id} expense={exp} onTogglePaid={togglePaid} onEdit={setEditingExpense} filterPerson={filterPerson} />
             ))}
             {filteredExpenses.length === 0 && (
               <div className="text-center py-20 opacity-20">
                 <i className="fas fa-receipt text-5xl mb-4"></i>
                 <p className="font-bold">Nenhum lançamento</p>
               </div>
             )}
          </section>
        </main>
      )}

      {showSync && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex flex-col p-6">
           <div className="flex justify-end mb-8"><button onClick={() => setShowSync(false)} className="text-white/40"><i className="fas fa-times text-2xl"></i></button></div>
           <div className="text-center mb-10">
             <div className="w-20 h-20 rounded-[2.5rem] bg-[#1ed760]/10 flex items-center justify-center mx-auto mb-4">
               <i className={`fas ${isSupabaseConfigured ? 'fa-database' : 'fa-exclamation-circle text-amber-500'} text-[#1ed760] text-3xl`}></i>
             </div>
             <h2 className="text-white text-2xl font-black">Nuvem e Backup</h2>
             <p className="text-white/40 text-sm mt-2">
               {isSupabaseConfigured 
                 ? "Seus dados estão sendo sincronizados com o Supabase." 
                 : "O banco de dados não está configurado. Os dados são salvos apenas neste navegador."}
             </p>
           </div>

           <div className="space-y-4">
             {!isSupabaseConfigured && (
               <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4">
                 <p className="text-amber-500 text-xs font-bold uppercase mb-1">Aviso de Configuração</p>
                 <p className="text-white/60 text-[10px]">Para salvar na nuvem, adicione as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.</p>
               </div>
             )}

             <div className="bg-[#1a241f] p-6 rounded-3xl border border-white/5">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2"><i className="fas fa-file-export text-[#1ed760]"></i> Backup Offline</h3>
               <div className="grid grid-cols-2 gap-3">
                 <button onClick={downloadBackup} className="bg-white/5 py-4 rounded-2xl text-white font-bold text-[10px] uppercase">Baixar JSON</button>
                 <button onClick={() => fileInputRef.current?.click()} className="bg-white/5 py-4 rounded-2xl text-white font-bold text-[10px] uppercase">Abrir JSON</button>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
               </div>
             </div>
           </div>
        </div>
      )}

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl border border-white/5 px-8 py-4 rounded-full flex gap-12 z-50 shadow-2xl">
         <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'text-[#1ed760]' : 'text-white/20'}><i className="fas fa-home text-xl"></i></button>
         <button onClick={() => setActiveView('expenses')} className={activeView === 'expenses' ? 'text-[#1ed760]' : 'text-white/20'}><i className="fas fa-list-ul text-xl"></i></button>
         <button onClick={() => { setEditingExpense(undefined); setShowForm(true); }} className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center text-black absolute -top-7 left-1/2 -translate-x-1/2 border-[6px] border-[#0d1511] active:scale-90 transition-transform shadow-xl"><i className="fas fa-plus"></i></button>
      </nav>

      {(showForm || editingExpense) && (
        <ExpenseForm 
          onSave={saveExpense} 
          onClose={() => { setShowForm(false); setEditingExpense(undefined); }} 
          initialData={editingExpense} 
          onDelete={deleteExpense} 
        />
      )}
    </div>
  );
};

export default App;
