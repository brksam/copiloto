# Co-piloto — Assistente Inteligente

> Agente de IA embarcado em sistemas de gestão. Responde dúvidas operacionais em tempo real, aprende com a documentação do sistema e evolui com o feedback dos usuários.

---

## Sobre o Projeto

O Co-piloto é um widget de chat inteligente que se integra a qualquer SaaS. O atendente pergunta em linguagem natural e recebe respostas precisas sobre os processos do sistema, sem precisar consultar manuais ou abrir chamados.

**Inspirado em produtos como Perssua**, mas focado no segmento B2B.

---

## Funcionalidades

- **Chat em tempo real** com agente Claude (Anthropic)
- **RAG** — respostas baseadas na documentação oficial do sistema
- **Contexto de tela** — o agente sabe em qual tela o usuário está
- **Onboarding semi-automático** — aponta a URL da documentação e o agente aprende sozinho
- **Feedback 👍👎** — aprendizado passivo com as avaliações dos usuários
- **Histórico persistente** — conversas salvas no PostgreSQL
- **Multi-tenant** — isolamento completo de dados por cliente
- **Widget arrastável** — o usuário posiciona onde quiser na tela

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Banco de dados | PostgreSQL + pgvector |
| Embeddings | Voyage AI (voyage-2, 1024d) |
| Agente IA | Claude Sonnet (Anthropic) |
| Frontend | React + TypeScript + Vite |
| Deploy Backend | Render.com |
| Deploy Frontend | Netlify |
| Containerização | Docker + docker-compose |

---

## Arquitetura

```
Widget React (Netlify)
        ↓
FastAPI Backend (Render)
        ↓
┌───────────────────────────┐
│  Orquestrador Claude      │
│  Motor RAG (pgvector)     │
│  Pipeline de Onboarding   │
└───────────────────────────┘
        ↓
PostgreSQL + pgvector (Render)
```

---

## Rodando Localmente

### Pré-requisitos

- Docker + Docker Compose
- Node.js 18+
- Chaves de API: Anthropic e Voyage AI

### Backend

```bash
# Clone o repositório
git clone https://github.com/brksam/copiloto.git
cd copiloto

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas chaves

# Sobe o backend + banco
docker-compose up --build
```

Backend disponível em `http://localhost:8000`
Swagger em `http://localhost:8000/docs`

### Widget

```bash
cd widget
npm install
npm run dev
```

Widget disponível em `http://localhost:5173`

---

## Variáveis de Ambiente

```env
ANTHROPIC_API_KEY=sua_chave
VOYAGE_API_KEY=sua_chave
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=copiloto
POSTGRES_USER=copiloto
POSTGRES_PASSWORD=copiloto
```

---

## Onboarding de Novo Cliente

Para ensinar o agente sobre um novo sistema, basta apontar a URL da documentação:

```bash
POST /onboarding/start
{
  "tenant_id": "farmacia-central",
  "root_url": "https://docs.sistema-do-cliente.com",
  "product_name": "Nome do Sistema",
  "max_pages": 50
}
```

O sistema faz o crawl automático, gera embeddings e já está pronto para responder.

---

## Roadmap

- [x] MVP com RAG + widget
- [x] Onboarding semi-automático
- [x] Feedback e aprendizado passivo
- [x] Histórico persistente
- [x] Deploy em produção
- [ ] Autenticação JWT multi-tenant
- [ ] Screenshot automático de tela (Claude Vision)
- [ ] Agente proativo (detecta erros antes do usuário perguntar)
- [ ] Computer Use — execução autônoma de ações no sistema
- [ ] Suporte a múltiplos SaaS (TOTVS, Senior, etc.)
- [ ] Voz bidirecional (Whisper + ElevenLabs)

---

## Licença

Proprietário — todos os direitos reservados.
