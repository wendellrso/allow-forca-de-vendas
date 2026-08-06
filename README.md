# Allow — Força de Vendas Externa

Aplicativo da vendedora externa da Allow (AL, PE e PB), construído com os
padrões do STOK Studio. Especificação e decisões no repositório do Studio:
`stok-studio/docs/rfcs/RFC-005-PRODUTO-ALLOW-FORCA-DE-VENDAS.md` (aprovação
registrada na RD-072).

## O que a Fase 1 entrega

- **Clientes** — cadastro com cidade/UF, busca e arquivamento;
- **Catálogo público** (`/catalogo`) — o cliente monta o pedido e fecha pelo
  WhatsApp; o pedido nasce no painel como "aguardando confirmação";
- **Vendas** — manual ou vinda do catálogo, com máquina de estados protegida
  no banco (aguardando → confirmada → entregue, com cancelamento e estorno);
- **Estoque** — entradas e ajustes manuais, baixa automática na confirmação
  da venda, saldo nunca negativo (restrição no PostgreSQL);
- **Financeiro** — contas a receber criadas pela venda (à vista ou a prazo),
  recebimento parcial, e despesas de viagem (hospedagem, alimentação,
  combustível);
- **Relatórios** — vendas por cidade e por estado, e resultado do período
  (vendas menos despesas).

Fases 2 (cobrança por gateway) e 3 (NF-e/NFC-e) dependem das decisões D3 e D4
da RFC-005.

## Como rodar

Pré-requisitos: Node 22+ e um projeto Supabase **exclusivo do Allow**.

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as chaves do projeto.
3. Aplique as migrations: `DATABASE_URL=postgres://... npm run db:migrate`
   (use a conexão do session pooler do Supabase).
4. No painel do Supabase, em _Settings → API → Exposed schemas_, acrescente o
   schema `app` — o aplicativo conversa apenas com ele.
5. Crie a identidade da vendedora em _Authentication → Users_ e vincule à
   Organização:

   ```sql
   insert into app.members (user_id, organization_id, role)
   values ('<uuid da identidade>', (select id from app.organizations), 'administrador');
   ```

6. `npm run dev` e entre com o e-mail e a senha criados.

## Hospedagem — Cloudflare Workers

O aplicativo roda no Cloudflare Workers através do adaptador OpenNext
(`wrangler.jsonc` e `open-next.config.ts`). Decisão de plataforma: a
hospedagem da STOK é Cloudflare (RD-073 no repositório do Studio).

**Deploy contínuo pelo painel** (recomendado): Cloudflare → _Workers &
Pages → Create → Import a repository_ → `allow-forca-de-vendas`, com:

- comando de build: `npx opennextjs-cloudflare build`
- comando de deploy: `npx opennextjs-cloudflare deploy`

**Variáveis**, em _Settings → Variables and Secrets_ do Worker:

| Nome                            | Tipo       |
| ------------------------------- | ---------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | texto      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | texto      |
| `SUPABASE_SERVICE_ROLE_KEY`     | **secret** |
| `ALLOW_WHATSAPP_VENDEDORA`      | texto      |

**Domínio próprio**: _Settings → Domains & Routes → Custom domain_ →
`allow.stokbr.com.br` (a zona já está na mesma conta; o certificado é
automático).

**Deploy manual**: `npm run deploy` (exige `npx wrangler login`).
**Worker local**: `npm run preview`, com as variáveis em `.dev.vars`
(copie de `.dev.vars.example`).

## Qualidade

`npm run verify` executa formatação, lint, tipos, testes de unidade e build —
a mesma sequência do Studio. As invariantes de banco (estoque, transições,
imutabilidade, isolamento) estão nas migrations e foram verificadas contra
PostgreSQL 16 real.

## Segurança

- RLS habilitada e **forçada** em todas as tabelas, negando por padrão;
- nenhuma sessão de usuário tem privilégio de `delete` (exceto despesas);
- o catálogo público não expõe estoque nem dados fiscais, e o pedido é
  registrado por função restrita ao servidor;
- a chave `service_role` nunca alcança o navegador (há regra de lint).

## O que ainda não existe de propósito

- pagamento dentro do aplicativo (Fase 2) e emissão fiscal (Fase 3);
- múltiplas Organizações na interface — o modelo já isola por Organização,
  mas a Fase 1 opera com uma;
- limitação de taxa no catálogo público — endurecimento pendente antes de
  divulgar o link amplamente.
