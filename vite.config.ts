
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process' by casting to any
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Isso permite que process.env.API_KEY funcione no seu código
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': env
    }
  };
});
