<script lang="ts">
 import {enhance} from '$app/forms';
 import Aviso from './Aviso.svelte';
 import Icone from './Icone.svelte';
 let {versao,nome,form,compacto=false}:{versao:number;nome:string;form:{ok?:string;erro?:string}|null;compacto?:boolean}=$props();
 let erro=$state(''),enviando=$state(false);
 const preparar:NonNullable<Parameters<typeof enhance>[1]>=async({formData,cancel})=>{
  erro='';enviando=true;
  try{
   const arquivo=formData.get('foto');
   if(!(arquivo instanceof File)||!arquivo.size)throw new Error('Selecione uma foto.');
   if(arquivo.size>5*1024*1024)throw new Error('Selecione uma foto de até 5 MB.');
   if(!['image/jpeg','image/png','image/webp'].includes(arquivo.type))throw new Error('Use uma foto JPG, PNG ou WebP.');
   const imagem=await createImageBitmap(arquivo);
   try{
    const proporcao=Math.min(1,512/Math.max(imagem.width,imagem.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(imagem.width*proporcao));canvas.height=Math.max(1,Math.round(imagem.height*proporcao));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto.');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(imagem,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
    if(!blob)throw new Error('Não foi possível preparar a foto.');
    formData.set('foto',new File([blob],'perfil.jpg',{type:'image/jpeg'}));
   }finally{imagem.close();}
   return async({update})=>{try{await update();}finally{enviando=false;}};
  }catch(e){erro=e instanceof Error?e.message:'Não foi possível enviar a foto.';enviando=false;cancel();}
 };
</script>
<section class={compacto?'perfil-foto':'cartao'} aria-labelledby="foto-titulo">
 <h2 id="foto-titulo" class={compacto?'sr-only':'font-semibold text-marca-noite'}>Foto de perfil</h2>
 <div class={compacto?'perfil-foto-imagem':'mt-3 flex items-center gap-3'}>
  {#if versao}<img src={'/perfil/foto?v='+versao} alt={'Foto de '+nome} width="80" height="80" class="size-20 rounded-full" style="object-fit:cover"/>{:else}<span class="avatar size-20" aria-label="Sem foto de perfil">{nome.split(' ').slice(0,2).map(n=>n[0]).join('')}</span>{/if}
  {#if compacto}<button type="button" class="perfil-foto-camera" aria-label="Alterar foto de perfil" onclick={()=>document.getElementById('foto')?.click()}><Icone nome="camera" tamanho={19}/></button>{:else}<p class="text-xs text-gray-500">JPG, PNG ou WebP, até 5 MB. A imagem é reduzida antes do envio.</p>{/if}
 </div>
 <Aviso {form}/>{#if erro}<p role="alert" class="mt-3 text-sm text-red-700">{erro}</p>{/if}
 <form method="POST" action="?/foto" enctype="multipart/form-data" use:enhance={preparar} class={compacto?'perfil-foto-form':'mt-4 space-y-3'}>
  <label class={compacto?'sr-only':'rotulo'} for="foto">Escolher foto</label>
  <input class={compacto?'sr-only':'campo w-full'} id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" required disabled={enviando}/>
  <button class="btn btn-secundario" disabled={enviando}>{enviando?'Enviando…':'Salvar foto'}</button>
 </form>
 {#if versao}<form method="POST" action="?/removerFoto" use:enhance class="mt-3"><button class="btn btn-link" disabled={enviando}>Remover foto</button></form>{/if}
</section>

<style>
 .perfil-foto{width:160px;text-align:center;flex:none;font-size:12px}.perfil-foto-imagem{position:relative;width:88px;margin:0 auto 12px}.perfil-foto-imagem :global(img),.perfil-foto-imagem :global(.avatar){width:88px;height:88px;font-size:25px;background:#9ca3af}.perfil-foto-camera{position:absolute;right:-5px;bottom:0;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#fff;border:1px solid #dce2e8;color:#526171}.perfil-foto-form :global(.btn){min-height:32px;font-size:11px;padding:4px 12px}.perfil-foto :global([role=status]),.perfil-foto :global([role=alert]){font-size:11px;padding:8px}.perfil-foto :global(.mt-3){margin-top:8px}
</style>
