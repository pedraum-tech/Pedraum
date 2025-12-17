import { defineConfig, devices } from '@playwright/experimental-ct-react';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Certifique-se de ter instalado: npm install -D dotenv

// 1. Configurar __dirname (necessário para módulos modernos)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Carregar o arquivo .env.local para a memória do Node.js
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './',
  snapshotDir: './__snapshots__',
  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      // 3. AQUI ESTÁ A CORREÇÃO MÁGICA:
      // Injeta manualmente as chaves do Firebase no navegador do teste
      define: {
        'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
        'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
        'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
        'process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
        'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
      },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});