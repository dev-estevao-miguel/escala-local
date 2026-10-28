<script lang="ts">
 import Icone from './Icone.svelte';
 let {id,name,rotulo,placeholder='',autocomplete='new-password',minlength,maxlength=128,required=true}:{id:string;name:string;rotulo:string;placeholder?:string;autocomplete?:'new-password'|'current-password';minlength?:number;maxlength?:number;required?:boolean}=$props();
 let mostrar=$state(false);
</script>
<label class="rotulo" for={id}>{rotulo}</label>
<div class="password-field">
 <input class="campo" {id} {name} type={mostrar?'text':'password'} {required} {minlength} {maxlength} {placeholder} {autocomplete}/>
 <button type="button" class="icon-button" aria-label={(mostrar?'Ocultar ':'Mostrar ')+rotulo.toLocaleLowerCase('pt-BR')} aria-controls={id} aria-pressed={mostrar} onclick={()=>mostrar=!mostrar}><Icone nome="olho" tamanho={20}/></button>
</div>
