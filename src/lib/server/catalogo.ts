import dados from '../../../dados/congregacoes-demo.json';

// Versão DEMO: sem consulta a catálogo externo; usa apenas dados/congregacoes-demo.json (fictício).
export const FONTE_CATALOGO='';
export interface IgrejaCatalogo {codigo:string;nome:string;area:string;polo:string;endereco:string;maps:string;sede:boolean;agenda:{culto:string;quando:string}[]}
const copia:IgrejaCatalogo[]=dados.areas.flatMap(a=>a.congregacoes.map(c=>({...c,area:a.codigo,polo:a.polo})));
let cache:{itens:IgrejaCatalogo[];quando:number;online:boolean}|undefined;
let consulta:Promise<NonNullable<typeof cache>>|undefined;
const limite=(v:unknown,n=300)=>typeof v==='string'?v.slice(0,n):'';
const linkSeguro=(v:unknown)=>{const s=limite(v,1000);try{return new URL(s).protocol==='https:'?s:'';}catch{return '';}};

export async function lerCatalogo(){
  if(cache&&Date.now()-cache.quando<15*60_000)return cache;
  if(consulta)return consulta;
  consulta=(async()=>{
    try{
      if(!FONTE_CATALOGO)throw new Error('Catálogo online desativado');
      const resposta=await fetch(FONTE_CATALOGO,{signal:AbortSignal.timeout(7000),headers:{Accept:'text/html'}});
      if(!resposta.ok)throw new Error('Catálogo indisponível');
      const html=await resposta.text();
      // Apenas JSON é interpretado; scripts do site externo nunca são executados.
      const trecho=html.match(/\b(?:var|const|let)\s+\w+\s*=\s*(\[\{"cod":[\s\S]*?\}\]);/);
      if(!trecho)throw new Error('Formato do catálogo alterado');
      const registros:unknown=JSON.parse(trecho[1]);
      if(!Array.isArray(registros)||registros.length<10||registros.length>5000)throw new Error('Catálogo inválido');
      const itens:IgrejaCatalogo[]=registros.flatMap(r=>{
        if(!r||typeof r!=='object')return [];
        const c=r as Record<string,unknown>;
        if(!/^\d{4,8}$/.test(String(c.cod))||!/^\d{1,3}$/.test(String(c.area)))return [];
        return [{codigo:String(c.cod),nome:limite(c.nome,180),area:String(c.area).padStart(2,'0'),polo:limite(c.polo,180),endereco:limite(c.end,600),maps:linkSeguro(c.url),sede:!!c.sede,
          agenda:Array.isArray(c.ag)?c.ag.filter((a:unknown)=>Array.isArray(a)&&a.length===2).slice(0,30).map((a:unknown[])=>({culto:limite(a[0],120),quando:limite(a[1],150)})):[]}];
      });
      if(!itens.length)throw new Error('Catálogo vazio');
      cache={itens,quando:Date.now(),online:true};
    }catch{cache={itens:cache?.itens??copia,quando:Date.now(),online:false};}
    return cache;
  })().finally(()=>{consulta=undefined;});
  return consulta;
}
