import {defineConfig} from '@playwright/test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const pastaTestes=process.env.DEMO_TEST_DATA_DIR ??= join(tmpdir(),`escala-tests-${Date.now()}`);
export default defineConfig({
  testDir:'./tests',workers:1,timeout:120_000,expect:{timeout:15_000},
  use:{baseURL:'http://127.0.0.1:5174',browserName:'chromium',launchOptions:{channel:'chrome'},trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5174',url:'http://127.0.0.1:5174/login',reuseExistingServer:false,timeout:120_000,
    env:{DATABASE_URL:'',DATA_DIR:pastaTestes,ADMIN_SENHA:'Admin-Teste-2026!',SESSAO_SEGREDO:'segredo-exclusivo-dos-testes-1234567890',SEM_DEMO:'1'}}
});
