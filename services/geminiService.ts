
import { GoogleGenAI } from "@google/genai";
import { Expense } from "../types";

// Informa ao TypeScript que a variável 'process' existe globalmente
declare const process: any;

export const getFinancialInsights = async (expenses: Expense[]) => {
  // Criamos a instância dentro da função para garantir que pegue o API_KEY atualizado
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "API_KEY não configurada. Adicione-a nas variáveis de ambiente do Vercel.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const dataSummary = expenses.map(e => ({
    desc: e.description,
    val: e.amount,
    type: e.paymentType,
    split: e.splitBetween.join(',')
  }));

  const prompt = `Analise os seguintes dados financeiros de despesas compartilhadas: ${JSON.stringify(dataSummary)}. 
  Forneça 3 dicas curtas e úteis para economizar ou gerenciar melhor esses gastos específicos. 
  Responda em Português do Brasil.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento. Verifique se a API_KEY foi configurada corretamente no painel do Vercel.";
  }
};
