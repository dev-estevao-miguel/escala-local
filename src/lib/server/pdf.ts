import PDFDocument from 'pdfkit';
import logo from '#lib/assets/marca-demo.png?inline';
import { nomeNaEscala, IGREJA, DIAS_SEMANA, SIGLA, diaSemana, formatarData, type Area, type Resposta } from '#lib/util';
export interface CultoPdf {hora_inicio:string;hora_fim:string;congregacao:string;ponto:string|null;tipo:string;codigo_cc?:string;tema:string;cancelado:number;escalados:{nome:string;cargo:string;resposta:Resposta}[]}
export interface DiaPdf {data:string;cultos:CultoPdf[]}
/** Estrutura do escala.pdf de referência: Escalado / CC / Local, agrupados por data e horário. */
export function gerarPdfSemana({area,dias,congregacao}:{area:Area;dias:DiaPdf[];congregacao:string|null}):Promise<Buffer>{
 const doc=new PDFDocument({size:'A4',margin:32,bufferPages:true,info:{Title:`Lista Local de Culto - ${SIGLA} - Área ${area.codigo}`,Creator:'Escala Local'}});
 const partes:Buffer[]=[];doc.on('data',(p:Buffer)=>partes.push(p));
 const pronto=new Promise<Buffer>((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(partes)));doc.on('error',reject);});
 const azul='#053d6c',marinho='#0c1d48',cinza='#e6edf4';const margem=32,largura=(doc.page.width-2*margem-18)/2,limite=doc.page.height-32;
 let coluna=0,y=118;const x=()=>margem+coluna*(largura+18);
 function cabecalho(continuacao=false){
  doc.image(logo,margem,24,{width:43,height:43});doc.fillColor(marinho).font('Helvetica-Bold').fontSize(12).text('LISTA LOCAL DE CULTO',margem+52,28,{width:420});doc.fontSize(8).font('Helvetica').text(IGREJA,margem+52,46,{width:420});
  doc.font('Helvetica-Bold').text(`Área ${area.codigo} · ${area.polo}${continuacao?' · continuação':''}`,margem+52,59,{width:420});doc.font('Helvetica').text(`${formatarData(dias[0].data)} a ${formatarData(dias.at(-1)!.data)}${congregacao?' · '+congregacao:''}`,margem,83,{width:530});
  doc.moveTo(margem,103).lineTo(doc.page.width-margem,103).strokeColor('#e2231a').lineWidth(1.5).stroke();
 }
 function tabela(){doc.rect(x(),y,largura,16).fill(azul);doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);doc.text('Escalado',x()+4,y+4,{width:largura*.53});doc.text('CC',x()+largura*.56,y+4,{width:30});doc.text('Local',x()+largura*.70,y+4,{width:largura*.28});y+=16;}
 function espaco(h:number){if(y+h<=limite)return false;if(coluna===0){coluna=1;y=118;}else{doc.addPage();coluna=0;y=118;cabecalho(true);}tabela();return true;}
 cabecalho();tabela();
 for(const dia of dias){
  const grupos=new Map<string,CultoPdf[]>();for(const c of dia.cultos.filter(c=>!c.cancelado)){const g=grupos.get(c.hora_inicio)||[];g.push(c);grupos.set(c.hora_inicio,g);}
  if(!grupos.size)continue;
  for(const [hora,cultos] of grupos){
   const titulo=`${DIAS_SEMANA[diaSemana(dia.data)]}, ${formatarData(dia.data)} · ${hora}`;
   const faixa=()=>{doc.rect(x(),y,largura,16).fill(cinza);doc.fillColor(marinho).font('Helvetica-Bold').fontSize(7.5).text(titulo,x()+4,y+4,{width:largura-8});y+=16;};
   espaco(45);faixa();
   for(const c of cultos){
    const pessoas=c.escalados.length?c.escalados:[{nome:'A definir',cargo:''}];
    for(const e of pessoas){const local=c.ponto||c.congregacao,cc=c.codigo_cc||'—';
     const textos=[nomeNaEscala(e),cc,local],widths=[largura*.53,largura*.12,largura*.30];doc.font('Helvetica').fontSize(8);
     const h=Math.max(14,...textos.map((t,i)=>doc.heightOfString(t,{width:widths[i]})+8));
     if(espaco(h+16))faixa();
     doc.fillColor('#1f2937').font('Helvetica').fontSize(8);doc.text(nomeNaEscala(e),x()+4,y+4,{width:widths[0]});doc.text(cc,x()+largura*.56,y+4,{width:widths[1]});doc.text(local,x()+largura*.70,y+4,{width:widths[2]});
     y+=h;doc.moveTo(x(),y).lineTo(x()+largura,y).strokeColor('#e5e7eb').lineWidth(.4).stroke();
    }
   }
  }
 }
 if(!dias.some(d=>d.cultos.some(c=>!c.cancelado)))doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text('Nenhum culto previsto neste período.',x()+4,y+12,{width:largura-8});
 doc.end();return pronto;
}
