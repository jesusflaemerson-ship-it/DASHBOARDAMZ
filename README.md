# Painel Operacional — Marketplace (Next.js + Supabase)

Sistema completo com login, banco de dados na nuvem e sincronização real entre
qualquer dispositivo (PC, celular, tablet).

---

## PARTE 1 — Criar o banco de dados (Supabase, grátis)

1. Acesse https://supabase.com e crie uma conta grátis (pode usar login com GitHub).
2. Clique em **New Project**. Dê um nome (ex: `painel-marketplace`) e uma senha de banco
   (guarde essa senha, mas não vai precisar dela no dia a dia).
3. Espere ~2 minutos o projeto ser criado.
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `schema-supabase.sql` (está junto com este projeto), copie todo o
   conteúdo, cole no editor e clique em **Run**. Isso cria todas as tabelas
   (pedidos, despesas, reembolsos, estoque) já com segurança configurada.
6. Vá em **Project Settings** (ícone de engrenagem) → **API**. Você vai precisar de
   dois valores dessa tela: **Project URL** e a chave **anon public**.

---

## PARTE 2 — Rodar o projeto no seu computador

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

1. Extraia o arquivo `.zip` deste projeto numa pasta.
2. Abra o terminal (cmd/PowerShell no Windows, Terminal no Mac) dentro dessa pasta.
3. Rode:
   ```
   npm install
   ```
4. Copie o arquivo `.env.local.example` e renomeie a cópia para `.env.local`.
5. Abra o `.env.local` e cole a **Project URL** e a chave **anon public** que você
   pegou no Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxx
   ```
6. Rode:
   ```
   npm run dev
   ```
7. Abra http://localhost:3000 no navegador. Crie sua conta (email + senha) na tela
   de login — isso já cria seu usuário no Supabase.

---

## PARTE 3 — Publicar de verdade (Vercel, grátis)

1. Crie uma conta em https://github.com (grátis) se ainda não tiver.
2. Crie um novo repositório (pode ser privado) e suba os arquivos deste projeto
   (pelo site do GitHub mesmo, arrastando os arquivos, ou usando `git`).
3. Crie uma conta em https://vercel.com usando login do GitHub.
4. Clique em **Add New → Project**, escolha o repositório que você acabou de criar.
5. Na tela de configuração, abra **Environment Variables** e adicione as mesmas
   duas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Clique em **Deploy**. Em 1-2 minutos você recebe uma URL pública, tipo
   `https://painel-marketplace.vercel.app`.
7. Pronto — essa URL funciona igual em qualquer dispositivo, com os mesmos dados,
   porque tudo fica salvo no Supabase (não mais no navegador).

---

## O que já está pronto

- Login e cadastro por email/senha (Supabase Auth)
- Cada usuário só vê os próprios dados (Row Level Security já configurado no SQL)
- Dashboard com KPIs (faturamento, lucro, margem, taxa média Amazon, pedidos com prejuízo)
- Pedidos: criar, editar, excluir, duplicar, buscar — com cálculo automático de
  Lucro Caixa, Amazon Vai Pagar, Lucro Final e Taxa Amazon (%)
- Financeiro: lucro líquido, caixa acumulado, despesas
- Reembolsos & Problemas: com os 5 tipos de caso (envio errado, reembolso parcial,
  prejuízo operacional, cliente suspeito, chargeback)
- Estoque: quantidade, custo médio, fornecedor, alerta de estoque baixo

## Próximos passos sugeridos (não incluídos ainda)

- Importação de Excel (dá pra portar a lógica do painel HTML anterior)
- Gráficos (comparativo mensal, produtos mais vendidos) — pode usar `chart.js`,
  que já está instalado nas dependências
- Assistente de IA — pode ser adicionado como rota de API própria no Next.js
