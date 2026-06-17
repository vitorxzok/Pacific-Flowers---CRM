# 🛡️ Regras Imutáveis do Projeto - Pacific Flowers CRM

Este documento serve como a **memória principal e inviolável** do projeto. 
**NENHUMA** inteligência artificial ou desenvolvedor deve alterar as regras e lógicas descritas aqui sem a autorização explícita do proprietário (o "chefe").

---

## 1. Regras da Inteligência Artificial (OpenAI)

### 1.1. Envio do Catálogo
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra:** A IA **nunca** deve enviar o catálogo repetidas vezes. O envio do catálogo (junto com o link de pedidos) deve ocorrer apenas na primeira vez em que o cliente demonstra interesse ou quando ele pedir explicitamente para ver os produtos novamente.
- **Implementação:** A verificação se o catálogo já foi enviado deve olhar o histórico recente. A regra principal está consolidada no arquivo `PROMPT.md`.

### 1.2. Mídias Recebidas (Áudio, Foto, Vídeo, Documento)
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra:** A IA não possui suporte a processamento de mídias nativas pelo WhatsApp. Se o cliente enviar um áudio, foto, vídeo ou figurinha, a IA **deve informar educadamente** que é uma inteligência artificial, que no momento só entende texto, e pedir para o cliente digitar o que precisa.
- **Implementação:** Instrução explicitamente adicionada na linha 139 do arquivo `PROMPT.md`.

### 1.3. Lógica do 'toolInstructions'
- **Status:** 🔒 RESOLVIDO E BLOQUEADO
- **Regra:** O arquivo `src/lib/openai.ts` não utiliza mais a variável `toolInstructions` concatenada via código, pois as instruções das ferramentas foram movidas diretamente para a string estática do prompt no banco e no `PROMPT.md`. 
- **Cuidado Técnico:** Jamais injetar variáveis soltas de ferramentas no final do bloco do prompt sem garantir que o fechamento das chaves `}` da função principal `getSystemPrompt` ocorra de maneira correta (evitando erros de compilação ECMAscript).

---

## 2. Interface e CRM (Frontend)

### 2.1. Atualização em Tempo Real (Realtime)
- **Status:** 🔄 EM IMPLEMENTAÇÃO E OBSERVAÇÃO
- **Regra:** O Card do CRM (Painel Admin e Kanban) deve atualizar em tempo real quando mensagens chegam ou quando o usuário envia mensagens, utilizando as inscrições (subscriptions) do Supabase. Nenhuma alteração deve quebrar os hooks `useEffect` do `admin_realtime_main`.

---

*Nota para a IA:* Toda vez que concluir um novo marco estrutural, adicione-o a este documento. Sempre leia este arquivo antes de refatorar código importante.
