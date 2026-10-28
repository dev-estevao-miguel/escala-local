<script lang="ts">
  let {nome,tamanho=22}:{nome:string;tamanho?:number}=$props();
  const desenhos:Record<string,string>={
    sino:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    menu:'M4 6h16M4 12h16M4 18h16', fechar:'M6 6l12 12M6 18L18 6',
    inicio:'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    escala:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M7 14h3m4 0h3m-10 4h3',
    aprovacoes:'M9 12l2 2 4-4M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',
    obreiros:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    igreja:'M12 2v6m-3-3h6M4 21V11l8-5 8 5v10M2 21h20M9 21v-6h6v6',
    tipos:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    plataforma:'M3 3v18h18M7 16v-5m5 5V7m5 9v-8',
    perfil:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    sair:'M9 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5m7 14 5-5-5-5M21 12H9',
    baixar:'M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
    seta:'M9 5l7 7-7 7', compartilhar:'M12 16V2m-5 5 5-5 5 5M5 10H3v12h18V10h-2',
    alerta:'M12 9v4m0 4h.01M10 3 2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 3a2 2 0 0 0-4 0',
    olho:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    camera:'M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0'
  };
</script>
<svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={desenhos[nome]??desenhos.escala}/></svg>
