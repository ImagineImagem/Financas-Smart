
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Expense, PaymentType, PersonName, SummaryData } from './types';
import { PEOPLE, MONTHS, PERSON_FULL_NAMES } from './constants';
import SummaryCards from './components/SummaryCards';
import ExpenseCard from './components/ExpenseCard';
import ExpenseForm from './components/ExpenseForm';
import { DashboardWidgets } from './components/DashboardWidgets';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for people management with safe parsing
  const [peopleList, setPeopleList] = useState<PersonName[]>(() => {
    try {
      const savedPeople = localStorage.getItem('people_list_v5');
      return savedPeople ? JSON.parse(savedPeople) : PEOPLE;
    } catch { return PEOPLE; }
  });
  const [personLabels, setPersonLabels] = useState<Record<string, string>>(() => {
    try {
      const savedLabels = localStorage.getItem('people_labels_v5');
      return savedLabels ? JSON.parse(savedLabels) : PERSON_FULL_NAMES;
    } catch { return PERSON_FULL_NAMES; }
  });

  // Estado das despesas (carrega do LocalStorage primeiro para rapidez)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('expenses_smart_v5');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [showForm, setShowForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  
  // Filtros
  const [filterPerson, setFilterPerson] = useState<PersonName | 'Todos'>('Todos');
  const [activeView, setActiveView] = useState<'dashboard' | 'expenses'>('dashboard');
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  // 1. Carregar dados do Banco de Dados (Supabase) ao iniciar
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
        console.error("Erro ao buscar dados:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const handleAddPerson = (sigla: string, name: string) => {
    if (!sigla || !name) return;
    
    // Prevent duplicates
    if (peopleList.includes(sigla)) {
      alert("Essa sigla já existe!");
      return;
    }

    const newPeopleList = [...peopleList, sigla];
    const newLabels = { ...personLabels, [sigla]: name };
    
    setPeopleList(newPeopleList);
    setPersonLabels(newLabels);
    
    localStorage.setItem('people_list_v5', JSON.stringify(newPeopleList));
    localStorage.setItem('people_labels_v5', JSON.stringify(newLabels));
  };

  // 2. Salvar Despesa (No Banco e no Local)
  const saveExpense = async (data: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'currentInstallment'> & { id?: string }) => {
    const isEdit = !!data.id;
    
    // Preparação dos itens (trata parcelamento)
    const baseDate = new Date(data.date + 'T12:00:00');
    const day = parseInt(data.date.split('-')[2]);
    
    // Lógica de fechamento do cartão: Dia 17
    // Se for Cartão (Nubank/Inter) e dia >= 17, joga para o próximo mês
    let startMonthOffset = 0;
    if ((data.paymentType === PaymentType.NUBANK || data.paymentType === PaymentType.INTER) && day >= 17) {
      startMonthOffset = 1;
    }

    const newItemsToInsert: any[] = [];
    const localItems: Expense[] = [];

    // Lógica de Divisão de Parcelas
    // Se for NOVO, o valor é o TOTAL, então dividimos pelo número de parcelas.
    // Se for EDITAR, assumimos que o usuário já está vendo o valor da parcela (ou editando apenas aquela).
    let amountToSave = data.amount;
    if (!isEdit && data.installments > 1) {
      amountToSave = data.amount / data.installments;
    }

    if (!isEdit) {
      for (let i = 0; i < data.installments; i++) {
        // Safe Date Calculation to avoid overflow (e.g. Jan 31 -> Feb 28/29)
        const targetMonthIndex = baseDate.getMonth() + startMonthOffset + i;
        const d = new Date(baseDate.getFullYear(), targetMonthIndex, 1); // First day of target month
        
        // Try to set the day, but clamp to max days in that month
        const maxDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(day, maxDays));
        
        const newId = Math.random().toString(36).substr(2, 9);
        
        const item = {
          id: newId,
          description: data.description,
          amount: amountToSave,
          payment_type: data.paymentType,
          installments: data.installments,
          current_installment: i + 1,
          month: d.getMonth(),
          year: d.getFullYear(),
          day: d.getDate(),
          date: d.toISOString().split('T')[0],
          split_between: data.splitBetween,
          is_paid: false,
          created_at: Date.now() + i
        };
        newItemsToInsert.push(item);
        
        localItems.push({
          id: item.id,
          description: item.description,
          amount: item.amount,
          paymentType: item.payment_type,
          installments: item.installments,
          currentInstallment: item.current_installment,
          month: item.month,
          year: item.year,
          day: item.day,
          date: item.date,
          splitBetween: item.split_between,
          isPaid: item.is_paid,
          createdAt: item.created_at
        });
      }
    }

    // Tenta salvar no Supabase
    if (isSupabaseConfigured) {
      if (isEdit) {
        await supabase.from('expenses').update({
          description: data.description,
          amount: data.amount,
          payment_type: data.paymentType,
          split_between: data.splitBetween,
          date: data.date,
          day: data.day,
          month: data.month,
          year: data.year
        }).eq('id', data.id);
      } else {
        await supabase.from('expenses').insert(newItemsToInsert);
      }
    }

    // Atualiza localmente para resposta imediata
    if (isEdit) {
      setExpenses(prev => prev.map(exp => exp.id === data.id ? { ...exp, ...data } : exp));
    } else {
      setExpenses(prev => [...localItems, ...prev]);
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
      await supabase.from('expenses').update({ is_paid: newState }).eq('id', id);
    }
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, isPaid: newState } : exp));
  };

  // Helper para normalizar descrição
  const normalizeDesc = (desc: string) => desc.replace(/\s*\(\+.*\)$/, '').trim();

  // Encontra as parcelas futuras para exibir no Dropdown
  const getFutureInstallments = (expense: Expense) => {
    const baseDesc = normalizeDesc(expense.description);
    return expenses.filter(e => {
        if (e.id === expense.id) return false;
        return (
            normalizeDesc(e.description) === baseDesc && 
            e.paymentType === expense.paymentType && 
            e.installments === expense.installments && 
            e.currentInstallment > expense.currentInstallment 
        );
    }).sort((a, b) => a.currentInstallment - b.currentInstallment);
  };

  // Funcao Auxiliar para calcular nova data (Mês - 1 ou Mês + offset)
  const shiftDate = (month: number, year: number, offset: number) => {
    const date = new Date(year, month, 1);
    date.setMonth(date.getMonth() + offset);
    return { 
      newMonth: date.getMonth(), 
      newYear: date.getFullYear() 
    };
  };

  // Paga uma parcela futura específica (Merge na atual) E reorganiza as posteriores
  const payFutureInstallment = async (currentId: string, futureId: string) => {
    const currentExpense = expenses.find(e => e.id === currentId);
    const futureExpense = expenses.find(e => e.id === futureId);

    if (!currentExpense || !futureExpense) return;

    // 1. Pega todas as futuras para poder reorganizar
    const allFutures = getFutureInstallments(currentExpense);
    
    // 2. Identifica as que são posteriores à que está sendo paga (para descer o mês)
    const subsequentInstallments = allFutures.filter(e => e.currentInstallment > futureExpense.currentInstallment);

    // 3. Calcula novos valores para a atual
    const newAmount = currentExpense.amount + futureExpense.amount;
    
    // LÓGICA DO MARCADOR: Incrementa o indice atual. 
    // Ex: Se era 1/10 e paguei +1, vira 2/10.
    const newCurrentInstallment = currentExpense.currentInstallment + 1;
    
    const existingTagMatch = currentExpense.description.match(/\(\+(\d+)/);
    const previouslyAdvanced = existingTagMatch ? parseInt(existingTagMatch[1]) : 0;
    const totalAdvanced = previouslyAdvanced + 1;

    const suffix = totalAdvanced > 1 ? 'parcelas adiantadas' : 'parcela adiantada';
    const baseDesc = normalizeDesc(currentExpense.description);
    const newDescription = `${baseDesc} (+${totalAdvanced} ${suffix})`;
    
    // 4. Executa atualizações no Banco e Local
    
    if (isSupabaseConfigured) {
      // A & B: Deleta futura e Atualiza Atual
      await supabase.from('expenses').delete().eq('id', futureId);
      await supabase.from('expenses').update({
        amount: newAmount,
        description: newDescription,
        current_installment: newCurrentInstallment // Atualiza o contador visual
      }).eq('id', currentId);

      // C - Shift subsequents
      for (const sub of subsequentInstallments) {
         const { newMonth, newYear } = shiftDate(sub.month, sub.year, -1);
         const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
         const safeDay = Math.min(sub.day, maxDay);
         const newDateIso = new Date(newYear, newMonth, safeDay).toISOString().split('T')[0];

         await supabase.from('expenses').update({
           month: newMonth,
           year: newYear,
           day: safeDay,
           date: newDateIso
         }).eq('id', sub.id);
      }
    }

    setExpenses(prev => {
        // Remove a deletada
        let updatedList = prev.filter(e => e.id !== futureId);
        
        // Atualiza a atual
        updatedList = updatedList.map(e => e.id === currentId ? {
            ...e,
            amount: newAmount,
            description: newDescription,
            currentInstallment: newCurrentInstallment
        } : e);

        // Atualiza as posteriores (localmente)
        const subsequentIds = subsequentInstallments.map(s => s.id);
        updatedList = updatedList.map(e => {
            if (subsequentIds.includes(e.id)) {
                const { newMonth, newYear } = shiftDate(e.month, e.year, -1);
                const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
                const safeDay = Math.min(e.day, maxDay);
                const newDateIso = new Date(newYear, newMonth, safeDay).toISOString().split('T')[0];
                return {
                    ...e,
                    month: newMonth,
                    year: newYear,
                    day: safeDay,
                    date: newDateIso
                };
            }
            return e;
        });

        return updatedList;
    });
  };

  // Reverter adiantamentos (Desfazer)
  const revertAdvances = async (currentId: string) => {
    const expense = expenses.find(e => e.id === currentId);
    if (!expense) return;

    // Extrair quantas foram adiantadas
    const match = expense.description.match(/\(\+(\d+)/);
    if (!match) return;
    const count = parseInt(match[1]);
    if (count <= 0) return;

    if (!confirm(`Deseja reverter o adiantamento de ${count} parcela(s)? Isso irá recriá-las nos meses futuros.`)) return;

    // 1. Restaurar valor base
    // Assume-se parcelas iguais. Valor Base = Valor Atual / (Count + 1)
    const baseAmount = expense.amount / (count + 1);
    const baseDesc = normalizeDesc(expense.description);

    // 2. Calcular índice original
    const originalInstallmentIndex = expense.currentInstallment - count;

    // 3. Identificar parcelas futuras EXISTENTES que precisam ser empurradas
    // (Qualquer parcela desta série que tenha index > atual)
    const existingFutures = getFutureInstallments(expense);

    // 4. Recriar as parcelas que faltam (os "buracos")
    const restoredInstallments: any[] = [];
    const localRestored: Expense[] = [];
    
    // Criar as novas (Restauradas) começando do mês seguinte ao atual
    for (let i = 1; i <= count; i++) {
        const { newMonth, newYear } = shiftDate(expense.month, expense.year, i);
        
        const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
        const safeDay = Math.min(expense.day, maxDay);
        
        const newId = Math.random().toString(36).substr(2, 9);
        const thisInstallmentNum = originalInstallmentIndex + i; // ex: orig 1, i=1 -> 2/10

        const item = {
            id: newId,
            description: baseDesc,
            amount: baseAmount,
            payment_type: expense.paymentType,
            installments: expense.installments,
            current_installment: thisInstallmentNum, 
            month: newMonth,
            year: newYear,
            day: safeDay,
            date: new Date(newYear, newMonth, safeDay).toISOString().split('T')[0],
            split_between: expense.splitBetween,
            is_paid: false,
            created_at: Date.now() + i
        };
        
        restoredInstallments.push(item);
        
        localRestored.push({
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
        });
    }

    // 5. Atualizar datas das existentes (Empurrar para frente)
    // Elas devem ser deslocadas em +count meses
    
    if (isSupabaseConfigured) {
        // Atualiza a atual (restaura valor, indice e remove tag)
        await supabase.from('expenses').update({
            amount: baseAmount,
            description: baseDesc,
            current_installment: originalInstallmentIndex
        }).eq('id', currentId);

        // Insere as restauradas
        if (restoredInstallments.length > 0) {
            await supabase.from('expenses').insert(restoredInstallments);
        }

        // Empurra as existentes
        for (const future of existingFutures) {
             const { newMonth, newYear } = shiftDate(future.month, future.year, count);
             const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
             const safeDay = Math.min(future.day, maxDay);
             const newDateIso = new Date(newYear, newMonth, safeDay).toISOString().split('T')[0];

             await supabase.from('expenses').update({
                 month: newMonth,
                 year: newYear,
                 day: safeDay,
                 date: newDateIso
             }).eq('id', future.id);
        }
    }

    setExpenses(prev => {
        // Atualiza a despesa atual
        let list = prev.map(e => e.id === currentId ? {
            ...e,
            amount: baseAmount,
            description: baseDesc,
            currentInstallment: originalInstallmentIndex
        } : e);

        // Adiciona as novas restauradas
        list = [...list, ...localRestored];

        // Atualiza as existentes (shift forward)
        const existingIds = existingFutures.map(f => f.id);
        list = list.map(e => {
            if (existingIds.includes(e.id)) {
                 const { newMonth, newYear } = shiftDate(e.month, e.year, count);
                 const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
                 const safeDay = Math.min(e.day, maxDay);
                 const newDateIso = new Date(newYear, newMonth, safeDay).toISOString().split('T')[0];
                 return {
                     ...e,
                     month: newMonth,
                     year: newYear,
                     day: safeDay,
                     date: newDateIso
                 };
            }
            return e;
        });

        return list;
    });
  };

  const downloadBackup = () => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const link = document.createElement('a');
    link.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    link.download = `backup_financeiro.json`;
    link.click();
  };

  // Filtered expenses for the List View
  const filteredExpenses = useMemo(() => {
    // 1. Identify "Current Month" expenses
    const currentViewExpenses = expenses.filter(exp => 
      exp.month === filterMonth && exp.year === filterYear
    );

    // 2. Identify "Overdue" expenses (Past months AND Not Paid)
    const overdueExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.year, exp.month, 1);
      const viewDate = new Date(filterYear, filterMonth, 1);
      
      // Is from a previous month?
      const isPast = expDate < viewDate;
      
      return isPast && !exp.isPaid;
    });

    // 3. Combine them
    const allRelevantExpenses = [...overdueExpenses, ...currentViewExpenses];

    // 4. Apply Person Filter & Sort
    return allRelevantExpenses.filter(exp => {
      return filterPerson === 'Todos' || exp.splitBetween.includes(filterPerson as PersonName);
    }).sort((a, b) => {
      // Sort: Overdue items first (based on older dates), then current items by day
      const dateA = new Date(a.year, a.month, a.day);
      const dateB = new Date(b.year, b.month, b.day);
      return dateA.getTime() - dateB.getTime(); 
    });
  }, [expenses, filterPerson, filterMonth, filterYear]);

  // Calculations for Dashboard and Summaries
  const { 
    summaryData, 
    dashboardStats 
  } = useMemo(() => {
    // Current Month Stats for Dashboard
    const currentMonthExpenses = expenses.filter(e => e.month === filterMonth && e.year === filterYear);
    
    // For Dashboard totals, we usually only care about the specific month's expected cashflow,
    // BUT if we want to show "What do I need to pay NOW?", we might want to include overdue.
    // However, DashboardWidgets usually shows "Total do Mês". 
    // Let's stick to standard logic for DashboardWidgets to represent the *Month's* budget,
    // but the SummaryCards (in Expenses view) will reflect the Filtered List (including overdue).

    const expensesForSummary = activeView === 'expenses' ? filteredExpenses : currentMonthExpenses;

    // Summary Data (Matches the structure needed for SummaryCards)
    const summary: SummaryData = {
      totalPending: 0,
      totalPaid: 0,
      byPaymentType: { [PaymentType.NUBANK]: 0, [PaymentType.INTER]: 0, [PaymentType.BOLETO]: 0, [PaymentType.PIX]: 0 } as any,
      byPerson: {} as any
    };

    expensesForSummary.forEach(exp => {
      const amount = (activeView === 'expenses' && filterPerson !== 'Todos') 
        ? exp.amount / exp.splitBetween.length 
        : exp.amount;

      if (exp.isPaid) summary.totalPaid += amount;
      else summary.totalPending += amount;
    });

    // Dashboard specific global stats (Strictly for the selected Month's budget)
    const totalMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaidGlobal = currentMonthExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    const totalPendingGlobal = totalMonth - totalPaidGlobal;
    const progress = totalMonth === 0 ? 0 : (totalPaidGlobal / totalMonth) * 100;
    
    const nextDate = new Date(filterYear, filterMonth + 1, 1);
    const nextM = nextDate.getMonth();
    const nextY = nextDate.getFullYear();
    const nextMonthTotal = expenses
      .filter(e => e.month === nextM && e.year === nextY)
      .reduce((sum, e) => sum + e.amount, 0);

    const walletSummary = {
      [PaymentType.NUBANK]: 0,
      [PaymentType.INTER]: 0,
      [PaymentType.BOLETO]: 0,
      [PaymentType.PIX]: 0
    };
    currentMonthExpenses.forEach(e => {
      walletSummary[e.paymentType] += e.amount;
    });

    return {
      summaryData: summary,
      dashboardStats: {
        totalPending: totalPendingGlobal,
        totalMonth,
        nextMonthTotal,
        progress,
        walletSummary
      }
    };
  }, [expenses, filterMonth, filterYear, activeView, filteredExpenses, filterPerson]);


  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col pt-6 pb-32">
      {isLoading && <div className="fixed top-0 left-0 right-0 h-1 bg-[#1ed760] animate-pulse z-[300]"></div>}

      <header className="px-6 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            {activeView === 'dashboard' ? 'INÍCIO' : 'DESPESAS'}
          </h1>
          <p className="text-[10px] font-bold uppercase text-[#1ed760] tracking-widest mt-1">
            Smart Finance V5.1
          </p>
        </div>
        
        {/* Date Selectors */}
        <div className="flex gap-2">
            <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(parseInt(e.target.value))} 
            className="bg-[#1a241f] text-white font-bold text-[10px] uppercase p-2 rounded-xl border border-white/10 outline-none appearance-none"
            >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m.substring(0, 3)}</option>)}
            </select>
            <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(parseInt(e.target.value))} 
            className="bg-[#1a241f] text-white font-bold text-[10px] p-2 rounded-xl border border-white/10 outline-none appearance-none"
            >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <main className="px-6">
          <DashboardWidgets 
            monthIndex={filterMonth}
            year={filterYear}
            totalPending={dashboardStats.totalPending}
            totalMonth={dashboardStats.totalMonth}
            nextMonthTotal={dashboardStats.nextMonthTotal}
            progress={dashboardStats.progress}
            walletSummary={dashboardStats.walletSummary}
            onNavigateToExpenses={() => setActiveView('expenses')}
          />
        </main>
      ) : (
        <main className="flex-1 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SummaryCards summary={summaryData} />

          {/* Filtro de Pessoas */}
          <section className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
             <button onClick={() => setFilterPerson('Todos')} className={`px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${filterPerson === 'Todos' ? 'bg-[#1ed760] text-black shadow-lg shadow-[#1ed760]/20' : 'bg-[#1a241f] text-white/40 border border-white/5'}`}>Todos</button>
             {peopleList.map(p => (
               <button key={p} onClick={() => setFilterPerson(p)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${filterPerson === p ? 'bg-[#1ed760] text-black shadow-lg shadow-[#1ed760]/20' : 'bg-[#1a241f] text-white/40 border border-white/5'}`}>{p}</button>
             ))}
          </section>

          <div className="flex items-center justify-between mb-4">
             <h3 className="text-white font-bold text-lg">Lançamentos</h3>
             <span className="bg-[#1a241f] px-3 py-1 rounded-lg border border-white/5 text-[10px] font-bold text-white/30 uppercase">
                {filteredExpenses.length} Itens
             </span>
          </div>

          <div className="space-y-4">
            {filteredExpenses.map(exp => (
              <ExpenseCard 
                key={exp.id} 
                expense={exp} 
                onTogglePaid={togglePaid} 
                onEdit={setEditingExpense} 
                filterPerson={filterPerson}
                futureInstallments={getFutureInstallments(exp)}
                onPayInstallment={(futureId) => payFutureInstallment(exp.id, futureId)}
                onRevert={(id) => revertAdvances(id)}
                currentViewMonth={filterMonth}
                currentViewYear={filterYear}
              />
            ))}
            {filteredExpenses.length === 0 && (
              <div className="text-center py-20 bg-[#1a241f] rounded-[2.5rem] border border-white/5 opacity-40">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white/20 text-3xl">
                    <i className="fas fa-receipt"></i>
                </div>
                <p className="font-bold text-sm text-white/40">Nada para exibir</p>
              </div>
            )}
          </div>
        </main>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] p-8 flex flex-col animate-in fade-in duration-300">
          <button onClick={() => setShowConfig(false)} className="self-end w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40 mb-10"><i className="fas fa-times text-xl"></i></button>
          
          <div className="mb-10">
            <h2 className="text-white text-4xl font-black mb-2 uppercase tracking-tighter">Ajustes</h2>
            <p className="text-white/40 text-sm">Gerencie seu armazenamento e backup.</p>
          </div>
          
          <div className="space-y-4">
            <button onClick={downloadBackup} className="w-full bg-[#1a241f] text-white font-bold py-6 rounded-[2rem] flex items-center justify-center gap-4 border border-white/5 group active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] group-hover:scale-110 transition-transform">
                <i className="fas fa-download"></i>
              </div>
              <span className="uppercase tracking-widest text-xs">Exportar Dados (JSON)</span>
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#1a241f] text-white font-bold py-6 rounded-[2rem] flex items-center justify-center gap-4 border border-white/5 group active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <i className="fas fa-upload"></i>
              </div>
              <span className="uppercase tracking-widest text-xs">Restaurar do Arquivo</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target?.result as string);
                    setExpenses(data);
                    alert("Dados restaurados com sucesso!");
                  } catch { alert("Erro ao ler arquivo."); }
                };
                reader.readAsText(file);
              }
            }} accept=".json" className="hidden" />
          </div>
          
          {!isSupabaseConfigured && (
            <div className="mt-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem]">
              <div className="flex items-center gap-3 text-amber-500 mb-2">
                <i className="fas fa-exclamation-triangle"></i>
                <span className="font-bold text-xs uppercase tracking-widest">Modo Local</span>
              </div>
              <p className="text-white/40 text-[10px] leading-relaxed">
                Você não configurou o banco de dados no Vercel. Seus dados estão salvos apenas neste navegador. Recomendamos exportar um backup regularmente.
              </p>
            </div>
          )}
        </div>
      )}

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl border border-white/5 px-10 py-5 rounded-full flex gap-14 z-50 shadow-2xl">
         <button onClick={() => setActiveView('dashboard')} className={`transition-all ${activeView === 'dashboard' ? 'text-[#1ed760] scale-125' : 'text-white/20'}`}>
           <i className="fas fa-home text-2xl"></i>
         </button>
         <button onClick={() => setActiveView('expenses')} className={`transition-all ${activeView === 'expenses' ? 'text-[#1ed760] scale-125' : 'text-white/20'}`}>
           <i className="fas fa-list-ul text-2xl"></i>
         </button>
         <button 
           onClick={() => { setEditingExpense(undefined); setShowForm(true); }} 
           className="w-16 h-16 bg-[#1ed760] rounded-full flex items-center justify-center text-black absolute -top-8 left-1/2 -translate-x-1/2 border-[8px] border-[#0d1511] active:scale-90 transition-transform shadow-xl"
         >
           <i className="fas fa-plus text-xl"></i>
         </button>
      </nav>

      {(showForm || editingExpense) && (
        <ExpenseForm 
          onSave={(data) => saveExpense(data)} 
          onClose={() => { setShowForm(false); setEditingExpense(undefined); }} 
          initialData={editingExpense} 
          onDelete={(id) => deleteExpense(id)}
          peopleList={peopleList}
          personLabels={personLabels}
          onAddPerson={handleAddPerson}
        />
      )}
    </div>
  );
};

export default App;
