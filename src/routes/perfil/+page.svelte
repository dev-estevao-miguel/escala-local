<script lang="ts">
 import { enhance } from '$app/forms';
 import Aviso from '#lib/componentes/Aviso.svelte';
 import GradeDisponibilidade from '#lib/componentes/GradeDisponibilidade.svelte';
 import CampoSenha from '#lib/componentes/CampoSenha.svelte';
 import FotoPerfil from '#lib/componentes/FotoPerfil.svelte';
 import Icone from '#lib/componentes/Icone.svelte';
 import { PERFIS, CARGOS, ehAdminGeral, formatarData } from '#lib/util';

 let { data, form } = $props();
 const u = $derived(data.user!);
 const aviso = (secao: string) => (form?.secao === secao ? form : null);
</script>

<svelte:head><title>Meu Perfil · Escala Local</title></svelte:head>
<div class="perfil-pagina">
 <div class="perfil-cabecalho"><h1 class="titulo">Meu Perfil</h1><a class="btn btn-secundario" href="/perfil" aria-label="Atualizar meu perfil"><Icone nome="perfil" tamanho={17}/>Atualizar</a></div>
 <nav class="perfil-navegacao" aria-label="Seções do meu perfil"><a href="#dados" class="atual">Dados</a><a href="#senha">Alterar senha</a></nav>

 <section class="perfil-cartao" aria-labelledby="dados-titulo">
  <header class="perfil-topo">
   <div class="perfil-identidade"><span class="perfil-funcao">{u.cargo?u.cargo+' · ':''}{PERFIS[u.perfil]}</span><h2 id="dados-titulo">{u.nome}</h2><p>Nº da Carteira de membro <strong>{u.carteira}</strong></p></div>
   <FotoPerfil compacto versao={u.foto_versao??0} nome={u.nome} form={aviso('foto')}/>
  </header>

  <form id="dados" method="POST" action="?/dados" use:enhance={()=>({update})=>update({reset:false})}>
   <Aviso form={aviso('dados')}/>
   <div class="perfil-campos">
    <label class="rotulo" for="perfil-nome">Nome completo<input class="campo" id="perfil-nome" name="nome" value={data.cadastro.nome} required minlength="3" maxlength="100" autocomplete="name"/></label>
    <label class="rotulo" for="perfil-carteira">Nº da Carteira de membro<input class="campo perfil-fixo" id="perfil-carteira" value={u.carteira} readonly aria-readonly="true"/></label>
    <div class="perfil-dupla">
     <label class="rotulo" for="perfil-nascimento">Data de nascimento<input class="campo" id="perfil-nascimento" name="nascimento" type="date" value={data.cadastro.nascimento??''} autocomplete="bday"/></label>
     <label class="rotulo" for="whatsapp">WhatsApp<input class="campo" id="whatsapp" name="whatsapp" type="tel" value={data.whatsapp} placeholder="(81) 9 9999-9999" autocomplete="tel"/></label>
    </div>
    {#if ehAdminGeral(u)}<label class="rotulo" for="perfil-cargo">Cargo ministerial<select class="campo" id="perfil-cargo" name="cargo" value={u.cargo}><option value="">Não informado</option>{#each CARGOS as c (c.nome)}<option value={c.nome}>{c.nome}</option>{/each}</select></label>{/if}
   </div>

   {#if !ehAdminGeral(u)}
    <section class="perfil-painel" aria-labelledby="congregacao-titulo">
     <h2 id="congregacao-titulo">Informações da congregação</h2>
     <div class="perfil-painel-conteudo"><p class="perfil-ajuda">Seu vínculo é definido pelo responsável e pela coordenação da área.</p><div class="perfil-campos">
      <label class="rotulo" for="perfil-area">Área<input class="campo perfil-fixo" id="perfil-area" value={data.area?'Área '+data.area.codigo:'Aguardando vinculação'} readonly aria-readonly="true"/></label>
      <label class="rotulo" for="perfil-congregacao">Congregação<input class="campo perfil-fixo" id="perfil-congregacao" value={u.congregacao||'Sem congregação vinculada'} readonly aria-readonly="true"/></label>
      <div class="perfil-dupla"><label class="rotulo" for="perfil-cargo">Cargo ministerial<input class="campo perfil-fixo" id="perfil-cargo" value={u.cargo||'Não informado'} readonly/></label><label class="rotulo" for="perfil-funcao">Perfil no sistema<input class="campo perfil-fixo" id="perfil-funcao" value={PERFIS[u.perfil]} readonly/></label></div>
     </div></div>
    </section>
    <details class="perfil-disponibilidade" open><summary>Disponibilidade para ser escalado</summary><div class="mt-4"><GradeDisponibilidade selecionados={data.disponibilidade}/><p class="perfil-ajuda mt-2">O sistema só irá lhe escalar nos dias selecionados como disponível.</p></div></details>
   {/if}
   <button class="btn btn-primario perfil-salvar">Salvar</button>
  </form>

  <div class="perfil-acoes"><a class="btn btn-secundario" href="/perfil/identificacao/pdf" download data-sveltekit-reload><Icone nome="baixar" tamanho={18}/>Exportar identificação</a><a class="btn btn-secundario" href="#senha">Alterar senha</a></div>
 </section>

 <form id="senha" method="POST" action="?/senha" use:enhance class="perfil-cartao perfil-senha">
  <h2>Alterar senha</h2><p class="perfil-ajuda">Escolha uma senha pessoal com pelo menos 8 caracteres.</p><Aviso form={aviso('senha')}/>
  <div class="perfil-dupla"><div><CampoSenha id="nova" name="nova" rotulo="Nova senha" minlength={8}/></div><div><CampoSenha id="nova2" name="nova2" rotulo="Repita a nova senha" minlength={8}/></div></div>
  <button class="btn btn-secundario mt-4">Alterar senha</button>
 </form>

 {#if !ehAdminGeral(u)}<section class="perfil-cartao" aria-labelledby="ausencias-titulo"><h2 id="ausencias-titulo">Datas em que não posso ser escalado</h2><p class="perfil-ajuda">Ex.: viagem, trabalho ou outro compromisso.</p><Aviso form={aviso('indisponivel')}/>
  {#each data.indisponibilidades as i (i.id)}<div class="perfil-ausencia"><span>{formatarData(i.inicio)}{i.fim!==i.inicio?' a '+formatarData(i.fim):''}{i.motivo?' · '+i.motivo:''}</span><form method="POST" action="?/removerIndisponivel" use:enhance><input type="hidden" name="id" value={i.id}/><button class="btn-link text-sm text-red-700">Remover</button></form></div>{/each}
  <form method="POST" action="?/indisponivel" use:enhance class="perfil-campos mt-4"><div class="perfil-dupla"><label class="rotulo" for="ind-ini">De<input class="campo" id="ind-ini" name="inicio" type="date" min={data.hoje} required/></label><label class="rotulo" for="ind-fim">Até<input class="campo" id="ind-fim" name="fim" type="date" min={data.hoje}/></label></div><input class="campo" name="motivo" placeholder="Motivo (opcional)" aria-label="Motivo"/><button class="btn btn-secundario">Adicionar</button></form>
 </section>{/if}
</div>

<style>
 .perfil-pagina{max-width:1000px;margin:0 auto}.perfil-cabecalho{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.perfil-cabecalho .btn{font-size:12px;min-height:36px}.perfil-navegacao{display:flex;justify-content:center;margin:0 0 22px}.perfil-navegacao a{padding:9px 17px;font-size:13px;border:1px solid #0799c8;color:#027aa8;background:#fff}.perfil-navegacao a:first-child{border-radius:4px 0 0 4px}.perfil-navegacao a:last-child{border-radius:0 4px 4px 0;border-left:0}.perfil-navegacao .atual{background:#006c87;color:#fff}.perfil-cartao{padding:24px;border:1px solid #e0e4e9;border-radius:7px;background:#fff;box-shadow:0 1px 2px #142d4010;margin-bottom:20px}.perfil-topo{display:flex;justify-content:space-between;align-items:center;gap:24px;padding-bottom:26px;margin-bottom:26px;border-bottom:1px solid #edf0f3}.perfil-identidade{min-width:0}.perfil-identidade h2{font-size:22px;font-weight:650;color:#16384f;line-height:1.35;margin:12px 0 7px;overflow-wrap:anywhere}.perfil-identidade p{font-size:12px;color:#687585;line-height:1.8}.perfil-identidade strong{display:block;font-size:15px;color:#244458;letter-spacing:.035em}.perfil-funcao{font-size:11px;padding:5px 9px;background:#e8f5fa;color:#006b91;border-radius:4px;display:inline-block}.perfil-campos{display:grid;gap:18px}.perfil-campos .rotulo{margin-bottom:0;font-size:12px;color:#4a596b}.perfil-campos .campo{margin-top:6px;min-height:43px;border-color:#dce2e8;font-size:14px;font-weight:400}.perfil-dupla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.perfil-fixo{background:#f8fafb;color:#667587}.perfil-painel{border:1px solid #e0e4e9;border-radius:5px;overflow:hidden;margin:26px 0 22px}.perfil-painel h2{font-weight:500;font-size:16px;background:#e7e9ed;color:#244458;text-align:center;padding:10px 15px}.perfil-painel-conteudo{padding:18px}.perfil-ajuda{font-size:12px;line-height:1.7;color:#788494;margin:8px 0 16px}.perfil-disponibilidade{border:1px solid #e0e4e9;padding:16px;border-radius:5px;margin:22px 0}.perfil-disponibilidade summary{font-size:13px;font-weight:600;color:#244458;cursor:pointer}.perfil-salvar{width:100%;margin-top:26px}.perfil-acoes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.perfil-acoes .btn{border-color:#0799c8;color:#027aa8;font-size:13px}.perfil-senha>h2,.perfil-cartao>h2{font-size:17px;font-weight:600;color:#244458}.perfil-senha :global(.rotulo){font-size:12px}.perfil-ausencia{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #edf0f3;font-size:13px}#dados,#senha{scroll-margin-top:90px}
 @media(max-width:640px){.perfil-cartao{padding:18px 16px}.perfil-topo{gap:12px;align-items:flex-start;padding-bottom:20px;margin-bottom:20px}.perfil-identidade h2{font-size:18px}.perfil-topo :global(.perfil-foto){width:112px}.perfil-identidade p{font-size:11px}.perfil-dupla{grid-template-columns:1fr;gap:16px}.perfil-acoes{grid-template-columns:1fr}.perfil-campos .campo{font-size:16px}.perfil-painel-conteudo{padding:14px}.perfil-painel h2{font-size:15px}.perfil-navegacao a{padding:9px 16px}.perfil-funcao{font-size:10px}.perfil-identidade strong{font-size:14px}.perfil-ausencia{align-items:flex-start}}
</style>
