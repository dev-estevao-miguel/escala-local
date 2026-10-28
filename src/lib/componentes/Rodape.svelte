<script lang="ts">
import {DESENVOLVEDOR,IGREJA,SIGLA,VERSAO} from '#lib/util';
let {tom='padrao'}:{tom?:'padrao'|'claro'}=$props();
</script>
<footer class="app-footer" class:claro={tom==='claro'}><p>{IGREJA}</p><p>Desenvolvido por <a class="underline underline-offset-2 hover:opacity-80" href="https://www.linkedin.com/in/estev%C3%A3o-miguel-a22057171/" target="_blank" rel="noopener noreferrer">{DESENVOLVEDOR}</a></p><p>© {new Date().getFullYear()} {SIGLA} · Escala Local {VERSAO} · Todos os direitos reservados.</p></footer>
