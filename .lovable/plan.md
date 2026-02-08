
# Plano: Exportar Slides para Google Apresentações

## Resumo

Implementar um botão "Exportar para Google Slides" que cria automaticamente uma apresentação no Google Apresentações com todas as imagens dos slides gerados, pronta para visualização e compartilhamento.

## Como vai funcionar

1. Você clica no botão **"Exportar para Google Slides"** na seção de slides
2. O sistema cria uma nova apresentação no Google Slides com o título do roteiro
3. Cada slide com imagem é adicionado automaticamente (formato 16:9)
4. Ao finalizar, você recebe o **link direto** para abrir a apresentação no Google

## Pré-requisitos

O projeto já possui as credenciais necessárias (`GCP_SERVICE_ACCOUNT_JSON`), mas será preciso:

- Habilitar a **Google Slides API** no Google Cloud Console (mesma conta usada para YouTube/vídeos)
- Adicionar o escopo `https://www.googleapis.com/auth/presentations` na Service Account

## Implementação Técnica

### 1. Nova Edge Function: `export-to-google-slides`

Função que:
- Recebe o `scriptId` e lista de slides
- Autentica usando `GCP_SERVICE_ACCOUNT_JSON` (reaproveitando padrão existente)
- Cria uma apresentação vazia via `POST https://slides.googleapis.com/v1/presentations`
- Adiciona cada slide com imagem via `batchUpdate`:
  - `createSlide` - cria o slide em branco
  - `createImage` - adiciona a imagem preenchendo todo o slide (16:9)
- Retorna a URL da apresentação criada

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE EXPORTAÇÃO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Usuário clica "Exportar"]                                 │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Edge Function   │                                        │
│  │ export-to-      │                                        │
│  │ google-slides   │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐    POST /v1/presentations              │
│  │ 1. Criar        │ ◄─────────────────────────────         │
│  │    Apresentação │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐    batchUpdate:                        │
│  │ 2. Para cada    │    - createSlide                       │
│  │    slide:       │    - createImage (imagem 16:9)         │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ 3. Retornar URL │ → docs.google.com/presentation/d/...   │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Atualização do Hook `useYouTubeSlides`

Adicionar função `exportToGoogleSlides`:
- Chama a nova Edge Function
- Mostra feedback de progresso ("Exportando para Google Slides...")
- Retorna a URL da apresentação criada

### 3. Atualização da UI `SlidesSection`

Adicionar botão **"Exportar para Google Slides"**:
- Aparece apenas quando há slides com imagens geradas
- Ícone do Google Slides
- Ao concluir, abre a apresentação em nova aba e mostra toast de sucesso

### 4. Configuração do Google Cloud

Será necessário adicionar aos escopos da Service Account:
```
https://www.googleapis.com/auth/presentations
https://www.googleapis.com/auth/drive.file
```

## Arquivos que serão criados/modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/export-to-google-slides/index.ts` | Criar |
| `supabase/config.toml` | Atualizar (adicionar nova função) |
| `src/hooks/useYouTubeSlides.tsx` | Modificar (adicionar exportToGoogleSlides) |
| `src/components/youtube-content-lab/SlidesSection.tsx` | Modificar (adicionar botão) |

## Considerações

- **Compartilhamento**: A apresentação será criada na conta da Service Account. Podemos configurar para compartilhar automaticamente com um e-mail específico ou deixar pública
- **Alternativa**: Se preferir que fique no Drive do usuário, seria necessário OAuth2 do lado do cliente (mais complexo)

## Próximos Passos

Após aprovar o plano:
1. Verificar se a Google Slides API está habilitada no Console GCP
2. Implementar a Edge Function
3. Integrar na UI com botão de exportação
