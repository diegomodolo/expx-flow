#!/bin/bash
# Hook: Roda ESLint no arquivo editado apos Write/Edit
# Captura erros de TypeScript e lint antes do commit

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# So validar arquivos TypeScript/TSX do projeto
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Ignorar arquivos fora do src/
if [[ "$FILE_PATH" != *"/src/"* ]]; then
  exit 0
fi

# Rodar ESLint silenciosamente
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
RESULT=$(npx eslint "$FILE_PATH" --quiet 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "ESLint encontrou problemas em $(basename "$FILE_PATH"):" >&2
  echo "$RESULT" >&2
  # Nao bloquear (exit 0), apenas informar
  exit 0
fi

exit 0
