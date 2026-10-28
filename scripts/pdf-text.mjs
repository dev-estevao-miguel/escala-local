import {inflateSync} from 'node:zlib';
/** Leitor mínimo dos trechos de texto emitidos pelo PDFKit, exclusivo dos testes. */
export function textoPdfKit(buffer){
 const raw=buffer.toString('latin1'),trechos=[];
 for(const m of raw.matchAll(/stream\r?\n/g)){
  const inicio=m.index+m[0].length,fim=raw.indexOf('endstream',inicio);
  if(fim<0)continue;
  let texto;
  try{texto=inflateSync(buffer.subarray(inicio,fim)).toString('latin1');}catch{texto=raw.slice(inicio,fim);}
  for(const t of texto.matchAll(/\[((?:[^\]]|\][^\sT])*)\]\s*TJ/g)){
   trechos.push([...t[1].matchAll(/<([a-f\d]+)>/gi)].map(h=>Buffer.from(h[1],'hex').toString('latin1')).join(''));
  }
 }
 return trechos.join('\n');
}
