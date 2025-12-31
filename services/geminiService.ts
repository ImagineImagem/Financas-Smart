import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Expense } from "../types";

// Informa ao TypeScript que a variável 'process' existe globalmente
declare const process: any;

// Define o esquema de resposta esperado para garantir JSON estruturado
const insightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.STRING,
      description: "Uma análise curta e perspicaz sobre o estado financeiro atual (max 2 frases)."
    },
    tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Três dicas táticas e curtas para economizar ou gerenciar melhor o dinheiro."
    }
  },
  required: ["analysis", "tips"]
};

export const getFinancialInsights = async (expenses: Expense[]) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API_KEY não configurada.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  // Resumir dados para economizar tokens e focar no essencial
  const dataSummary = expenses.slice(0, 50).map(e => ({
    d: e.description,
    v: e.amount,
    t: e.paymentType,
    split: e.splitBetween.length > 1 ? 'Dividido' : 'Solo',
    status: e.isPaid ? 'Pago' : 'Pendente'
  }));

  const prompt = `Analise estes registros financeiros. Aja como um consultor financeiro pessoal inteligente e direto.
  Identifique padrões de gastos, dívidas pendentes e oportunidades de economia.
  Responda em JSON conforme o esquema solicitado.
  Dados: ${JSON.stringify(dataSummary)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: insightsSchema,
        systemInstruction: "Você é o 'Finanças Smart AI'. Seja útil, direto e use emojis apropriados. Fale Português do Brasil."
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as { analysis: string, tips: string[] };
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};