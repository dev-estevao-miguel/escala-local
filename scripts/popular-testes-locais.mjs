import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hashSenha} from '../src/lib/server/senha.ts';
import {hojeISO,somarDias,diaSemana,semanaDoMes,dataValida} from '../src/lib/util.ts';

export const SENHA_TESTES='teste123';
const cargos=['Pastor','Evangelista','Presbítero','Diácono','Auxiliar Oficial','Auxiliar Local'];
const nomes=['Paulo Demo','André Demo','Marcos Demo','Lucas Demo','Rafael Demo','Tiago Demo'];
const regras=[
 {dia:0,tipo:'Oração',inicio:'08:30',fim:'10:00'},
 {dia:0,tipo:'Pregação',inicio:'19:00',fim:'21:00'},
 {dia:1,tipo:'Estudos',inicio:'19:00',fim:'20:30'},
 {dia:2,tipo:'Doutrina',inicio:'19:00',fim:'21:00'},
 {dia:3,tipo:'Oração',inicio:'19:00',fim:'20:30'},
 {dia:4,tipo:'Círculo de Oração',inicio:'14:00',fim:'16:00'},
 {dia:5,tipo:'Culto para Mocidade',inicio:'19:00',fim:'21:00'},
 {dia:6,tipo:'Ponto de Pregação',inicio:'16:00',fim:'18:00'},
 {dia:0,semana:2,tipo:'Santa Ceia',inicio:'19:00',fim:'21:00'}
];

/** Ação manual para o banco local: não é executada ao iniciar a aplicação. */
export function popularTestes(db,{inicio=hojeISO(),dias=42}={}){
 if(!dataValida(inicio)||!Number.isInteger(dias)||dias<7||dias>62)throw new Error('Período de teste inválido.');
 const admin=db.prepare("SELECT id,senha_hash,carteira FROM usuarios WHERE perfil='admin'").get();
 if(!admin)throw new Error('Prepare o banco local e o administrador antes de criar os dados de teste.');
 const areas=db.prepare('SELECT a.* FROM areas a WHERE EXISTS(SELECT 1 FROM congregacoes g WHERE g.area_id=a.id AND g.habilitada=1) ORDER BY a.id').all();
 if(!areas.length)throw new Error('Cadastre uma área com congregações antes de popular os testes.');
 const fim=somarDias(inicio,dias-1),originais=db.prepare("SELECT id FROM usuarios WHERE perfil<>'admin'").all();
 let pessoasNovas=0,cultosNovos=0,agendasNovas=0;
 const carteira=(a,g,indice)=>`99${String(a.codigo).padStart(3,'0')}${String(g).padStart(3,'0')}${String(indice).padStart(2,'0')}`;
 const criar=(a,g,indice,nome,cargo,perfil)=>{
  const numero=carteira(a,g?.id??0,indice),existe=db.prepare('SELECT id,nome,area_id FROM usuarios WHERE carteira=?').get(numero);
  if(existe){if(!existe.nome.startsWith('[Teste] ')||existe.area_id!==a.id)throw new Error('Carteira de teste já pertence a outro cadastro: '+numero);return existe.id;}
  const r=db.prepare(`INSERT INTO usuarios(nome,carteira,senha_hash,trocar_senha,cargo,perfil,congregacao_id,area_id,status,nascimento,cadastrado_por,aprovado_por,aprovado_em,pode_definir_area)
   VALUES(?,?,?,0,?,?,?,?, 'ativo','1985-05-20',?,?,CURRENT_TIMESTAMP,0)`).run('[Teste] '+nome,numero,hashSenha(SENHA_TESTES),cargo,perfil,g?.id??null,a.id,admin.id,admin.id);
  pessoasNovas++;return Number(r.lastInsertRowid);
 };
 const disponibilizar=(id,indice=0)=>{
  if(db.prepare('SELECT 1 FROM disponibilidades WHERE usuario_id=? LIMIT 1').get(id))return;
  for(let dia=0;dia<7;dia++){
   if(indice!==6||[0,1,3].includes(dia))db.prepare("INSERT INTO disponibilidades(usuario_id,dia_semana,turno) VALUES(?,?,'noite')").run(id,dia);
   if(indice===0||indice===1||(dia===0&&[2,4,5].includes(indice)))db.prepare("INSERT INTO disponibilidades(usuario_id,dia_semana,turno) VALUES(?,?,'manha')").run(id,dia);
   if(indice===0||indice===1||dia===4||([4,5,6].includes(indice)&&dia===6))db.prepare("INSERT INTO disponibilidades(usuario_id,dia_semana,turno) VALUES(?,?,'tarde')").run(id,dia);
  }
 };
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const tipo of new Set(regras.map(r=>r.tipo)))db.prepare('INSERT OR IGNORE INTO tipos_culto(nome) VALUES(?)').run(tipo);
  const tipos=new Map(db.prepare('SELECT id,nome FROM tipos_culto').all().map(t=>[t.nome,t.id]));
  for(const a of areas){
   let coordenador=db.prepare("SELECT id FROM usuarios WHERE perfil='coordenador' AND status='ativo' AND area_id=?").get(a.id)?.id;
   if(!coordenador)coordenador=criar(a,null,0,'Coordenador da Área '+a.codigo,'Pastor','coordenador');
   disponibilizar(coordenador);
   let vice=db.prepare("SELECT id FROM usuarios WHERE perfil='vice' AND status='ativo' AND area_id=?").get(a.id)?.id;
   if(!vice)vice=criar(a,null,1,'Vice-Coordenador da Área '+a.codigo,'Pastor','vice');
   disponibilizar(vice);
   const igrejas=db.prepare('SELECT * FROM congregacoes WHERE area_id=? AND habilitada=1 ORDER BY id').all(a.id);
   for(const g of igrejas){
    let responsavel=db.prepare("SELECT id FROM usuarios WHERE perfil='pb' AND status='ativo' AND congregacao_id=?").get(g.id)?.id;
    if(!responsavel)responsavel=criar(a,g,0,'Responsável — '+g.nome,'Presbítero','pb');
    disponibilizar(responsavel);
    for(let i=0;i<cargos.length;i++){
     const id=criar(a,g,i+1,nomes[i]+' — '+g.nome,cargos[i],'obreiro');disponibilizar(id,i+1);
     if(i===0&&!db.prepare("SELECT id FROM indisponibilidades WHERE usuario_id=? AND motivo='[Teste] Viagem de exemplo'").get(id))db.prepare('INSERT INTO indisponibilidades(usuario_id,inicio,fim,motivo) VALUES(?,?,?,?)').run(id,somarDias(inicio,3),somarDias(inicio,4),'[Teste] Viagem de exemplo');
    }
    for(const r of regras){
     const semana=r.semana??null,tipo=tipos.get(r.tipo);
     let agenda=db.prepare('SELECT id FROM agenda WHERE congregacao_id=? AND ponto_id IS NULL AND tipo_culto_id=? AND dia_semana=? AND semana_mes IS ? AND hora_inicio=? AND hora_fim=?').get(g.id,tipo,r.dia,semana,r.inicio,r.fim)?.id;
     if(!agenda){agenda=Number(db.prepare('INSERT INTO agenda(congregacao_id,tipo_culto_id,dia_semana,semana_mes,hora_inicio,hora_fim) VALUES(?,?,?,?,?,?)').run(g.id,tipo,r.dia,semana,r.inicio,r.fim).lastInsertRowid);agendasNovas++;}
     for(let d=inicio;d<=fim;d=somarDias(d,1)){
      if(diaSemana(d)!==r.dia||(semana!==null&&semanaDoMes(d)!==semana))continue;
      if(r.tipo==='Pregação'&&r.dia===0&&semanaDoMes(d)===2)continue;
      if(db.prepare('SELECT id FROM cultos WHERE agenda_id=? AND data=?').get(agenda,d))continue;
      db.prepare('INSERT INTO cultos(data,congregacao_id,tipo_culto_id,hora_inicio,hora_fim,agenda_id,nome_evento,local_evento,observacao) VALUES(?,?,?,?,?,?,?,?,?)').run(d,g.id,tipo,r.inicio,r.fim,agenda,'[Teste] '+r.tipo,g.nome,'Programação demonstrativa para validar a geração de escalas.');cultosNovos++;
     }
    }
   }
   // Dois eventos simultâneos adicionais exercitam a prevenção de conflitos.
   for(const g of igrejas.slice(0,2)){
    const nome='[Teste] Reunião especial — '+g.codigo,data=somarDias(inicio,2);
    if(!db.prepare('SELECT id FROM cultos WHERE congregacao_id=? AND nome_evento=? AND data=?').get(g.id,nome,data)){
     db.prepare('INSERT INTO cultos(data,congregacao_id,tipo_culto_id,hora_inicio,hora_fim,nome_evento,local_evento,observacao) VALUES(?,?,?,\'19:30\',\'21:30\',?,?,?)').run(data,g.id,tipos.get('Pregação'),nome,g.nome,'Horário sobreposto: o sistema deve escolher pessoas diferentes.');cultosNovos++;
    }
   }
   const delegados=Number(db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE area_id=? AND gerencia_escala=1 AND status='ativo'").get(a.id).n);
   const candidatos=db.prepare("SELECT id FROM usuarios WHERE area_id=? AND perfil='obreiro' AND status='ativo' AND nome LIKE '[Teste] %' AND cargo IN ('Diácono','Auxiliar Oficial') AND gerencia_escala=0 ORDER BY id LIMIT ?").all(a.id,Math.max(0,2-delegados));
   for(const u of candidatos)db.prepare('UPDATE usuarios SET gerencia_escala=1 WHERE id=?').run(u.id);
  }
  // Inclui os cadastros já existentes; não reativa contas removidas/inativas.
  for(const u of originais)db.prepare('UPDATE usuarios SET senha_hash=?,trocar_senha=0,credencial_versao=credencial_versao+1 WHERE id=? AND perfil<>\'admin\'').run(hashSenha(SENHA_TESTES),u.id);
  for(const u of db.prepare("SELECT id FROM usuarios WHERE status='ativo' AND perfil<>'admin'").all())disponibilizar(u.id);
  db.prepare("INSERT INTO config(chave,valor) VALUES('dados_teste_locais',?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor").run(JSON.stringify({inicio,fim,pessoasNovas,cultosNovos,agendasNovas}));
  const depois=db.prepare("SELECT senha_hash,carteira FROM usuarios WHERE id=? AND perfil='admin'").get(admin.id);
  if(depois.senha_hash!==admin.senha_hash||depois.carteira!==admin.carteira)throw new Error('O acesso do administrador foi alterado.');
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 return {inicio,fim,pessoasNovas,cultosNovos,agendasNovas,areas:areas.map(a=>a.codigo),contas:db.prepare("SELECT u.nome,u.carteira,u.perfil,u.cargo,COALESCE(g.nome,'Coordenação da Área') AS congregacao,u.gerencia_escala FROM usuarios u LEFT JOIN congregacoes g ON g.id=u.congregacao_id WHERE u.status='ativo' AND u.perfil<>'admin' ORDER BY u.area_id,u.perfil,u.nome").all()};
}

async function main(){
 if(!process.argv.includes('--aplicar'))throw new Error('Ação manual: use npm run dados:teste -- --aplicar.');
 if(process.env.DATABASE_URL||process.env.VERCEL||process.env.NODE_ENV==='production')throw new Error('Este comando é exclusivo do banco SQLite de desenvolvimento.');
 const arquivo=resolve(process.env.DATA_DIR||'data','demo-local-v1.19.db');
 const db=new DatabaseSync(arquivo,{open:true});db.exec('PRAGMA foreign_keys=ON;');
 const pasta=join('.codex-backup','pre-dados-teste-'+new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(pasta,{recursive:true});
 try{
  await backup(db,join(pasta,'base.db'));
  const resultado=popularTestes(db);
  const csv=(v)=>'"'+String(v).replaceAll('"','""')+'"';
  writeFileSync('ACESSOS-TESTE.csv','\uFEFFNome;Carteira;Perfil;Cargo;Congregação;Monta escala;Senha\r\n'+resultado.contas.map(c=>[c.nome,c.carteira,c.perfil,c.cargo,c.congregacao,c.gerencia_escala?'Sim':'Não',SENHA_TESTES].map(csv).join(';')).join('\r\n'),'utf8');
  writeFileSync('DADOS-TESTE.md',`# Dados de teste locais\n\nÁrea(s): ${resultado.areas.join(', ')}. Período: **${resultado.inicio} a ${resultado.fim}**.\n\nCriados nesta execução: **${resultado.pessoasNovas} pessoas**, **${resultado.cultosNovos} cultos** e **${resultado.agendasNovas} regras de agenda**.\n\nTodos os usuários, incluindo os já cadastrados, usam **teste123**. O administrador **900001** mantém a senha anterior. Contas removidas ou inativas não foram reativadas.\n\nA lista de carteiras e perfis está em [ACESSOS-TESTE.csv](./ACESSOS-TESTE.csv). Contas fictícias têm o prefixo [Teste]. Não há WhatsApp real nos novos cadastros.\n\nEntre como coordenador ou vice → Escalas → Gerar Escala Local → selecione uma semana → Calcular prévia → revise → Confirmar e publicar escala. Há oração, estudos, doutrina, círculo de oração, mocidade, pontos de pregação e Santa Ceia no segundo domingo. Foram incluídas disponibilidades variadas, viagens de exemplo e eventos sobrepostos. Nenhuma escala foi publicada por este comando.\n\nBackup anterior: ${pasta.replaceAll('\\','/')}/base.db. O banco remoto não foi modificado.\n\nEste preenchimento é manual, nunca automático na inicialização. Reexecutar o comando não duplica pessoas, regras nem cultos do mesmo período, mas redefine novamente a senha dos usuários e invalida suas sessões; o administrador continua preservado.\n`,'utf8');
  console.log(JSON.stringify({inicio:resultado.inicio,fim:resultado.fim,pessoasNovas:resultado.pessoasNovas,cultosNovos:resultado.cultosNovos,agendasNovas:resultado.agendasNovas,contasAtivas:resultado.contas.length,backup:pasta}));
 }finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
