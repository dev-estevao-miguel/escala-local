<script lang="ts">
 import {onMount,untrack} from 'svelte';
 import {invalidateAll} from '$app/navigation';
 import Icone from './Icone.svelte';
 let {iniciais}:{iniciais:number}=$props();
 let quantidade=$state(untrack(()=>iniciais));
 $effect(()=>{quantidade=iniciais;});
 onMount(()=>{
  let ativo=true,buscando=false;
  async function atualizar(){
   if(!ativo||buscando||document.visibilityState!=='visible')return;
   buscando=true;
   try{const r=await fetch('/notificacoes/contagem',{cache:'no-store',credentials:'same-origin'});if(r.ok){const d=await r.json();if(ativo&&Number.isInteger(d.naoLidas)&&d.naoLidas!==quantidade){quantidade=d.naoLidas;if(window.location.pathname==='/notificacoes')await invalidateAll();}}}catch{}finally{buscando=false;}
  }
  const intervalo=setInterval(atualizar,30000);
  window.addEventListener('focus',atualizar);document.addEventListener('visibilitychange',atualizar);window.addEventListener('notificacoes-atualizadas',atualizar);
  return ()=>{ativo=false;clearInterval(intervalo);window.removeEventListener('focus',atualizar);document.removeEventListener('visibilitychange',atualizar);window.removeEventListener('notificacoes-atualizadas',atualizar);};
 });
</script>
<a class="icon-button relative" href="/notificacoes" aria-label={'Notificações'+(quantidade?', '+quantidade+' não lidas':'')} title="Notificações"><Icone nome="sino" tamanho={23}/>{#if quantidade}<span class="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold text-white">{quantidade>99?'99+':quantidade}</span>{/if}</a>
