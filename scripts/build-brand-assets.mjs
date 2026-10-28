import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

// Exportação mecânica dos ícones a partir do PNG original, sem redesenhar a marca.
const original=readFileSync(new URL('../static/marca-demo.png',import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  for(const [nome,tamanho,fundo,margem] of [
    ['favicon-demo.png',64,null,0],
    ['icone-demo-192.png',192,'#ffffff',0.08],
    ['icone-demo-512.png',512,'#ffffff',0.08],
    ['icone-demo-maskable.png',512,'#ffffff',0.22],
    ['apple-touch-demo.png',180,'#ffffff',0.08]
  ]){
    const base64=await page.evaluate(async({src,tamanho,fundo,margem})=>{
      const img=new Image();img.src=src;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=tamanho;
      const ctx=canvas.getContext('2d');
      if(fundo){ctx.fillStyle=fundo;ctx.fillRect(0,0,tamanho,tamanho);}
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const m=Math.round(tamanho*margem);
      ctx.drawImage(img,m,m,tamanho-2*m,tamanho-2*m);
      return canvas.toDataURL('image/png').split(',')[1];
    },{src:`data:image/png;base64,${original.toString('base64')}`,tamanho,fundo,margem});
    writeFileSync(new URL(`../static/${nome}`,import.meta.url),Buffer.from(base64,'base64'));
    console.log(`${nome}: ${tamanho} × ${tamanho}`);
  }
}finally{await browser.close();}
