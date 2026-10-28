import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const root=resolve('build/client');
if(!existsSync(resolve(root,'service-worker.js')))throw new Error('Execute npm run build antes de verificar o PWA.');
const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer((req,res)=>{
  if(req.url==='/'){
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html lang="pt-BR"><title>Verificação PWA</title><link rel="manifest" href="/manifest.webmanifest"><script>navigator.serviceWorker.register("/service-worker.js")</script><h1>Verificação PWA</h1></html>');return;
  }
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep)){res.statusCode=403;res.end();return;}
  try{res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(readFileSync(file));}
  catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext(),page=await context.newPage();
  const origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(origin);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const paths=await page.evaluate(async()=>{const paths=[];for(const name of await caches.keys()){for(const key of await (await caches.open(name)).keys())paths.push(new URL(key.url).pathname);}return paths;});
  assert.ok(paths.includes('/offline.html'));
  assert.ok(!paths.includes('/login')&&!paths.includes('/')&&!paths.includes('/perfil'),'Páginas pessoais não podem entrar no cache');
  await context.setOffline(true);
  await page.goto(origin+'/verificacao-sem-conexao');
  assert.equal(await page.locator('h1').textContent(),'Você está sem conexão');
  console.log('PWA validado no Chrome: service worker ativo, arquivos estáticos no cache e tela offline disponível sem armazenar páginas pessoais.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
