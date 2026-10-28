# Escala Local

Aplicação web (PWA) que organiza a escala de obreiros por área e congregação: convites, disponibilidade, eventos locais, geração automática da escala, PDF e notificações.

<p>
  <a href="https://escala.tscbr.com.br"><img alt="Acessar Escala Local" src="https://img.shields.io/badge/VER%20PROJETO-escala.tscbr.com.br-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white"/></a>
</p>

<p>
  <img alt="Status" src="https://img.shields.io/badge/status-em%20produ%C3%A7%C3%A3o-10bfe1?style=flat-square"/>
  <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-Svelte%205-1f2334?style=flat-square&logo=svelte&logoColor=FF3E00"/>
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-1f2334?style=flat-square&logo=tailwindcss&logoColor=38BDF8"/>
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-1f2334?style=flat-square&logo=postgresql&logoColor=4169E1"/>
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-local-1f2334?style=flat-square&logo=sqlite&logoColor=white"/>
  <img alt="Dados" src="https://img.shields.io/badge/dados-100%25%20fict%C3%ADcios-10bfe1?style=flat-square"/>
</p>

> **Versão pública DEMO.** Marca, logotipos, catálogo de congregações, endereços, pessoas e o login do administrador foram substituídos por dados **fictícios** ("Igreja Demo", "Congregação Demo Alfa", carteira `900001`). Nenhum dado de membro, banco de dados ou credencial real faz parte deste repositório.

## O problema

Montar a escala mensal de uma área com várias congregações é um trabalho manual e frágil. O coordenador recebe a disponibilidade dos obreiros por mensagem, cruza com os cultos de cada igreja em uma planilha e, a cada troca, refaz tudo e reenvia um PDF pelo WhatsApp. Conflitos de horário e obreiros sobrecarregados só aparecem no dia.

Além disso, cada perfil precisa ver coisas diferentes: o obreiro consulta a escala, o responsável da congregação cadastra eventos locais e a coordenação aprova cadastros e publica. Uma planilha compartilhada mistura tudo isso e expõe telefones e dados pessoais para quem não deveria vê-los.

O Escala Local centraliza o fluxo: convites por papel, disponibilidade informada pelo próprio obreiro, geração da escala com prévia antes de publicar e notificação privada para cada pessoa da área.

## O que faz

- **Convites por papel** (coordenação, responsáveis, obreiros), com área e congregação fixadas pelo backend.
- **Disponibilidade semanal** por dias e turnos, de acordo com o cargo.
- **Eventos locais** por congregação, com edição e histórico preservado.
- **Geração automática da escala** considerando cargo, disponibilidade, exceções, conflitos e distribuição justa, com prévia antes de publicar.
- **PDF da escala** e **cartão de identificação** (90 × 60 mm) gerados no servidor.
- **Notificações privadas** após a publicação, com contador de não lidas.
- **Administração** de coordenadores, vínculos de área e verificação de integridade do banco.
- **PWA** instalável no celular, com página offline.

## Capturas

As telas usam a identidade visual fictícia de demonstração (logotipo "ESCALA DEMO"). Capturas serão adicionadas a partir da base de demonstração.

## Stack

SvelteKit · Svelte 5 · TypeScript · Tailwind CSS 4 · PostgreSQL (Supabase, com RLS) em produção · SQLite no desenvolvimento · PDFKit · Playwright · Vercel.

## Como executar

Requisitos: Node 24+ e npm.

```bash
npm install
cp .env.example .env      # preencha ADMIN_SENHA (10+ caracteres) e SESSAO_SEGREDO (32+ caracteres)
npm run local:setup       # cria a base SQLite local em data/
npm run dev               # http://localhost:5173
```

Entre com a carteira **900001** e a senha definida em `ADMIN_SENHA`. Para gerar dados fictícios de teste: `npm run dados:teste -- --aplicar` (recusa ambiente de produção).

### Produção (PostgreSQL)

O endereço público oficial da demonstração é **https://escala.tscbr.com.br**.

1. Configure `DATABASE_URL` (Transaction pooler, `sslmode=verify-full`) e `DATABASE_SSL_CA` com o certificado oficial do Supabase.
2. Aplique as migrações: `npm run db:setup`.
3. Defina `ADMIN_LOGIN`, `ADMIN_SENHA` e `SESSAO_SEGREDO` como variáveis de ambiente no provedor de hospedagem.

O backend autentica por carteira, senha (scrypt) e sessão assinada. As tabelas usam RLS e bloqueiam os papéis públicos; TLS é obrigatório.

### Verificações

```bash
npm run check            # svelte-check + TypeScript
npm run test:db          # migrações PostgreSQL, isolamento e RLS (PGlite)
npm run test:upgrade     # upgrade SQLite → PostgreSQL
npm run test:regras      # regras de geração da escala
npm run test:dados       # gerador de dados fictícios
npm run test:seguranca   # TLS e ocultação de credenciais
npm test                 # cenários ponta a ponta (Playwright)
npm run build
```

## Escopo da versão pública

- Código completo, migrações e testes.
- Substituídos por dados **fictícios**: marca e logotipos (gerados), catálogo de congregações (`dados/congregacoes-demo.json`), nomes usados em scripts de teste e a carteira do administrador.
- Removidos: relatórios internos de publicação e operação, protótipo visual, escala de exemplo em PDF, bancos SQLite, backups e qualquer `.env`.
- A consulta a catálogos externos está desativada nesta versão; o app usa apenas o catálogo fictício local.

## Licença

[MIT](LICENSE)

---

Desenvolvido por **Estevão dos Santos** · [github.com/dev-estevao-miguel](https://github.com/dev-estevao-miguel)
