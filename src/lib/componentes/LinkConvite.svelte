<script lang="ts">
 let {link}:{link:string}=$props();
 let feedback=$state('');
 const completo=()=>new URL(link,window.location.origin).href;
 async function copiar(){try{await navigator.clipboard.writeText(completo());feedback='Link copiado!';}catch{window.prompt('Copie o link:',completo());}}
 async function compartilhar(){if(navigator.share){try{await navigator.share({title:'Convite Escala Local',url:completo()});}catch{await copiar();}}else await copiar();}
</script>
<div class="cartao mt-4 border border-sky-200"><p class="text-sm">O mesmo link pode ser compartilhado para novos cadastros.</p><input class="campo mt-2" readonly value={typeof window!=='undefined'?new URL(link,window.location.origin).href:link} aria-label="Link do convite"/><div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-primario" type="button" onclick={copiar}>Copiar link</button><button class="btn btn-secundario" type="button" onclick={compartilhar}>Compartilhar</button></div><p role="status">{feedback}</p></div>
