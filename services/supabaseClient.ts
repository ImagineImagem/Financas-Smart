
import { createClient } from '@supabase/supabase-js';

// No Vercel/Vite, as variáveis de ambiente ficam disponíveis em process.env
declare const process: any;

const getEnv = (key: string): string => {
  try {
    return process.env[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Cria o cliente apenas se as chaves existirem para evitar erro fatal
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
