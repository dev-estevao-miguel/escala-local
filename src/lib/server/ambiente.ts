import {existsSync} from 'node:fs';
// O Vite não copia variáveis privadas do .env para process.env automaticamente.
// Em produção, as credenciais são fornecidas pelo ambiente de hospedagem.
if (process.env.NODE_ENV !== 'production') {
  for (const arquivo of ['.env.local','.env']) if (existsSync(arquivo)) process.loadEnvFile(arquivo);
}
