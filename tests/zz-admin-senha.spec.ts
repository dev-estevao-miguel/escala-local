import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {conferirSenha} from '../src/lib/server/senha';
import {CHAVE_CONFIGURACAO_ADMIN,gerarConfiguracaoAdmin} from '../src/lib/server/admin-configuracao-dados';

test('Administrador cadastra senha uma única vez por acesso privado, inclusive sem JavaScript',async({browser,baseURL})=>{
 const db=new DatabaseSync(join(process.env.DEMO_TEST_DATA_DIR!,'demo-local-v1.19.db'));
 const admin=db.prepare("SELECT id,senha_hash,credencial_versao,trocar_senha FROM usuarios WHERE carteira='900001' AND perfil='admin'").get()!;
 const anterior=db.prepare('SELECT valor FROM config WHERE chave=?').get(CHAVE_CONFIGURACAO_ADMIN);
 const ctx=await browser.newContext({javaScriptEnabled:false});
 const anon=await browser.newContext();
 const nova='Senha-Privada-Administrador-2026!';
 try{
  const inicial=gerarConfiguracaoAdmin(Number(admin.id),Number(admin.credencial_versao));
  const salvar=(valor:unknown)=>db.prepare('INSERT INTO config(chave,valor) VALUES (?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor').run(CHAVE_CONFIGURACAO_ADMIN,JSON.stringify(valor));
  salvar(inicial.registro);
  const r=await anon.request.post('/login',{form:{carteira:'900001',cadastrar_admin:'1',nova,nova2:nova},headers:{origin:baseURL!},maxRedirects:0});
  expect((await r.json()).status).toBe(410);
  expect(db.prepare('SELECT senha_hash FROM usuarios WHERE id=?').get(admin.id)!.senha_hash).toBe(admin.senha_hash);
  const semPermissao=await anon.newPage();await semPermissao.goto(baseURL+'/login');await semPermissao.waitForLoadState('networkidle');await semPermissao.locator('#carteira').fill('900001');await semPermissao.getByRole('button',{name:'Continuar',exact:true}).click();await expect(semPermissao.locator('#senha')).toBeVisible();
  const page=await ctx.newPage();await page.goto(baseURL+'/acesso-admin/'+inicial.token);await expect(page).toHaveURL(baseURL+'/login');
  const cookie=(await ctx.cookies(baseURL+'/login')).find(c=>c.name==='configurar_admin');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Strict');expect(cookie?.path).toBe('/login');
  await page.locator('#carteira').fill('900001');await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Cadastre a senha do administrador',exact:true})).toBeVisible();
  expect((await ctx.request.get('/',{maxRedirects:0})).headers().location).toBe('/login');
  await page.getByLabel('Nova senha do administrador',{exact:true}).fill(nova);await page.getByLabel('Repita a nova senha',{exact:true}).fill(nova+'erro');await page.getByRole('button',{name:'Salvar senha e entrar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('não conferem');
  await page.getByLabel('Nova senha do administrador',{exact:true}).fill(nova);await page.getByLabel('Repita a nova senha',{exact:true}).fill(nova);await page.getByRole('button',{name:'Salvar senha e entrar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Administração da plataforma',exact:true,level:1})).toBeVisible();
  const atual=db.prepare('SELECT carteira,senha_hash,credencial_versao FROM usuarios WHERE id=?').get(admin.id)!;
  expect(atual.carteira).toBe('900001');expect(conferirSenha(nova,String(atual.senha_hash))).toBe(true);expect(atual.senha_hash).not.toBe(nova);expect(Number(atual.credencial_versao)).toBe(Number(admin.credencial_versao)+1);
  expect(db.prepare('SELECT valor FROM config WHERE chave=?').get(CHAVE_CONFIGURACAO_ADMIN)).toBeUndefined();
  expect((await anon.request.get('/acesso-admin/'+inicial.token,{maxRedirects:0})).status()).toBe(410);
  const reutilizar=await anon.request.post('/login',{form:{carteira:'900001',cadastrar_admin:'1',nova:'Outra-Senha-2026!',nova2:'Outra-Senha-2026!'},headers:{origin:baseURL!,cookie:'configurar_admin='+inicial.token},maxRedirects:0});expect((await reutilizar.json()).status).toBe(410);
  await semPermissao.goto(baseURL+'/login');await semPermissao.waitForLoadState('networkidle');await semPermissao.locator('#carteira').fill('900001');await semPermissao.getByRole('button',{name:'Continuar',exact:true}).click();await expect(semPermissao.locator('#senha')).toBeVisible();await semPermissao.locator('#senha').fill(nova);await semPermissao.getByRole('button',{name:'Entrar',exact:true}).click();await expect(semPermissao.getByRole('heading',{name:'Administração da plataforma',exact:true,level:1})).toBeVisible();
  const expirado=gerarConfiguracaoAdmin(Number(admin.id),Number(atual.credencial_versao));salvar({...expirado.registro,expiraEm:Date.now()-1});
  expect((await anon.request.get('/acesso-admin/'+expirado.token,{maxRedirects:0})).status()).toBe(410);
 }finally{
  db.prepare('UPDATE usuarios SET senha_hash=?,credencial_versao=?,trocar_senha=? WHERE id=?').run(admin.senha_hash,admin.credencial_versao,admin.trocar_senha,admin.id);
  if(anterior)db.prepare('UPDATE config SET valor=? WHERE chave=?').run(anterior.valor,CHAVE_CONFIGURACAO_ADMIN);else db.prepare('DELETE FROM config WHERE chave=?').run(CHAVE_CONFIGURACAO_ADMIN);
  db.close();await ctx.close();await anon.close();
 }
});

test('Link administrativo gerado pela ferramenta só permite uma gravação concorrente',async({browser,baseURL})=>{
 const db=new DatabaseSync(join(process.env.DEMO_TEST_DATA_DIR!,'demo-local-v1.19.db'));
 const admin=db.prepare("SELECT id,senha_hash,credencial_versao,trocar_senha FROM usuarios WHERE carteira='900001' AND perfil='admin'").get()!;
 const anterior=db.prepare('SELECT valor FROM config WHERE chave=?').get(CHAVE_CONFIGURACAO_ADMIN);
 const a=await browser.newContext(),b=await browser.newContext();
 try{
  db.prepare('DELETE FROM tentativas_login WHERE chave=?').run(createHash('sha256').update('carteira:900001').digest('hex'));
  const resultado=JSON.parse(execFileSync(process.execPath,['scripts/admin-create-password.mjs','--origem',baseURL!],{encoding:'utf8',env:{...process.env,DATABASE_URL:'',DATA_DIR:process.env.DEMO_TEST_DATA_DIR}}));
  const {link}=JSON.parse(readFileSync(resultado.linkPrivadoSalvoEm,'utf8'));
  expect(db.prepare('SELECT senha_hash FROM usuarios WHERE id=?').get(admin.id)!.senha_hash).toBe(admin.senha_hash);
  for(const ctx of [a,b])await ctx.request.get(link);
  const salvar=(ctx:typeof a,nova:string)=>ctx.request.post('/login',{form:{carteira:'900001',cadastrar_admin:'1',nova,nova2:nova},headers:{origin:baseURL!},maxRedirects:0}).then(r=>r.json());
  const r=await Promise.all([salvar(a,'Senha-Concorrente-A-2026!'),salvar(b,'Senha-Concorrente-B-2026!')]);
  expect(r.filter(v=>v.type==='redirect')).toHaveLength(1);expect(r.filter(v=>v.status===410)).toHaveLength(1);
  expect(Number(db.prepare('SELECT credencial_versao FROM usuarios WHERE id=?').get(admin.id)!.credencial_versao)).toBe(Number(admin.credencial_versao)+1);
  expect(db.prepare('SELECT valor FROM config WHERE chave=?').get(CHAVE_CONFIGURACAO_ADMIN)).toBeUndefined();
 }finally{
  db.prepare('UPDATE usuarios SET senha_hash=?,credencial_versao=?,trocar_senha=? WHERE id=?').run(admin.senha_hash,admin.credencial_versao,admin.trocar_senha,admin.id);
  if(anterior)db.prepare('INSERT INTO config(chave,valor) VALUES (?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor').run(CHAVE_CONFIGURACAO_ADMIN,anterior.valor);else db.prepare('DELETE FROM config WHERE chave=?').run(CHAVE_CONFIGURACAO_ADMIN);
  db.close();await a.close();await b.close();
 }
});
