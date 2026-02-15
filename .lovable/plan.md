

# Sistema de Skills para Agentes de IA

## Resumo

Criar um sistema de "Skills" que mapeia as capacidades existentes do sistema como ferramentas que os agentes de IA podem executar durante conversas. Ao conversar com um agente (no chat interno ou via Telegram), ele podera, por exemplo, gerar um criativo, analisar uma campanha ou criar uma postagem -- tudo acionado via tool calling da IA.

## Como Funciona

1. O sistema tem um catalogo de skills pre-definidas (baseadas nas edge functions existentes)
2. Na pagina de edicao do agente, voce habilita/desabilita quais skills aquele agente pode usar
3. Quando o usuario conversa com o agente, a IA recebe as skills habilitadas como "tools" (tool calling)
4. Quando a IA decide usar uma skill, o backend executa a edge function correspondente e retorna o resultado

## Catalogo de Skills Identificadas

Analisei todas as edge functions e hooks do sistema. Estas sao as skills que podem ser criadas:

### Geracao de Conteudo (IA)
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Gerar Textos Criativos | `generate-creative-texts` | Gera headlines, copys e CTAs para anuncios |
| Gerar Conteudo AI | `generate-content-ai` | Gera conteudo por tipo (post, story, reels, etc) |
| Gerar Variacoes de Criativo | `generate-creative-variations` | Cria variacoes visuais de um criativo |
| Gerar Carrossel | `daily-carousel-generator` | Gera carrosseis para Instagram |
| Gerar Post Instagram | `generate-instagram-auto-post` | Gera post automatico para Instagram |
| Gerar Post WordPress | `generate-wordpress-auto-post` | Gera post para WordPress |
| Gerar Post RSS | `generate-rss-post` | Gera post baseado em feed RSS |
| Gerar Sugestoes Criativas | `generate-creative-suggestions` | Sugere ideias de criativos |

### YouTube
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Gerar Roteiro de Video | `generate-video-script` | Cria roteiro completo para YouTube |
| Gerar Titulos YouTube | `generate-youtube-titles` | Sugere titulos otimizados |
| Gerar Thumbnail YouTube | `generate-youtube-thumbnail` | Cria thumbnail com IA |
| Gerar Sugestoes de Video | `generate-video-suggestions` | Sugere ideias de videos |
| Analisar Canal YouTube | `analyze-youtube-channel` | Analisa metricas do canal |
| Transcrever Video | `transcribe-youtube-video` | Transcreve audio de video |

### Gestao de Campanhas Meta
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Analisar Campanha | `generate-campaign-analysis` | Analise detalhada de performance |
| Recomendacao de Campanha | `generate-campaign-recommendation` | Sugere otimizacoes |
| Estrategia de Campanha | `generate-campaign-strategy` | Cria estrategia completa |
| Gerenciar Campanha | `manage-facebook-campaign` | Pausar, ativar, renomear, ajustar budget |
| Criar Campanha Completa | `create-meta-campaign-full` | Cria campanha + adset + anuncio |
| Analisar Vencedores | `analyze-ad-winners` | Identifica anuncios com melhor performance |
| Pontuar Anuncio | `score-generated-ad` | Da nota para um criativo gerado |
| Sincronizar Campanhas | `sync-facebook-campaigns` | Sincroniza dados do Meta |
| Enviar Evento Pixel | `send-pixel-event` | Dispara evento via Conversions API |

### Prospeccao e Leads
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Prospectar Google | `prospect-google-leads` | Busca leads no Google Maps |
| Prospectar Instagram | `prospect-instagram-followers` | Busca seguidores de concorrentes |
| Google Trends | `google-trends` | Consulta tendencias de busca |
| Pesquisa de Mercado | `generate-research-themes` | Gera temas de pesquisa |

### Utilidades
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Traduzir Texto | `translate-text` | Traduz textos entre idiomas |
| Corrigir Gramatica | `validate-text-grammar` | Corrige erros gramaticais |
| Transcrever Audio | `transcribe-audio` | Transcreve audio para texto |
| Gerar Briefing do Cliente | `generate-client-briefing` | Gera briefing automatico |
| Analisar URL | `analyze-url-content` | Extrai conteudo de uma URL |
| Analisar Concorrentes | `analyze-competitor-insights` | Analisa anuncios de concorrentes |

### WhatsApp
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Enviar Notificacao WhatsApp | `send-whatsapp-notification` | Envia mensagem via WhatsApp |

### Publicacao
| Skill | Edge Function | Descricao |
|-------|--------------|-----------|
| Publicar Post Agendado | `publish-scheduled-post` | Publica post no horario |
| Agendar Postagem | `scheduled-post-publisher` | Agenda uma publicacao |

## Mudancas Tecnicas

### 1. Banco de Dados

**Nova tabela `ia_agent_skills` (catalogo master de skills):**
- `id` (text, PK) - identificador unico da skill (ex: "generate_creative_texts")
- `name` - nome amigavel
- `description` - descricao curta
- `category` - categoria (conteudo, youtube, campanhas, prospeccao, utilidades, whatsapp, publicacao)
- `edge_function` - nome da edge function que executa
- `required_params` - JSON com parametros obrigatorios
- `optional_params` - JSON com parametros opcionais
- `requires_client` - boolean, se precisa de client_id

**Nova tabela `ia_agent_enabled_skills` (skills habilitadas por agente):**
- `id` (uuid, PK)
- `agent_id` (FK -> ia_agents)
- `skill_id` (FK -> ia_agent_skills)
- `created_at`
- UNIQUE(agent_id, skill_id)

Seed das skills na migration com INSERT dos ~30 skills mapeados.

### 2. Edge Function: `ia-agent-chat` (modificar)

A logica principal muda para suportar tool calling:

1. Ao montar o request para o AI Gateway, incluir as skills habilitadas como `tools` no formato OpenAI tool calling
2. Cada skill vira uma tool com `name`, `description` e `parameters` (JSON Schema)
3. Quando a IA responde com `tool_calls`, o backend:
   - Identifica qual skill foi chamada
   - Executa a edge function correspondente (via fetch interno)
   - Retorna o resultado para a IA como `tool` message
   - A IA formula a resposta final para o usuario
4. Salva a mensagem final no historico

### 3. Edge Function: `telegram-agent-webhook` (modificar)

Mesma logica de tool calling do `ia-agent-chat`, adaptada para o fluxo do Telegram.

### 4. Nova secao no menu lateral do AgentEdit: "Skills"

- Adicionar item "Skills" no menu lateral (icone `Wrench` ou `Puzzle`)
- Componente `AgentSkillsConfig.tsx`:
  - Lista todas as skills agrupadas por categoria
  - Toggle (switch) para habilitar/desabilitar cada skill
  - Descricao curta de cada skill
  - Indicador visual de quantas skills ativas
  - Se o agente nao tem client_id, skills que exigem cliente ficam desabilitadas com tooltip explicando

### 5. Arquivos Criados/Modificados

**Novos:**
- Migration SQL com tabelas + seed de skills
- `src/components/agents/AgentSkillsConfig.tsx` - UI de gestao de skills
- `src/hooks/useAgentSkills.tsx` - Hook para CRUD de skills habilitadas

**Modificados:**
- `supabase/functions/ia-agent-chat/index.ts` - Adicionar tool calling
- `supabase/functions/telegram-agent-webhook/index.ts` - Adicionar tool calling
- `src/pages/AgentEdit.tsx` - Adicionar secao "Skills" no menu lateral

## Fluxo de Execucao de Skill

```text
Usuario: "Analisa a campanha X do cliente"
         |
         v
ia-agent-chat recebe mensagem
         |
         v
Monta request com tools[] das skills habilitadas
         |
         v
AI Gateway responde com tool_call: "analyze_campaign"
         |
         v
Backend executa edge function "generate-campaign-analysis"
         |
         v
Resultado retornado como tool message
         |
         v
AI Gateway formula resposta final com os dados
         |
         v
"A campanha X gastou R$500, teve 20 conversoes..."
```

## Consideracoes

- As skills sao executadas no backend com service_role, entao tem acesso total aos dados
- O agente so pode usar skills que foram explicitamente habilitadas
- Skills que precisam de client_id usam o client associado ao agente
- O tool calling e nativo do AI Gateway (compativel com OpenAI format)
- Nao ha risco de seguranca pois as skills sao pre-definidas e validadas no backend
- O sistema e extensivel: novas edge functions podem virar novas skills adicionando um registro na tabela

