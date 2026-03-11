#!/bin/bash
# Hook: Valida padroes obrigatorios ao criar/editar paginas e hooks
# Previne os erros mais comuns do projeto

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# So validar arquivos do projeto
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

ERRORS=""

# === VALIDACAO 1: Paginas em src/pages/ devem ter DashboardLayout ===
if [[ "$FILE_PATH" == *"src/pages/"* && "$FILE_PATH" == *.tsx ]]; then
  # Ignorar paginas publicas conhecidas
  BASENAME=$(basename "$FILE_PATH")
  PUBLIC_PAGES="Auth.tsx Landing.tsx Index.tsx NotFound.tsx DashboardPublico.tsx Apresentacao.tsx ResultadosPublico.tsx CrmPublico.tsx"
  IS_PUBLIC=false
  for pp in $PUBLIC_PAGES; do
    if [[ "$BASENAME" == "$pp" ]]; then
      IS_PUBLIC=true
      break
    fi
  done

  if [[ "$IS_PUBLIC" == "false" && "$TOOL_NAME" == "Write" ]]; then
    if ! echo "$CONTENT" | grep -q "DashboardLayout"; then
      ERRORS="${ERRORS}ERRO: Pagina protegida sem DashboardLayout. TODA pagina em src/pages/ deve usar <DashboardLayout>.\n"
    fi
  fi
fi

# === VALIDACAO 2: Nunca usar activeCompany.id em queries ===
if [[ "$FILE_PATH" == *.tsx || "$FILE_PATH" == *.ts ]]; then
  if echo "$CONTENT" | grep -qE 'activeCompany\??\.(id)[^_]|activeCompany\.(id)[^_]'; then
    # Verificar se nao e company_id (falso positivo)
    if ! echo "$CONTENT" | grep -qE 'activeCompany\??\.company_id'; then
      ERRORS="${ERRORS}ERRO: Usando activeCompany.id — use activeCompany.company_id (o .id e o ID do company_members, nao da empresa).\n"
    fi
  fi
fi

# === VALIDACAO 3: Proteger arquivos auto-gerados ===
if [[ "$FILE_PATH" == *"src/integrations/supabase/types.ts" ]]; then
  ERRORS="${ERRORS}ERRO: types.ts e auto-gerado pelo Supabase. Nao editar manualmente.\n"
fi

# === VALIDACAO 4: Proteger componentes shadcn/ui ===
if [[ "$FILE_PATH" == *"src/components/ui/"* && "$TOOL_NAME" == "Edit" ]]; then
  ERRORS="${ERRORS}AVISO: Componentes em src/components/ui/ sao primitivos shadcn. Use npx shadcn-ui@latest add <nome> para adicionar novos.\n"
fi

# === VALIDACAO 5: Edge Functions sem CORS ===
if [[ "$FILE_PATH" == *"supabase/functions/"* && "$FILE_PATH" == *"index.ts" ]]; then
  if [[ "$TOOL_NAME" == "Write" ]]; then
    if ! echo "$CONTENT" | grep -q "corsHeaders"; then
      ERRORS="${ERRORS}ERRO: Edge Function sem CORS headers. Adicione corsHeaders e tratamento de OPTIONS.\n"
    fi
  fi
fi

# === OUTPUT ===
if [[ -n "$ERRORS" ]]; then
  echo -e "$ERRORS" >&2
  exit 2
fi

exit 0
