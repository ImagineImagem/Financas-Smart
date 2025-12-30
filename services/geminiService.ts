
import { createClient } from '@supabase/supabase-js';

// Informa ao TypeScript que a variável 'process' existe globalmente
declare const process: any;

// Função auxiliar para obter variáveis de ambiente com segurança
const getEnv = (key: string): string => {
  try {
    return process.env[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Verifica se as configurações básicas existem antes de tentar criar o cliente
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não foram encontrados. " +
    "Verifique as configurações de variáveis de ambiente no Vercel."
  );
}

// Exporta o cliente apenas se configurado, caso contrário exporta um proxy seguro ou null
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
