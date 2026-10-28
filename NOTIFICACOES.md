# Notificações de escala

Depois de **Calcular prévia → Confirmar e publicar escala**, a publicação aparece em **Escalas publicadas**, na mesma página. Use **Enviar notificação a todos os obreiros** para avisar os usuários ativos da área. A ação é opcional e não depende de o destinatário estar escalado.

Cada destinatário recebe um aviso privado em **Notificações**, acessível pelo sino do cabeçalho e pelo menu. O aviso informa o período publicado e oferece **Ver escala**. Abrir a escala marca o aviso como lido; também é possível marcar um ou todos manualmente. O contador é atualizado ao navegar, ao voltar à janela e a cada 30 segundos enquanto ela estiver visível. A lista também é atualizada quando a central já estiver aberta.

Publicações das outras áreas não podem ser notificadas. Coordenador e vice podem avisar as publicações da própria área; um obreiro delegado pode avisar somente as publicações feitas por ele. Cada usuário recebe uma mensagem por publicação, mesmo com clique repetido ou dois envios simultâneos. A marcação de leitura é independente para cada pessoa.

A migração **008_notificacoes** acrescenta publicações, vínculo nas escalas e notificações com RLS. As escalas já publicadas são incluídas como publicações para permitir o aviso, sem enviar mensagens automaticamente nem mudar os escalados. SQLite aplica ao iniciar; Supabase fica preparado para a próxima execução autorizada de `npm run db:setup`.

Backup local anterior: `.codex-backup/pre-notificacoes-2026-10-19T20-33-13-829Z/base.db`, com 68 usuários e 74 escalas. Os testes de envio usam base temporária; nenhum aviso foi disparado para os usuários reais durante a implementação.

Verificações: oito migrações PostgreSQL, RLS e upgrade SQLite/PostgreSQL aprovados, mantendo as escalas antigas disponíveis para avisar. Os testes de navegador cobrem envio opcional após publicação, todos os perfis da área recebendo, recebimento online, concorrência sem duplicação, proibição de avisar outra área/publicação indevida e leitura privada persistida. Evidência: `test-results/notificacoes-mobile.png`.

Entrega validada com **26 testes de navegador aprovados**, `check` sem erros/avisos e build aprovado. A migração 008 foi aplicada na base local. A comparação com o backup confirmou usuários, senhas, igrejas, cultos e as 74 escalas preservados, com integridade `ok`. A opção foi conferida no navegador para a publicação existente e o total de notificações reais permanece **zero**, aguardando seu clique. Evidência: `test-results/notificar-74-escalas-desktop.png`.
