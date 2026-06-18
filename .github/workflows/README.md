# Workflows

Os workflows originais de automação de desenvolvimento (Claude, Jules, auto-PR, etc.)
foram movidos para `.github.dev/workflows/`. Eles são específicos do fluxo de
desenvolvimento do autor original e NÃO são necessários para operar uma instalação
self-hosted do Expx Flow.

Para reativar algum workflow no seu fork, copie o `.yml` correspondente de
`.github.dev/workflows/` para `.github/workflows/` e ajuste as referências
ao seu próprio repositório/usuário.
