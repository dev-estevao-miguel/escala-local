import PDFDocument from 'pdfkit';
import logo from '#lib/assets/marca-demo.png?inline';
import { PERFIS, type Perfil } from '#lib/util';

export interface Identificacao {
 nome: string;
 carteira: string;
 cargo: string;
 perfil: Perfil;
 area: string | null;
 congregacao: string | null;
 foto: string | null;
}

/** Cartão de identificação interna, 90 x 60 mm, com os dados da própria conta. */
export function gerarIdentificacao(dados: Identificacao): Promise<Buffer> {
 const mm = 72 / 25.4, largura = 90 * mm, altura = 60 * mm;
 const doc = new PDFDocument({size:[largura,altura],margin:0,bufferPages:true,info:{Title:'Identificação do obreiro - DEMO',Author:'Escala Local',Creator:'Escala Local'}});
 const partes: Buffer[] = [];
 doc.on('data',(parte:Buffer)=>partes.push(parte));
 const pronto = new Promise<Buffer>((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(partes)));doc.on('error',reject);});
 const azul='#027aa8',marinho='#00374f',cinza='#657583',margem=12;

 doc.rect(0,0,largura,altura).fill('#ffffff');
 doc.rect(0,0,largura,39).fill(marinho);
 doc.roundedRect(margem-1,6,27,27,4).fill('#ffffff');
 doc.image(logo,margem,7,{width:25,height:25});
 doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('DEMO',margem+32,9,{width:150,lineBreak:false});
 doc.font('Helvetica').fontSize(6.7).text('IDENTIFICAÇÃO DO OBREIRO',margem+32,24,{width:190,lineBreak:false});
 doc.rect(0,39,largura,2).fill(azul);

 const fotoX=largura-64,fotoY=51,fotoW=52,fotoH=66,textoW=fotoX-margem-10;
 doc.roundedRect(fotoX,fotoY,fotoW,fotoH,4).fill('#eef3f7');
 if(dados.foto){
  try{doc.save().roundedRect(fotoX,fotoY,fotoW,fotoH,4).clip();doc.image(dados.foto,fotoX,fotoY,{cover:[fotoW,fotoH],align:'center',valign:'center'});doc.restore();}
  catch{doc.restore();iniciais();}
 }else iniciais();

 function iniciais(){
  const nome=dados.nome.split(/\s+/).filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  doc.fillColor(azul).font('Helvetica-Bold').fontSize(17).text(nome,fotoX,fotoY+24,{width:fotoW,align:'center',lineBreak:false});
 }
 function ajustar(texto:string,x:number,y:number,w:number,h:number,tamanho:number,minimo=6.1){
  doc.font('Helvetica-Bold').fontSize(tamanho);
  while(doc.heightOfString(texto,{width:w,lineGap:0})>h&&tamanho>minimo){tamanho-=.25;doc.fontSize(tamanho);}
  doc.text(texto,x,y,{width:w,height:h,ellipsis:true,lineGap:0});
 }
 doc.fillColor(cinza).font('Helvetica').fontSize(5.6).text('NOME',margem,50,{width:textoW,lineBreak:false});
 doc.fillColor(marinho);ajustar(dados.nome,margem,60,textoW,29,11);
 doc.fillColor(cinza).font('Helvetica').fontSize(5.6).text('Nº DA CARTEIRA DE MEMBRO',margem,94,{width:textoW,lineBreak:false});
 doc.fillColor(azul);ajustar(dados.carteira,margem,104,textoW,15,11);

 const y=126,cargoW=110,areaX=132;
 doc.fillColor(cinza).font('Helvetica').fontSize(5.5).text('CARGO / FUNÇÃO',margem,y,{width:cargoW,lineBreak:false});
 const cargoFuncao=[dados.cargo,dados.perfil!=='obreiro'?PERFIS[dados.perfil]:null].filter(Boolean).join(' - ')||PERFIS[dados.perfil];
 doc.fillColor(marinho);ajustar(cargoFuncao,margem,y+9,cargoW,17,7.2);
 doc.fillColor(cinza).font('Helvetica').fontSize(5.5).text('ÁREA / CONGREGAÇÃO',areaX,y,{width:largura-areaX-margem,lineBreak:false});
 const vinculo=dados.area?[`Área ${dados.area}`,dados.congregacao].filter(Boolean).join(' - '):dados.perfil==='admin'?'Administração geral':'Aguardando vinculação';
 doc.fillColor(marinho);ajustar(vinculo,areaX,y+9,largura-areaX-margem,19,6.8);
 doc.moveTo(margem,157).lineTo(largura-margem,157).strokeColor('#dfe7ed').lineWidth(.5).stroke();
 doc.fillColor(cinza).font('Helvetica').fontSize(5).text('Identificação interna - Escala Local',margem,162,{width:largura-2*margem,lineBreak:false});
 doc.end();
 return pronto;
}
