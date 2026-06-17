# 🛡️ Regras Imutáveis do Projeto - Pacific Flowers CRM

Este documento serve como a **memória principal e inviolável** do projeto e mapeia toda a arquitetura crítica. 
**NENHUMA** inteligência artificial ou desenvolvedor deve alterar as regras e lógicas descritas aqui sem a autorização explícita do proprietário (o "chefe").

---

## 1. Regras da Inteligência Artificial (OpenAI)

### 1.1. Envio do Catálogo e Link de Pedido
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra do Catálogo Único:** A IA **nunca** deve enviar o catálogo repetidas vezes. O envio deve ocorrer apenas na primeira vez em que o cliente demonstra interesse. A verificação do envio prévio deve ler o histórico recente.
- **Regra de OBRIGATORIEDADE do Link:** O link do "Pedido Rápido" (`https://pacific-flowers.vercel.app`) deve ser **obrigatoriamente** enviado acima do Passo a Passo. É expressamente proibido enviar o Passo a Passo sem o link.
- **Ordem de Envio:** A IA deve **obrigatoriamente** primeiro acionar a ferramenta do catálogo (`sendAttachment("CATALOGO")`), e só depois, de forma conjunta na mesma resposta (usando a tag `[SEPARAR]`), enviar o Link + Passo a Passo.
- **Implementação:** Estas regras estão enraizadas na matriz `PROMPT.md`.

### 1.2. Mídias Recebidas (Áudio, Foto, Vídeo, Documento)
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra:** A IA não possui suporte a processamento de mídias nativas pelo WhatsApp. Se o cliente enviar um áudio, foto, vídeo ou figurinha, a IA **deve informar educadamente** que é uma inteligência artificial que só entende texto e pedir para o cliente digitar.

### 1.3. Lógica do 'toolInstructions'
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra:** O arquivo `src/lib/openai.ts` não utiliza mais a variável `toolInstructions` concatenada via código. As instruções das ferramentas estão embutidas na string estática e no `PROMPT.md`.
- **Bloqueio Estrutural:** Jamais injetar variáveis soltas de ferramentas no final do bloco do prompt sem garantir que o fechamento das chaves `}` da função `getSystemPrompt` ocorra de maneira correta.

---

## 2. Arquitetura do Sistema (Mapeamento Vital)

### 2.1. Webhooks & WhatsApp Integration
- **Arquivos-Chave:** `src/app/api/webhook/whatsapp/route.ts` e `src/app/api/whatsapp/send/route.ts`.
- **Regras:**
  - A conexão é gerenciada pela **Evolution API** via instâncias dinâmicas (`user_<seller_id>`).
  - Mensagens ativam o webhook `messages-upsert`. Leads novos são criados com status inicial automático no Supabase.
  - A IA (`generateAIResponse`) SÓ pode ser ativada se `autoReplyEnabled` e `ai_enabled` forem `true` e se a flag `needs_human` for `false`.
  - Simulação de digitação (`composing`) e atrasos intencionais são regras nativas de UX.

### 2.2. Supabase Database & Realtime Subscriptions
- **Arquivos-Chave:** `src/lib/supabase/client.ts`, `server.ts` e `src/app/page.tsx`.
- **Regras:** 
  - O sistema depende fundamentalmente do canal `kanban_realtime_main`.
  - Inserções (Inserts), atualizações (Updates) ou exclusões (Deletes) nos `clientes` ou `mensagens` forçam um `fetchClients()` global no frontend (Painel), garantindo atualização em tempo real sem refresh. Mexer nesse listener quebra a sincronia do app.

### 2.3. Inteligência e Ferramentas (Tools) da IA
- **Arquivos-Chave:** `src/lib/openai.ts`.
- **Regras:**
  - `sendAttachment`: A IA invoca gatilhos (Ex: "CATALOGO"). O backend intercepta isso e substitui a tag secreta `[SEPARAR]` pela URL buscada na aba *Settings* (banco de dados).
  - `changeClientStatus`: **Trava de Segurança:** A IA está proibida de jogar um lead para a coluna "Em Qualificação" se o catálogo ainda não tiver sido enviado.
  - `transferToHuman`: Esta ferramenta define `needs_human: true`, troca a coluna do Lead (ex: para "Qualificado"), injeta notas internas e alerta o vendedor pelo seu número pessoal de WhatsApp via sistema.

### 2.4. CRM Kanban & Painel Admin
- **Arquivos-Chave:** `KanbanBoard.tsx`, `KanbanColumn.tsx`, `ClientModal.tsx`.
- **Regras:**
  - O Kanban é dinâmico (lê de `settings.kanbanColumns`).
  - Ele utiliza a API nativa do navegador (HTML5 Drag and Drop) para movimentação visual.
  - O Modal do cliente intercepta mensagens do cliente, mensagens da IA, envios manuais do vendedor e notificações do sistema, separando-os de forma clara em bolhas de chat.

### 2.5. State Management (Zustand)
- **Arquivos-Chave:** `src/store/useCRMStore.ts`.
- **Regras:**
  - Utiliza **Optimistic UI Updates**.
  - Sempre que um evento ocorre (mover card, enviar mensagem manual), o Zustand atualiza o visual da tela instantaneamente para o atendente humano, e só então roda a requisição assíncrona ao Supabase em segundo plano. Desativar isso criaria um atraso ("lag") ao usar o CRM.

---
*Este arquivo documenta as bases imutáveis do Pacific Flowers CRM. Modificações nestes padrões podem resultar em quedas críticas de funcionamento.*
