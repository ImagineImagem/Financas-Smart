
import { GoogleGenAI, Type } from "@google/genai";
import { Expense } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const getFinancialInsights = async (expenses: Expense[]) => {
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
    return "Não foi possível gerar insights no momento.";
  }
};

export const generateGoalImage = async (goalDescription: string) => {
  const model = 'gemini-2.5-flash-image';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: `A motivational, high-quality 3D render representing financial success and the goal: ${goalDescription}. Clean aesthetic, bright colors.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
  }
  return null;
};
