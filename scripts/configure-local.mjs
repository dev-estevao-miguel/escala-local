import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const path='.env';
let conteudo=existsSync(path)?readFileSync(path,'utf8'):readFileSync('.env.example','utf8');
for(const [chave,valor] of [['ADMIN_SENHA',randomBytes(15).toString('base64url')],['SESSAO_SEGREDO',randomBytes(32).toString('hex')]]){
 const regra=new RegExp(`^${chave}=\\s*$`,'m');
 if(regra.test(conteudo))conteudo=conteudo.replace(regra,`${chave}=${valor}`);
 else if(!new RegExp(`^${chave}=`,'m').test(conteudo))conteudo+=`\n${chave}=${valor}\n`;
}
writeFileSync(path,conteudo);
console.log('.env preparado. Carteira do administrador: 900001. Senha no campo ADMIN_SENHA. Preencha DATABASE_URL para conectar o Supabase.');
