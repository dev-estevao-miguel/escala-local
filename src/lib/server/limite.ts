import { createHash } from 'node:crypto';
import { executar, transacao, um } from './db';

/** Contador persistente, compartilhado entre instâncias da aplicação. */
export async function limitar(chave: string, maximo = 12, minutos = 15) {
  const hash = createHash('sha256').update(chave).digest('hex');
  const agora = Date.now();
  return transacao(async () => {
    await executar('DELETE FROM tentativas_login WHERE janela < ?', agora - minutos * 60_000);
    await executar(`INSERT INTO tentativas_login(chave,tentativas,janela) VALUES (?,1,?)
      ON CONFLICT(chave) DO UPDATE SET tentativas=tentativas_login.tentativas+1`,hash,agora);
    return (await um<{tentativas:number}>('SELECT tentativas FROM tentativas_login WHERE chave=?',hash))!.tentativas > maximo;
  });
}
