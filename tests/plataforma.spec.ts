import {test,expect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {parse} from 'devalue';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {textoPdfKit} from '../scripts/pdf-text.mjs';
const origem='http://127.0.0.1:5174',senha='MinhaSenha-2026!';
const base={nome:'Pessoa Teste',nascimento:'1985-05-20',whatsapp:'81999998888',senha,senha2:senha,disp:['0-noite','1-noite','2-noite','3-noite','4-noite','5-noite','6-noite']};
async function action(ctx:BrowserContext,path:string,form:Record<string,string|string[]>){const body=new URLSearchParams();for(const [k,v] of Object.entries(form))for(const s of Array.isArray(v)?v:[v])body.append(k,s);const r=await ctx.request.post(path,{data:body.toString(),headers:{origin:origem,accept:'application/json','content-type':'application/x-www-form-urlencoded','x-sveltekit-action':'true'},maxRedirects:0});const j=await r.json();return {http:r.status(),...j,status:j.status??r.status(),data:j.data?parse(j.data):undefined};}
async function entrar(ctx:BrowserContext,carteira:string,pass=senha){const r=await action(ctx,'/login',{carteira,senha:pass});expect(r.type,JSON.stringify(r)).toBe('redirect');}
async function registrar(ctx:BrowserContext,link:string,carteira:string,nome:string,cargo:string,congregacao_id=''){const r=await action(ctx,link+'?/salvar',{...base,carteira,nome,cargo,...(congregacao_id?{congregacao_id}:{})});expect(r.type,JSON.stringify(r)).toBe('redirect');}
async function abrir(ctx:BrowserContext,path:string){const p=await ctx.newPage();const r=await p.goto(origem+path);expect(r?.status(),path).toBe(200);if(await p.locator('#conteudo').count())await expect(p.locator('#conteudo')).toHaveAttribute('data-pronto','true');return p;}
async function perfilId(ctx:BrowserContext,nome:string){const p=await abrir(ctx,'/obreiros'),link=p.locator('a[href^="/obreiros/"]').filter({hasText:nome}).first(),href=await link.getAttribute('href');expect(href).toBeTruthy();await p.close();return href!.split('/').pop()!;}
async function igrejas(ctx:BrowserContext){const p=await abrir(ctx,'/minha-area');const lista=await p.locator('a[href^="/congregacoes/"]').evaluateAll(a=>a.map(e=>({id:e.getAttribute('href')!.split('/').pop()!,nome:e.textContent!})));await p.close();return lista;}
async function conviteResponsaveis(ctx:BrowserContext,regenerar=false){const r=await action(ctx,'/minha-area?/convidar',regenerar?{regenerar:'1'}:{});expect(r.status,JSON.stringify(r)).toBe(200);return r.data.link as string;}
async function evento(ctx:BrowserContext,nome:string,data:string){const r=await action(ctx,'/eventos?/salvar',{nome_evento:nome,data,hora_inicio:'19:00',hora_fim:'21:00',local_evento:'Templo da congregação',observacao:'Programação local'});expect(r.status,JSON.stringify(r)).toBe(200);return String(r.data.id);}
async function idCoordenador(ctx:BrowserContext,nome:string){const p=await abrir(ctx,'/coordenadores'),id=await p.locator('article').filter({has:p.getByRole('heading',{name:nome,exact:true})}).locator('input[name=id]').first().inputValue();await p.close();return id;}
const catalogo=JSON.parse(readFileSync('dados/congregacoes-demo.json','utf8'));

test.describe.serial('Simplificação e cadastro da coordenação',()=>{
 let admin:BrowserContext,a:BrowserContext,b:BrowserContext,c:BrowserContext,p57:BrowserContext,p05:BrowserContext,w57:BrowserContext,worker:BrowserContext;
 let geral:string,novoGeral:string,igreja57:string,igreja05:string,evento57:string,evento05:string,linkWorker:string,idA:string,idB:string;
 let viceDesktop:BrowserContext,segundoPb:BrowserContext,auxiliar:BrowserContext;
 let publicacaoNotificada:string,segundaPublicacao:string;
 const contextos:BrowserContext[]=[];
 const novo=async(browser:Browser)=>{const ctx=await browser.newContext();contextos.push(ctx);return ctx;};
 test.beforeAll(async({browser})=>{admin=await novo(browser);a=await novo(browser);b=await novo(browser);c=await novo(browser);p57=await novo(browser);p05=await novo(browser);w57=await novo(browser);worker=await novo(browser);await entrar(admin,'900001','Admin-Teste-2026!');});
 test.afterAll(async()=>{for(const ctx of contextos)await ctx.close();});

 test('01 · Admin simples e sem operação de Área',async()=>{
  const p=await abrir(admin,'/');await expect(p.getByRole('button',{name:'Convidar Coordenador',exact:true})).toBeVisible();await expect(p.getByRole('link',{name:'Gerenciar Coordenadores',exact:true}).first()).toBeVisible();
  const principal=p.locator('main');await expect(principal).not.toContainText(/Convidar Área|Minha Área|disponibilidade|Minhas escalas/);expect(await p.locator('select[name=area_id]').count()).toBe(0);
  for(const rota of ['/minha-area','/escala','/eventos','/obreiros','/area'])expect((await admin.request.get(rota,{maxRedirects:0})).status(),rota).toBe(403);
  await p.goto(origem+'/perfil');expect(await p.locator('[name=disp]').count()).toBe(0);await expect(p.locator('main')).not.toContainText(/Disponibilidade|Congregação:/);await p.close();
 });
 test('02 · Um convite reutilizável cadastra dois Coordenadores sem criar Áreas',async()=>{
  const r=await action(admin,'/?/convidarCoordenador',{});expect(r.status).toBe(200);geral=r.data.link;expect(geral).toMatch(/^\/convite\/coordenador\/[\w-]{43}$/);
  await registrar(a,geral,'0001','Estevão Miguel','Presbítero');await registrar(b,geral,'0002','Miguel Santos','Pastor');
  const repetido=await action(admin,'/?/convidarCoordenador',{});expect(repetido.data.link).toBe(geral);
  const p=await abrir(admin,'/coordenadores');await expect(p.getByText('Sem Área',{exact:true})).toHaveCount(2);await p.close();
  const ap=await abrir(a,'/');await expect(ap.getByLabel('Nº da Área',{exact:true})).toBeVisible();await expect(ap.locator('main')).not.toContainText('Minhas escalas');await ap.close();
 });
 test('03 · Regenerar revoga o link antigo e conserva o novo para copiar',async()=>{
  const r=await action(admin,'/?/convidarCoordenador',{regenerar:'1'});novoGeral=r.data.link;expect(novoGeral).not.toBe(geral);
  expect((await action(c,geral+'?/salvar',{...base,carteira:'0003',nome:'João Silva',cargo:'Evangelista'})).status).toBe(410);
  await registrar(c,novoGeral,'0003','João Silva','Evangelista');
  const p=await abrir(admin,'/');const campo=p.getByLabel('Link do convite');await expect(campo).toHaveValue(origem+novoGeral);await expect(p.getByRole('button',{name:'Regenerar link',exact:true})).toBeVisible();await p.close();
 });
 test('04 · Primeiro acesso importa somente a Área confirmada e todas as suas igrejas',async()=>{
  const r=await action(a,'/?/definirArea',{codigo:'57'});expect(r.type,JSON.stringify(r)).toBe('redirect');
  const lista=await igrejas(a),referencia=catalogo.areas.find((x:{codigo:string})=>Number(x.codigo)===57);expect(lista.length).toBe(referencia.congregacoes.length);igreja57=(lista.find(x=>x.nome.includes('Santa Rita'))||lista[0]).id;
  const p=await abrir(a,'/minha-area');await expect(p.getByRole('heading',{name:'Minha Área · Área 57',exact:true})).toBeVisible();expect(await p.locator('input[name=codigo],select[name=area_id]').count()).toBe(0);await p.close();
  expect((await action(b,'/?/definirArea',{codigo:'05'})).type).toBe('redirect');igreja05=(await igrejas(b))[0].id;
 });
 test('05 · Coordenador não altera sua própria Área por formulário ou POST forjado',async()=>{
  expect((await action(a,'/?/definirArea',{codigo:'05'})).status).toBe(403);expect((await action(a,'/area',{area_id:'2'})).status).toBe(403);
  const p=await abrir(a,'/minha-area');await expect(p.locator('main')).toContainText('Área 57');await expect(p.locator('main')).not.toContainText(/Editar Área|Trocar Área/);await p.close();
 });
 test('06 · Admin troca Coordenador, bloqueia o anterior e preserva os dados da Área',async()=>{
  const l=await conviteResponsaveis(a);await registrar(p57,l,'0101','Responsável Cinquenta Sete','Presbítero',igreja57);
  const w=await action(p57,'/obreiros?/criarConvite',{perfil:'obreiro',congregacao_id:igreja57});expect(w.status).toBe(200);await registrar(w57,w.data.link,'0102','Obreiro Cinquenta Sete','Diácono',igreja57);
  evento57=await evento(p57,'Evento preservado da Área 57','2026-11-02');const uid=await perfilId(a,'Obreiro Cinquenta Sete');expect((await action(a,'/escala?/escalar',{culto_id:evento57,usuario_id:uid})).status).toBe(200);
  idA=await idCoordenador(admin,'Estevão Miguel');idB=await idCoordenador(admin,'Miguel Santos');const movido=await action(admin,'/coordenadores?/vincular',{id:idA,codigo:'05'});expect(movido.status).toBe(200);
  await entrar(a,'0001');await entrar(b,'0002');const p=await abrir(b,'/');await expect(p.locator('main')).toContainText('Sua conta está aguardando vinculação de Área pelo Administrador.');expect(await p.locator('[name=codigo]').count()).toBe(0);await p.close();expect((await action(b,'/?/definirArea',{codigo:'15'})).status).toBe(403);
  for(const rota of ['/minha-area','/eventos','/obreiros','/escala','/aprovacoes']){const r=await b.request.get(rota,{maxRedirects:0});expect(r.status()).toBe(303);expect(r.headers().location).toBe('/');}
  expect((await action(c,'/?/definirArea',{codigo:'57'})).type).toBe('redirect');const lista=await igrejas(c);expect(lista.length).toBe(catalogo.areas.find((x:{codigo:string})=>Number(x.codigo)===57).congregacoes.length);
  const cp=await abrir(c,'/eventos?inicio=2026-11-02&fim=2026-11-02');await expect(cp.getByRole('heading',{name:'Evento preservado da Área 57',exact:true})).toBeVisible();await cp.goto(origem+'/escala?data=2026-11-02');await expect(cp.locator('main')).toContainText('Dc. Obreiro Cinquenta Sete');await cp.close();
  const obreiros=await c.request.get('/obreiros');expect(await obreiros.text()).toContain('Responsável Cinquenta Sete');expect(await obreiros.text()).toContain('Obreiro Cinquenta Sete');
  expect((await action(admin,'/coordenadores?/desvincular',{id:idA})).status).toBe(200);await entrar(a,'0001');expect((await action(a,'/?/definirArea',{codigo:'05'})).status).toBe(403);expect((await action(admin,'/coordenadores?/vincular',{id:idA,codigo:'05'})).status).toBe(200);await entrar(a,'0001');
 });
 test('07 · Saudação usa Coord. e a escala mantém Pb. sem mudar cargo',async()=>{
  const p=await abrir(a,'/');await expect(p.getByRole('heading',{name:'A Paz do Senhor, Coord. Estevão Miguel',exact:true})).toBeVisible();await p.close();
  const l=await conviteResponsaveis(a);await registrar(p05,l,'0201','Responsável Cinco','Presbítero',igreja05);evento05=await evento(p05,'Conferência local','2026-11-09');expect((await action(a,'/escala?/escalar',{culto_id:evento05,usuario_id:idA})).status).toBe(200);
  const ep=await abrir(a,'/escala?data=2026-11-09');await expect(ep.locator('main')).toContainText('Pb. Estevão Miguel');await expect(ep.locator('main')).not.toContainText('Coord. Estevão Miguel');await ep.close();
  const pdf=await a.request.get('/escala/pdf?data=2026-11-09');expect(pdf.status()).toBe(200);writeFileSync('test-results/escala-simplificada.pdf',await pdf.body());const texto=textoPdfKit(await pdf.body());expect(texto).toContain('Pb. Estevão Miguel');expect(texto).not.toContain('Coord.');
 });
 test('08 · Home da coordenação tem três cards e um único gráfico mensal',async()=>{
  const p=await abrir(a,'/');await expect(p.locator('[data-testid=cards-coordenador] article')).toHaveCount(3);await expect(p.locator('main [role=img]')).toHaveCount(1);await expect(p.getByRole('region',{name:'Movimentação das Escalas',exact:true})).toBeVisible();
  await expect(p.locator('main')).not.toContainText(/Minhas escalas|menos escalados|aguardando autorização|Cultos de hoje|Indisponibilidades no período/);await p.setViewportSize({width:390,height:844});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:'test-results/coordenador-simples-mobile.png',fullPage:true});await p.close();
 });
 test('09 · Responsável cadastra evento e Coordenador utiliza no gerador',async()=>{
  const id=await evento(p05,'Festividade das Crianças','2026-11-18');const p=await abrir(a,'/eventos?inicio=2026-11-18&fim=2026-11-18');await expect(p.getByRole('heading',{name:'Festividade das Crianças',exact:true})).toBeVisible();expect(await p.getByText('Cadastrar evento local',{exact:true}).count()).toBe(0);await p.close();
  await a.request.get('/escala?data=2026-11-18');
  const previa=await action(a,'/escala/gerar?/previa',{inicio:'2026-11-18',fim:'2026-11-18'});expect(previa.status).toBe(200);expect(previa.data.previa.propostas.some((e:{culto_id:number})=>String(e.culto_id)===id)).toBe(true);expect(previa.data.previa.propostas[0].nome_evento).toBe('Festividade das Crianças');
  expect((await action(a,'/escala/gerar?/confirmar',{inicio:'2026-11-18',fim:'2026-11-18',assinatura:previa.data.assinatura})).status).toBe(200);
  expect((await action(p57,'/eventos?/salvar',{id,congregacao_id:igreja05,nome_evento:'Forjado',data:'2026-11-18',hora_inicio:'19:00',hora_fim:'21:00',local_evento:'Local'})).status).toBe(403);
  expect((await action(a,'/eventos?/salvar',{nome_evento:'Sem permissão'})).status).toBe(403);expect((await a.request.get('/aprovacoes')).status()).toBe(200);
  const extra=await evento(p05,'Evento para cancelar','2026-11-23');expect((await action(p05,'/eventos?/salvar',{id:extra,nome_evento:'Evento editado',data:'2026-11-23',hora_inicio:'18:00',hora_fim:'20:00',local_evento:'Salão da igreja',observacao:'Horário atualizado'})).status).toBe(200);expect((await action(p05,'/eventos?/excluir',{id:extra})).status).toBe(200);expect(await(await a.request.get('/eventos?inicio=2026-11-23&fim=2026-11-23')).text()).not.toContain('Evento editado');
 });
 test('10 · Recurso retirado não tem rota, UI ou regra ativa',async()=>{
  expect((await a.request.get('/escala/oficial')).status()).toBe(404);
  const arquivos=(p:string):string[]=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?arquivos(join(p,e.name)):/\.(ts|svelte)$/.test(e.name)?[join(p,e.name)]:[]);
  for(const f of arquivos('src'))expect(readFileSync(f,'utf8'),f).not.toMatch(/Escala Oficial|OFFICIAL|compromissos_oficiais/i);
 });
 test('11 · Convite de Obreiro exige congregação e não oferece opção genérica',async()=>{
  expect((await action(a,'/obreiros?/criarConvite',{perfil:'obreiro'})).status).toBe(400);const p=await abrir(a,'/obreiros');await p.getByText('Convidar Obreiro',{exact:true}).click();await expect(p.getByLabel('Congregação do obreiro',{exact:true})).toHaveAttribute('required','');await expect(p.locator('main')).not.toContainText('Qualquer congregação');await p.close();
  const r=await action(a,'/obreiros?/criarConvite',{perfil:'obreiro',congregacao_id:igreja05});expect(r.status).toBe(200);linkWorker=r.data.link;
 });
 test('12 · Cadastro de Obreiro fixa a congregação do convite no backend',async()=>{
  expect((await action(worker,linkWorker+'?/salvar',{...base,carteira:'0202',nome:'Ana Teste',cargo:'Diácono',congregacao_id:igreja57})).status).toBe(403);
  const p=await abrir(worker,linkWorker);await expect(p.locator('.register-page')).toHaveAttribute('data-pronto','true');await p.getByLabel('Nº da carteira de membro',{exact:true}).fill('0202');await p.getByRole('button',{name:'Continuar',exact:true}).click();await expect(p.getByLabel('Nome completo',{exact:true})).toBeVisible();await expect(p.getByLabel('Congregação',{exact:true})).toBeDisabled();expect(await p.locator('input[name=congregacao_id]').inputValue()).toBe(igreja05);await p.close();await registrar(worker,linkWorker,'0202','Ana Teste','Diácono',igreja05);
  const perfil=await abrir(worker,'/perfil');await expect(perfil.locator('main')).toContainText('Diácono');await perfil.close();expect((await worker.request.get('/obreiros')).status()).toBe(403);
 });
 test('13 · Desktop não mostra banner e não intercepta instalação nativa',async()=>{
  const p=await abrir(admin,'/');await p.waitForLoadState('networkidle');await expect(p.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);expect(await p.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})).toBe(false);await p.screenshot({path:'test-results/admin-simples-desktop.png',fullPage:true});await p.close();
 });
 test('14 · Android: botão só na Home, dismiss persistido e sumiço após instalar',async({browser})=>{
  const ctx=await browser.newContext({storageState:await a.storageState(),viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),p=await abrir(ctx,'/');
  await expect(p.getByRole('button',{name:'Adicionar à tela inicial',exact:true})).toBeVisible();await p.getByRole('button',{name:'Agora não',exact:true}).click();await p.reload();await expect(p.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);
  await p.evaluate(()=>localStorage.clear());await p.reload();await expect(p.getByRole('button',{name:'Adicionar à tela inicial',exact:true})).toBeVisible();await p.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});Object.assign(e,{prompt:async()=>{document.documentElement.dataset.instalou='sim';},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(e);});await p.getByRole('button',{name:'Adicionar à tela inicial',exact:true}).click();expect(await p.evaluate(()=>document.documentElement.dataset.instalou)).toBe('sim');await p.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await expect(p.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);
  for(const path of ['/minha-area','/obreiros','/escala','/eventos','/perfil']){await p.goto(origem+path);await expect(p.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);}await ctx.close();
  const instalado=await browser.newContext({storageState:await a.storageState(),viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});await instalado.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=(q)=>{const m=original(q);if(q==='(display-mode: standalone)')Object.defineProperty(m,'matches',{value:true});return m;};});const ip=await abrir(instalado,'/');await ip.waitForLoadState('networkidle');await expect(ip.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);await instalado.close();
 });
 test('15 · iOS orienta apenas na Home e esconde em standalone',async({browser})=>{
  const opcoes={storageState:await a.storageState(),viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'};
  const ctx=await browser.newContext(opcoes),p=await abrir(ctx,'/');await p.getByRole('button',{name:'Adicionar à tela inicial',exact:true}).click();await expect(p.getByRole('dialog',{name:'Adicionar à Tela de Início'})).toContainText('Compartilhar');await p.getByRole('button',{name:'Entendi'}).click();await p.goto(origem+'/eventos');await expect(p.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);await ctx.close();
  const standalone=await browser.newContext(opcoes);await standalone.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));const sp=await abrir(standalone,'/');await sp.waitForLoadState('networkidle');await expect(sp.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);await standalone.close();
  const anon=await browser.newContext({...opcoes,storageState:{cookies:[],origins:[]}}),lp=await abrir(anon,'/login');await lp.waitForLoadState('networkidle');await expect(lp.getByRole('region',{name:'Instalar Escala Local'})).toHaveCount(0);await anon.close();
 });
 test('16 · Cargo e Função separados: Vice entra na mesma Área sem substituir o Coordenador',async({browser})=>{
  const vice=await novo(browser),p=await abrir(vice,novoGeral);
  await expect(p.locator('.register-page')).toHaveAttribute('data-pronto','true');
  await p.getByLabel('Nº da carteira de membro',{exact:true}).fill('0301');
  await p.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(p.getByLabel('Cargo',{exact:true})).toBeVisible();
  const funcao=p.getByLabel('Função',{exact:true});
  await expect(funcao.locator('option')).toHaveText(['Coordenador','Vice-Coordenador']);
  await funcao.selectOption('vice');
  await expect(p.getByLabel('WhatsApp',{exact:true})).toBeVisible();
  await p.getByLabel('Nome completo',{exact:true}).fill('Vice de Teste');
  await p.getByLabel('Data de nascimento',{exact:true}).fill(base.nascimento);
  await p.getByLabel('Cargo',{exact:true}).selectOption('Pastor');
  await p.getByLabel('WhatsApp',{exact:true}).fill(base.whatsapp);
  await p.getByLabel('Senha',{exact:true}).fill(senha);
  await p.getByLabel('Repita a senha',{exact:true}).fill(senha);
  await p.getByRole('button',{name:'Concluir meu cadastro',exact:true}).click();
  await expect(p.getByLabel('Nº da Área',{exact:true})).toBeVisible();
  expect((await action(vice,'/?/definirArea',{codigo:'05'})).type).toBe('redirect');
  await p.goto(origem+'/');
  await expect(p.getByRole('heading',{name:'A Paz do Senhor, Vic. Coord. Vice de Teste',exact:true})).toBeVisible();
  const ap=await abrir(a,'/');await expect(ap.getByRole('heading',{name:'A Paz do Senhor, Coord. Estevão Miguel',exact:true})).toBeVisible();await ap.close();
  const id=await idCoordenador(admin,'Vice de Teste');
  const lista=await abrir(admin,'/coordenadores');await expect(lista.locator('article').filter({has:lista.getByRole('heading',{name:'Vice de Teste',exact:true})})).toContainText('Vice');await lista.close();
  expect((await action(admin,'/coordenadores?/vincular',{id,codigo:'57'})).status).toBe(200);
  await entrar(vice,'0301');await p.goto(origem+'/minha-area');await expect(p.locator('main')).toContainText('Área 57');
  const cp=await abrir(c,'/minha-area');await expect(cp.locator('main')).toContainText('Área 57');await cp.close();
  await p.goto(origem+'/perfil');await expect(p.locator('main')).toContainText('Pastor');await p.close();
  expect((await action(vice,'/?/definirArea',{codigo:'05'})).status).toBe(403);
  const anon=await novo(browser);
  expect((await action(anon,novoGeral+'?/salvar',{...base,carteira:'0302',cargo:'Pastor',funcao:'admin'})).status).toBe(403);
  expect((await action(anon,linkWorker+'?/salvar',{...base,carteira:'0303',cargo:'Diácono',funcao:'vice'})).status).toBe(403);
 });
 test('17 · Somente Admin exclui cadastro, revoga sessão/convites e preserva o histórico',async({browser})=>{
  const convite=await conviteResponsaveis(a);
  expect((await action(c,'/coordenadores?/excluir',{id:idA,carteira:'0001'})).status).toBe(403);
  expect((await action(admin,'/coordenadores?/excluir',{id:idA,carteira:'errada'})).status).toBe(400);
  const p=await abrir(admin,'/coordenadores'),cartao=p.locator('article').filter({has:p.getByRole('heading',{name:'Estevão Miguel',exact:true})});
  await cartao.getByText('Excluir cadastro',{exact:true}).click();
  await cartao.getByLabel('Digite a carteira 0001 para confirmar',{exact:true}).fill('0001');
  await cartao.getByRole('button',{name:'Confirmar exclusão',exact:true}).click();
  await expect(cartao).toHaveCount(0);await expect(p.locator('main')).toContainText('Cadastro excluído');await p.close();
  expect((await a.request.get('/minha-area',{maxRedirects:0})).headers().location).toBe('/login');
  expect((await action(admin,'/coordenadores?/vincular',{id:idA,codigo:'05'})).status).toBe(404);
  const anon=await novo(browser);
  expect((await action(anon,'/login',{carteira:'0001',senha})).type).not.toBe('redirect');
  expect((await action(anon,convite+'?/salvar',{...base,carteira:'0401',cargo:'Presbítero',congregacao_id:igreja05})).status).toBe(410);
  expect((await p05.request.get('/eventos?inicio=2026-11-09&fim=2026-11-09')).status()).toBe(200);
  expect((await action(admin,'/coordenadores?/vincular',{id:idB,codigo:'05'})).status).toBe(200);
  await entrar(b,'0002');const bp=await abrir(b,'/escala?data=2026-11-09');await expect(bp.locator('main')).toContainText('Pb. Estevão Miguel');await bp.close();
  const lista=await igrejas(b);expect(lista.some(x=>x.id===igreja05)).toBe(true);
  const uid=await perfilId(b,'Responsável Cinco');
  expect((await action(admin,'/coordenadores?/excluir',{id:uid,carteira:'0201'})).status).toBe(404);
  await registrar(anon,novoGeral,'0001','Novo Cadastro Mesma Carteira','Pastor');
 });
 test('18 · Administração técnica mostra apenas integridade e problemas, sem catálogo',async()=>{
  const p=await abrir(admin,'/plataforma');
  await expect(p.getByRole('heading',{name:'Integridade do sistema',exact:true})).toBeVisible();
  await expect(p.getByRole('status')).toContainText('Banco local íntegro.');
  await expect(p.getByRole('heading',{name:'Problemas detectados',exact:true})).toBeVisible();
  await expect(p.locator('main')).toContainText('Nenhuma falha registrada.');
  await expect(p.locator('main time')).toHaveAttribute('datetime',/T/);
  await expect(p.locator('a[href="/configuracoes"]')).toHaveCount(0);
  await expect(p.locator('main')).not.toContainText(/Catálogo|Tipos de culto|Novo tipo de culto/);
  await p.getByRole('button',{name:'Atualizar verificação',exact:true}).click();
  await expect(p.getByRole('status')).toContainText('Banco local íntegro.');
  for(const rota of ['/configuracoes','/configuracoes?/novo','/configuracoes?/salvar']){
   const r=rota.includes('?')?await admin.request.post(rota,{form:{nome:'Tipo removido'},maxRedirects:0}):await admin.request.get(rota,{maxRedirects:0});
   expect(r.status()).toBe(403);
  }
  expect((await b.request.get('/plataforma',{maxRedirects:0})).status()).toBe(403);
  await p.setViewportSize({width:390,height:844});
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await p.screenshot({path:'test-results/integridade-sistema-mobile.png',fullPage:true});await p.close();
 });
 test('19 · Coordenador e Vice têm os mesmos acessos, gráfico compacto e aprovações reunidas',async({browser})=>{
  viceDesktop=await novo(browser);await entrar(viceDesktop,'0301');
  for(const ctx of [c,viceDesktop]){
   for(const rota of ['/','/eventos','/minha-area','/obreiros','/aprovacoes','/escala/gerar','/perfil'])expect((await ctx.request.get(rota)).status(),rota).toBe(200);
   const p=await abrir(ctx,'/');await p.waitForLoadState('networkidle');
   const grafico=p.locator('main [role=img]');expect((await grafico.boundingBox())!.height).toBeLessThanOrEqual(230);
   await expect(p.locator('#dados-mensais')).toBeHidden();await p.getByRole('button',{name:'Ver dados por mês',exact:true}).click();
   await expect(p.locator('#dados-mensais')).toBeVisible();await expect(p.locator('#dados-mensais tbody tr')).toHaveCount(12);
   await p.getByRole('button',{name:'Ocultar dados',exact:true}).click();await expect(p.locator('#dados-mensais')).toBeHidden();
   await expect(p.getByRole('link',{name:'Eventos na Área',exact:true})).toBeVisible();
   await p.goto(origem+'/eventos?inicio=2026-11-02&fim=2026-11-02');await expect(p.getByRole('heading',{name:'Eventos na Área',exact:true,level:1})).toBeVisible();
   await expect(p.locator('main')).toContainText('Polo:');await expect(p.locator('main')).toContainText('Dc. Obreiro Cinquenta Sete');
   await p.goto(origem+'/aprovacoes');await expect(p.getByRole('heading',{name:'Aprovações pendentes',exact:true,level:1})).toBeVisible();
   await expect(p.locator('main')).not.toContainText('Indicações dos Pbs');await expect(p.locator('main')).toContainText('Nenhuma aprovação pendente.');
   await p.close();
  }
  const id=await perfilId(c,'Obreiro Cinquenta Sete');
  expect((await action(c,'/obreiros/'+id+'?/salvar',{...base,carteira:'0102',nome:'Obreiro Cinquenta Sete',cargo:'Diácono',congregacao_id:igreja57,perfil:'obreiro',status:'pendente'})).status).toBe(200);
  const p=await abrir(viceDesktop,'/aprovacoes');await expect(p.getByRole('article')).toHaveCount(1);
  await p.getByRole('button',{name:'Aprovar acesso',exact:true}).click();await expect(p.getByRole('article')).toHaveCount(0);await p.close();
 });
 test('20 · Convites identificam Coordenador/Vice e responsáveis têm botões de evento e convite',async({browser})=>{
  for(const [ctx,identificacao] of [[viceDesktop,'Vice-Coordenador Vice de Teste'],[c,'Coordenador João Silva']] as const){
   const link=await conviteResponsaveis(ctx,true),anon=await novo(browser),p=await abrir(anon,link);
   await expect(p.locator('main')).toContainText('Convite do '+identificacao);await expect(p.locator('main')).toContainText('Seu acesso é liberado após seu cadastro.');await p.close();
  }
  const p=await abrir(p05,'/eventos');await p.waitForLoadState('networkidle');
  await expect(p.locator('#novo-evento')).toHaveCount(0);await p.getByRole('button',{name:'Cadastrar evento local',exact:true}).click();
  await expect(p.locator('#novo-evento')).toBeVisible();await p.screenshot({path:'test-results/responsavel-eventos-desktop.png',fullPage:true});
  await p.goto(origem+'/obreiros');await expect(p.locator('#conteudo')).toHaveAttribute('data-pronto','true');await p.getByRole('button',{name:'Convidar Obreiro',exact:true}).click();await expect(p.locator('#convite-obreiro')).toBeVisible();await p.close();
 });
 test('21 · Diácono e Auxiliar consultam todas as escalas e PDF da própria Área, sem editar',async({browser})=>{
  const outra=(await igrejas(b)).find(i=>i.id!==igreja05)!;expect(outra).toBeTruthy();
  segundoPb=await novo(browser);const link=await conviteResponsaveis(b,true);await registrar(segundoPb,link,'0501','Responsável Outra Igreja','Presbítero',outra.id);
  const eventoExtra=await evento(segundoPb,'Evento de outra congregação','2026-11-30');
  const extra=await evento(p05,'Evento da primeira congregação','2026-11-30');
  const uid=await perfilId(b,'Ana Teste');expect((await action(b,'/escala?/escalar',{culto_id:eventoExtra,usuario_id:uid})).status).toBe(200);
  const convite=await action(segundoPb,'/obreiros?/criarConvite',{perfil:'obreiro',congregacao_id:outra.id});
  auxiliar=await novo(browser);await registrar(auxiliar,convite.data.link,'0502','Auxiliar da Outra Igreja','Auxiliar Local',outra.id);
  for(const ctx of [worker,auxiliar]){
   const p=await abrir(ctx,'/escala?data=2026-11-30');await expect(p.locator('main')).toContainText('Evento de outra congregação');await expect(p.locator('main')).toContainText('Evento da primeira congregação');
   await expect(p.getByRole('button',{name:'Escalar',exact:true})).toHaveCount(0);await expect(p.getByRole('link',{name:'Gerar Escala Local',exact:true})).toHaveCount(0);
   await expect(p.getByLabel('Filtrar por congregação',{exact:true})).toBeVisible();
   const pdf=await ctx.request.get('/escala/pdf?data=2026-11-30');expect(pdf.status()).toBe(200);expect(textoPdfKit(await pdf.body())).toContain('Dc. Ana Teste');
   expect((await action(ctx,'/escala?/escalar',{culto_id:extra,usuario_id:uid})).status).toBe(403);
   await p.goto(origem+'/escala?data=2026-11-02');await expect(p.locator('main')).not.toContainText('Obreiro Cinquenta Sete');await p.close();
  }
  const p=await abrir(p05,'/escala?data=2026-11-30');await expect(p.locator('main')).not.toContainText('Evento de outra congregação');await p.close();
 });
 test('22 · Todos os perfis trocam senha sem a atual, veem os dois campos e invalidam sessões antigas',async({browser})=>{
  for(const [ctx,carteira,antiga] of [[admin,'900001','Admin-Teste-2026!'],[b,'0002',senha],[viceDesktop,'0301',senha],[p05,'0201',senha],[worker,'0202',senha]] as const){
   const obsoleta=await browser.newContext({storageState:await ctx.storageState()}),p=await abrir(ctx,'/perfil'),nova='SenhaNova-'+carteira+'-2026!';
   await p.waitForLoadState('networkidle');await expect(p.locator('input[name=atual]')).toHaveCount(0);
   expect((await action(ctx,'/perfil?/senha',{nova,nova2:'diferente'})).status).toBe(400);
   await p.getByLabel('Nova senha',{exact:true}).fill(nova);await p.getByLabel('Repita a nova senha',{exact:true}).fill(nova);
   await p.getByRole('button',{name:'Mostrar nova senha',exact:true}).click();await expect(p.getByLabel('Nova senha',{exact:true})).toHaveAttribute('type','text');
   await p.getByRole('button',{name:'Ocultar nova senha',exact:true}).click();await expect(p.getByLabel('Nova senha',{exact:true})).toHaveAttribute('type','password');
   await p.getByRole('button',{name:'Mostrar repita a nova senha',exact:true}).click();await expect(p.getByLabel('Repita a nova senha',{exact:true})).toHaveAttribute('type','text');
   await p.getByRole('button',{name:'Alterar senha',exact:true}).click();await expect(p.locator('main')).toContainText('Senha alterada.');
   expect((await obsoleta.request.get('/perfil',{maxRedirects:0})).headers().location).toBe('/login');await obsoleta.close();
   const novaSessao=await novo(browser);expect((await action(novaSessao,'/login',{carteira,senha:antiga})).type).not.toBe('redirect');await entrar(novaSessao,carteira,nova);await p.close();
  }
 });
 test('23 · Foto própria em todos os perfis, envio reduzido, persistência e bloqueio de arquivo inválido',async({browser})=>{
  const invalida=await worker.request.post('/perfil?/foto',{multipart:{foto:{name:'falsa.png',mimeType:'image/png',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')}},headers:{origin:origem,accept:'application/json','x-sveltekit-action':'true'}});expect(invalida.status()).toBe(400);
  expect((await p05.request.get('/perfil/foto?usuario_id=9999')).status()).toBe(404);
  for(const ctx of [admin,b,viceDesktop,p05,worker,auxiliar]){
   const p=await abrir(ctx,'/perfil');await p.waitForLoadState('networkidle');await p.getByLabel('Escolher foto',{exact:true}).setInputFiles('static/marca-demo.png');
   await p.getByRole('button',{name:'Salvar foto',exact:true}).click();await expect(p.locator('main')).toContainText('Foto de perfil atualizada.');
   const imagem=p.getByRole('img',{name:'Sua foto de perfil',exact:true});await expect(imagem).toBeVisible();
   const r=await ctx.request.get('/perfil/foto');expect(r.status()).toBe(200);expect(r.headers()['content-type']).toBe('image/jpeg');expect((await r.body()).length).toBeLessThan(512*1024);
   const identificacao=await ctx.request.get('/perfil/identificacao/pdf');expect(identificacao.status()).toBe(200);expect(identificacao.headers()['content-type']).toBe('application/pdf');
   if(ctx===worker)writeFileSync('test-results/identificacao-com-foto.pdf',await identificacao.body());
   await p.reload();await expect(p.getByRole('img',{name:'Sua foto de perfil',exact:true})).toBeVisible();
   await p.getByRole('button',{name:'Remover foto',exact:true}).click();await expect(p.locator('main')).toContainText('Foto removida.');await expect(p.getByRole('img',{name:'Sua foto de perfil',exact:true})).toHaveCount(0);
   expect((await ctx.request.get('/perfil/foto')).status()).toBe(404);await p.close();
  }
  const anon=await novo(browser);expect((await anon.request.get('/perfil/foto',{maxRedirects:0})).headers().location).toBe('/login');
 });
 test('24 · Após publicar, enviar aviso a todos da Área é opcional e chega a quem está online',async()=>{
  await evento(p05,'Evento para notificar a Área','2026-12-07');
  const wp=await abrir(worker,'/notificacoes');await expect(wp.locator('a[title="Notificações"]')).toHaveAttribute('aria-label','Notificações');await expect(wp.locator('main article')).toHaveCount(0);
  const p=await abrir(b,'/escala/gerar');await p.locator('input[name=inicio]').fill('2026-12-07');await p.locator('input[name=fim]').fill('2026-12-07');
  await p.getByRole('button',{name:'Calcular prévia',exact:true}).click();await expect(p.getByRole('heading',{name:'Prévia · 1 escala(s)',exact:true})).toBeVisible();
  await p.getByRole('button',{name:'Confirmar e publicar escala',exact:true}).click();
  await expect(p.locator('main')).toContainText('Agora você pode notificar os obreiros da área.');
  const linha=p.locator('section[aria-labelledby=publicacoes-titulo] article').filter({hasText:'07/12/2026'});publicacaoNotificada=await linha.locator('input[name=publicacao_id]').inputValue();
  for(const ctx of [b,p05,worker,segundoPb,auxiliar])expect((await(await ctx.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(0);
  await linha.getByRole('button',{name:'Enviar notificação a todos os obreiros',exact:true}).click();await expect(linha.getByText('Obreiros notificados',{exact:true})).toBeVisible();
  for(const ctx of [b,p05,worker,segundoPb,auxiliar])expect((await(await ctx.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(1);
  expect((await(await c.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(0);
  await wp.bringToFront();await wp.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(wp.locator('a[title="Notificações"]')).toHaveAttribute('aria-label','Notificações, 1 não lidas');
  await expect(wp.locator('main article')).toHaveCount(1);
  await p.reload();await expect(p.locator('section[aria-labelledby=publicacoes-titulo] article').filter({hasText:'07/12/2026'}).getByText('Obreiros notificados',{exact:true})).toBeVisible();
  await p.close();await wp.close();
 });
 test('25 · Permissões e repetição/concorrência impedem avisos fora da Área e mensagens duplicadas',async()=>{
  expect((await action(c,'/escala/gerar?/notificar',{publicacao_id:publicacaoNotificada})).status).toBe(403);
  expect((await action(worker,'/escala/gerar?/notificar',{publicacao_id:publicacaoNotificada})).status).toBe(403);
  const repetido=await action(b,'/escala/gerar?/notificar',{publicacao_id:publicacaoNotificada});expect(repetido.data.repetido).toBe(true);expect(repetido.data.enviadas).toBe(5);
  const auxiliarId=await perfilId(b,'Auxiliar da Outra Igreja');expect((await action(b,'/obreiros?/delegar',{id:auxiliarId,ativar:'1'})).status).toBe(200);
  expect((await action(auxiliar,'/escala/gerar?/notificar',{publicacao_id:publicacaoNotificada})).status).toBe(403);
  await evento(p05,'Segunda publicação para notificar','2026-12-08');
  const previa=await action(auxiliar,'/escala/gerar?/previa',{inicio:'2026-12-08',fim:'2026-12-08'});expect(previa.status).toBe(200);
  const confirmado=await action(auxiliar,'/escala/gerar?/confirmar',{inicio:'2026-12-08',fim:'2026-12-08',assinatura:previa.data.assinatura});expect(confirmado.status).toBe(200);segundaPublicacao=String(confirmado.data.publicacaoId);
  const respostas=await Promise.all([action(b,'/escala/gerar?/notificar',{publicacao_id:segundaPublicacao}),action(auxiliar,'/escala/gerar?/notificar',{publicacao_id:segundaPublicacao})]);
  expect(respostas.every(r=>r.status===200)).toBe(true);expect(respostas.filter(r=>r.data.repetido)).toHaveLength(1);
  expect((await(await worker.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(2);
  expect((await(await c.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(0);
 });
 test('26 · Cada obreiro vê e marca apenas seus avisos; abrir a escala marca como lida e persiste',async()=>{
  const p=await abrir(worker,'/notificacoes');await expect(p.locator('main article')).toHaveCount(2);
  const pp=await abrir(p05,'/notificacoes'),idDeOutro=await pp.locator('main article input[name=id]').first().inputValue();await pp.close();
  expect((await action(worker,'/notificacoes?/ler',{id:idDeOutro})).status).toBe(404);
  expect((await action(worker,'/notificacoes?/abrir',{id:idDeOutro})).status).toBe(404);
  await p.locator('main article').first().getByRole('button',{name:'Ver escala',exact:true}).click();await p.waitForURL('**/escala?data=2026-12-08');
  expect((await(await worker.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(1);
  await p.goto(origem+'/notificacoes');await expect(p.locator('#conteudo')).toHaveAttribute('data-pronto','true');
  await p.setViewportSize({width:390,height:844});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:'test-results/notificacoes-mobile.png',fullPage:true});
  await p.getByRole('button',{name:'Marcar todas como lidas',exact:true}).click();await expect(p.locator('a[title="Notificações"]')).toHaveAttribute('aria-label','Notificações');
  await p.reload();expect((await(await worker.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(0);expect((await(await p05.request.get('/notificacoes/contagem')).json()).naoLidas).toBe(2);
  await expect(p.locator('main article').getByText('Lida',{exact:true})).toHaveCount(2);await p.close();
  const r=await worker.request.get('/notificacoes/contagem');expect(r.headers()['cache-control']).toContain('no-store');
  expect((await admin.request.get('/notificacoes',{maxRedirects:0})).status()).toBe(403);
 });
 test('27 · Segurança: CSP, cookie privado e ausência de credenciais nas respostas',async({browser})=>{
  const anon=await novo(browser);
  const login=await anon.request.get('/login'),headers=login.headers();
  expect(headers['cache-control']).toContain('no-store');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('same-origin');
  expect(headers['permissions-policy']).toContain('geolocation=()');
  const csp=headers['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("form-action 'self'");
  const scripts=csp.split(';').find(s=>s.trim().startsWith('script-src '));
  expect(scripts).toContain("'nonce-");
  expect(scripts).not.toContain('unsafe-inline');expect(scripts).not.toContain('unsafe-eval');
  for(const rota of ['/','/coordenadores','/plataforma','/perfil/foto','/escala/pdf','/notificacoes/contagem']){
   const r=await anon.request.get(rota,{maxRedirects:0});expect(r.status(),rota).toBe(303);expect(r.headers().location).toBe('/login');
  }
  const cookie=(await admin.cookies()).find(c=>c.name==='sessao');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');
  for(const rota of ['/__data.json','/perfil/__data.json','/coordenadores/__data.json','/plataforma/__data.json']){
   const r=await admin.request.get(rota);expect(r.status()).toBe(200);
   const body=await r.text();expect(body).not.toMatch(/senha_hash|token_cifrado|SESSAO_SEGREDO|DATABASE_URL|\b[a-f0-9]{32}:[a-f0-9]{128}\b/);
  }
 });
 test('28 · Redefinição gera senha individual, revoga acessos e exige senha pessoal diferente',async({browser})=>{
  const id=await perfilId(b,'Auxiliar da Outra Igreja'),rota='/obreiros/'+id;
  for(const ctx of [worker,c])expect((await action(ctx,rota+'?/redefinirSenha',{})).status).toBe(403);
  const p=await abrir(b,rota);await p.getByRole('button',{name:'Gerar senha temporária',exact:true}).click();
  const output=p.getByLabel('Senha temporária',{exact:true});await expect(output).toBeVisible();
  const primeira=(await output.textContent())!;expect(primeira).toMatch(/^[\w-]{24}$/);
  expect((await auxiliar.request.get('/perfil',{maxRedirects:0})).headers().location).toBe('/login');
  await p.reload();await expect(output).toHaveCount(0);
  await p.getByRole('button',{name:'Gerar senha temporária',exact:true}).click();await expect(output).toBeVisible();
  const segunda=(await output.textContent())!;expect(segunda).toMatch(/^[\w-]{24}$/);expect(segunda).not.toBe(primeira);
  const temporario=await novo(browser);
  for(const senha of ['demo',primeira])expect((await action(temporario,'/login',{carteira:'0502',senha})).type).not.toBe('redirect');
  expect((await action(temporario,'/login',{carteira:'0502',senha:segunda})).location).toBe('/trocar-senha');
  expect((await temporario.request.get('/escala',{maxRedirects:0})).headers().location).toBe('/trocar-senha');
  expect((await action(temporario,'/trocar-senha',{nova:segunda,nova2:segunda})).status).toBe(400);
  const obsoleta=await browser.newContext({storageState:await temporario.storageState()});
  expect((await action(temporario,'/trocar-senha',{nova:'Pessoal-Recuperada-2026!',nova2:'Pessoal-Recuperada-2026!'})).type).toBe('redirect');
  expect((await temporario.request.get('/perfil')).status()).toBe(200);
  expect((await obsoleta.request.get('/perfil',{maxRedirects:0})).headers().location).toBe('/login');
  const retorno=await novo(browser);expect((await action(retorno,'/login',{carteira:'0502',senha:segunda})).type).not.toBe('redirect');
  await entrar(retorno,'0502','Pessoal-Recuperada-2026!');await obsoleta.close();await p.close();
 });
 test('29 · Cadastro oculta disponibilidade da coordenação e do Presbítero e mantém os demais cargos',async({browser})=>{
  const coordenacao=await novo(browser),p=await abrir(coordenacao,novoGeral);
  await expect(p.locator('.register-page')).toHaveAttribute('data-pronto','true');
  await p.getByLabel('Nº da carteira de membro',{exact:true}).fill('9901');
  await p.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(p.getByLabel('Nome completo',{exact:true})).toBeVisible();
  for(const funcao of ['coordenador','vice']){
   await p.getByLabel('Função',{exact:true}).selectOption(funcao);
   for(const cargo of ['Pastor','Evangelista','Presbítero']){
    await p.getByLabel('Cargo',{exact:true}).selectOption(cargo);
    await expect(p.locator('input[name=disp]')).toHaveCount(0);
    await expect(p.getByText('Disponibilidade para ser escalado',{exact:true})).toHaveCount(0);
   }
  }
  await p.close();

  const responsavel=await novo(browser),link=await conviteResponsaveis(c),r=await abrir(responsavel,link);
  await expect(r.locator('.register-page')).toHaveAttribute('data-pronto','true');
  await r.getByLabel('Nº da carteira de membro',{exact:true}).fill('9902');
  await r.getByRole('button',{name:'Continuar',exact:true}).click();
  await r.getByLabel('Cargo',{exact:true}).selectOption('Diácono');
  await expect(r.locator('input[name=disp]')).toHaveCount(21);
  await r.getByLabel('Cargo',{exact:true}).selectOption('Presbítero');
  await expect(r.locator('input[name=disp]')).toHaveCount(0);
  await r.getByLabel('Nome completo',{exact:true}).fill('Cadastro para validação');
  await r.getByLabel('Data de nascimento',{exact:true}).fill(base.nascimento);
  await r.getByLabel('Congregação',{exact:true}).selectOption(igreja57);
  await r.getByLabel('WhatsApp',{exact:true}).fill('123');
  await r.getByLabel('Senha',{exact:true}).fill(senha);
  await r.getByLabel('Repita a senha',{exact:true}).fill(senha);
  await r.getByRole('button',{name:'Concluir meu cadastro',exact:true}).click();
  await expect(r.locator('main')).toContainText('Informe o WhatsApp com DDD.');
  await expect(r.getByLabel('Cargo',{exact:true})).toHaveValue('Presbítero');
  await expect(r.locator('input[name=disp]')).toHaveCount(0);
  await r.getByLabel('Cargo',{exact:true}).selectOption('Diácono');
  await expect(r.locator('input[name=disp]')).toHaveCount(21);
  await r.close();

  const convite=await action(c,'/obreiros?/criarConvite',{perfil:'obreiro',congregacao_id:igreja57});
  expect(convite.status).toBe(200);
  const obreiro=await novo(browser),o=await abrir(obreiro,convite.data.link);
  await expect(o.locator('.register-page')).toHaveAttribute('data-pronto','true');
  await o.getByLabel('Nº da carteira de membro',{exact:true}).fill('9903');
  await o.getByRole('button',{name:'Continuar',exact:true}).click();
  for(const cargo of ['Diácono','Auxiliar Oficial','Auxiliar Local']){
   await o.getByLabel('Cargo',{exact:true}).selectOption(cargo);
   await expect(o.getByText('Disponibilidade para ser escalado',{exact:true})).toBeVisible();
   await expect(o.locator('input[name=disp]')).toHaveCount(21);
   await o.locator('input[name=disp][value="1-noite"]').check();
   await expect(o.locator('input[name=disp][value="1-noite"]')).toBeChecked();
  }
  await o.close();
 });
 test('30 · Meu Perfil segue o modelo, mantém vínculo fixo e exporta somente a própria identificação',async({browser})=>{
  for(const ctx of [admin,c,viceDesktop,p05,worker]){
   const p=await abrir(ctx,'/perfil');await expect(p.getByRole('heading',{name:'Meu Perfil',level:1,exact:true})).toBeVisible();
   await expect(p.getByLabel('Nº da Carteira de membro',{exact:true})).toHaveAttribute('readonly','');
   await expect(p.locator('main')).not.toContainText(/Email|E-mail|Login social|Login|Chave senha|Sessões|2FA/);
   await expect(p.getByRole('link',{name:'Exportar identificação',exact:true})).toHaveAttribute('href','/perfil/identificacao/pdf');
   if(ctx!==admin){await expect(p.getByLabel('Congregação',{exact:true})).toHaveAttribute('readonly','');await expect(p.getByLabel('Área',{exact:true})).toHaveAttribute('readonly','');}
   const pdf=await ctx.request.get('/perfil/identificacao/pdf'),body=await pdf.body();expect(pdf.status()).toBe(200);expect(pdf.headers()['content-disposition']).toContain('attachment');expect(pdf.headers()['cache-control']).toContain('no-store');
   expect(body.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1);
   expect(textoPdfKit(body)).toContain(await p.getByLabel('Nº da Carteira de membro',{exact:true}).inputValue());
   await p.close();
  }
  const p=await abrir(worker,'/perfil'),igreja=await p.getByLabel('Congregação',{exact:true}).inputValue(),area=await p.getByLabel('Área',{exact:true}).inputValue(),carteira=await p.getByLabel('Nº da Carteira de membro',{exact:true}).inputValue(),cargo=await p.getByLabel('Cargo ministerial',{exact:true}).inputValue();
  const nome=await p.getByLabel('Nome completo',{exact:true}).inputValue(),disp=await p.locator('input[name=disp]:checked').evaluateAll(itens=>itens.map(i=>(i as HTMLInputElement).value));
  expect((await action(worker,'/perfil?/dados',{nome,nascimento:base.nascimento,whatsapp:base.whatsapp,disp,congregacao_id:igreja57,area_id:'999999',carteira:'99999999',cargo:'Pastor',perfil:'admin'})).status).toBe(200);
  await p.reload();await expect(p.getByLabel('Congregação',{exact:true})).toHaveValue(igreja);await expect(p.getByLabel('Área',{exact:true})).toHaveValue(area);await expect(p.getByLabel('Nº da Carteira de membro',{exact:true})).toHaveValue(carteira);await expect(p.getByLabel('Cargo ministerial',{exact:true})).toHaveValue(cargo);
  const pdf=await worker.request.get('/perfil/identificacao/pdf?usuario_id=1');const bytes=await pdf.body();expect(pdf.status()).toBe(200);expect(textoPdfKit(bytes)).toContain(carteira);expect(textoPdfKit(bytes)).not.toContain('900001');writeFileSync('test-results/identificacao-obreiro.pdf',bytes);
  await p.setViewportSize({width:1440,height:1100});await p.screenshot({path:'test-results/perfil-demo-desktop.png',fullPage:true});
  await p.setViewportSize({width:390,height:844});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:'test-results/perfil-demo-mobile.png',fullPage:true});await p.close();
  const anon=await novo(browser);expect((await anon.request.get('/perfil/identificacao/pdf',{maxRedirects:0})).headers().location).toBe('/login');
 });
});
