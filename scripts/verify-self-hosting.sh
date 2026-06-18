#!/usr/bin/env bash
# ============================================================
# verify-self-hosting.sh — Verificação ponta-a-ponta do spec §10
# ------------------------------------------------------------
# Roda todos os 9 checks do SPEC_SELF_HOSTING.md.
# Sai com código 0 se TODOS passarem, 1 caso contrário.
# ============================================================
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}OK${NC}   $1"; }
fail() { echo -e "${RED}FALHOU${NC} $1"; FAILED=1; }
info() { echo -e "${YELLOW}INFO${NC} $1"; }

FAILED=0

echo "=============================="
echo "Self-Hosting Verification — §10"
echo "=============================="
echo ""

# 1. Nenhuma string do project ID no frontend
# (ignora o próprio arquivo de teste que contém os patterns como regex)
if grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "ejwpfztkspbvmuwwiwmk" src/ 2>/dev/null | grep -v "no-hardcode.test.ts" | grep -q .; then
  fail "1. Project ID do dev encontrado em src/"
  grep -rn "ejwpfztkspbvmuwwiwmk" src/ 2>/dev/null | grep -v "no-hardcode.test.ts" | head -5
else
  ok "1. src/ sem project ID do dev"
fi

# 2. Nenhum domínio hardcoded no frontend
if grep -rqE --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "controledetrafego\.com\.br|expxflow\.com\.br" src/ 2>/dev/null | grep -v "no-hardcode.test.ts" | grep -q .; then
  fail "2. Domínio do dev encontrado em src/"
else
  ok "2. src/ sem domínios do dev"
fi

# 3. Nenhum domínio hardcoded nas Edge Functions
if grep -rqE "controledetrafego\.com\.br|expxflow\.com\.br" supabase/functions/ 2>/dev/null; then
  fail "3. Domínio do dev encontrado em supabase/functions/"
  grep -rnE "controledetrafego\.com\.br|expxflow\.com\.br" supabase/functions/ | head -5
else
  ok "3. supabase/functions/ sem domínios do dev"
fi

# 4. Nenhum App ID hardcoded
if grep -rqE --include="*.ts" --include="*.tsx" "1118192076871259|1442283340343262" src/ 2>/dev/null | grep -v "no-hardcode.test.ts" | grep -q .; then
  fail "4. Facebook App ID do dev encontrado em src/"
else
  if grep -rqE "1118192076871259|1442283340343262" supabase/ 2>/dev/null; then
    fail "4b. Facebook App ID do dev encontrado em supabase/"
    grep -rnE "1118192076871259|1442283340343262" supabase/ | head -5
  else
    ok "4. Sem Facebook App IDs hardcoded"
  fi
fi

# 5. Nenhum username GitHub hardcoded
if grep -rn "bittencourtthulio" src/ supabase/ 2>/dev/null | grep -v "no-hardcode.test.ts" | grep -q .; then
  fail "5. Username GitHub do dev encontrado"
  grep -rn "bittencourtthulio" src/ supabase/ 2>/dev/null | grep -v "no-hardcode.test.ts" | head -5
else
  ok "5. Sem username GitHub do dev"
fi

# 6. URL Railway proxy
if grep -rq "refreshing-beauty-production-f560\.up\.railway\.app" src/ supabase/ 2>/dev/null; then
  fail "5b. URL Railway do dev encontrada"
  grep -rn "refreshing-beauty-production-f560" src/ supabase/ | head -5
else
  ok "5b. Sem URL Railway do dev"
fi

# 7. .env.example existe
if [ -f .env.example ]; then
  ok "7. .env.example existe"
  # Verifica se tem as vars essenciais
  if grep -q "VITE_SUPABASE_URL" .env.example && grep -q "VITE_SUPABASE_ANON_KEY" .env.example; then
    ok "7a. .env.example tem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"
  else
    fail "7a. .env.example sem variáveis essenciais"
  fi
else
  fail "7. .env.example não existe"
fi

# 8. PNGs válidos em public/
PNG_OK=0
for f in public/logo-full.png public/logo-icon.png; do
  if file "$f" 2>/dev/null | grep -q "PNG image"; then
    PNG_OK=$((PNG_OK+1))
  else
    fail "8. $f não é PNG válido"
  fi
done
if [ "$PNG_OK" -eq 2 ]; then
  ok "8. PNGs em public/ são válidos"
fi

# 9. Build sem erros
info "9. Rodando npm run build (pode levar ~30s)..."
if npm run build >/dev/null 2>&1; then
  ok "9. npm run build limpo"
else
  fail "9. npm run build com erros"
fi

echo ""
echo "=============================="
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}TODOS OS CHECKS PASSARAM${NC}"
  exit 0
else
  echo -e "${RED}HÁ CHECKS FALHANDO${NC}"
  exit 1
fi
