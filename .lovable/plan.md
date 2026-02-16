

# Correção Sistêmica: Contas Instagram via Business Manager

## Diagnóstico do Problema

A causa raiz do erro `(#10) Application does not have permission` em todas as contas Instagram vinculadas via Business Manager (SacFiscal, exsistecnologia_, uncempresarial, izac.imendes, etc.) e a seguinte:

A API do Instagram Graph **exige obrigatoriamente** um `page_access_token` de uma Pagina do Facebook que tenha aquela conta Instagram conectada como seu `instagram_business_account`. O token de usuario (user-level token) nao funciona para acessar midias ou publicar no Instagram -- mesmo que o Business Manager tenha acesso a conta.

Atualmente, o sistema:
1. Sincroniza as paginas do Facebook via `/me/accounts` (paginas que o usuario gerencia diretamente)
2. Sincroniza as contas Instagram do Business Manager via `/{bm-id}/owned_instagram_accounts`
3. Salva as contas BM com `facebook_page_id = null` (sem vinculo a nenhuma pagina)
4. Na hora de buscar/postar, tenta usar o token de usuario -- que nao tem permissao

O problema: o sistema NAO busca as **paginas que pertencem ao Business Manager** (`/{bm-id}/owned_pages`). Essas paginas sao diferentes das paginas em `/me/accounts` e podem ter o vinculo correto com as contas Instagram do BM.

## Solucao Proposta

### Passo 1: Buscar paginas do Business Manager durante a sincronizacao

Atualizar a funcao `fetch-facebook-pages` para tambem buscar:
- `/{bm-id}/owned_pages?fields=id,name,access_token,instagram_business_account`
- `/{bm-id}/client_pages?fields=id,name,access_token,instagram_business_account`

Essas paginas serao salvas na tabela `facebook_pages` da mesma forma que as paginas de `/me/accounts`.

### Passo 2: Vincular contas Instagram do BM as suas paginas

Apos processar todas as paginas (incluindo as do BM), fazer um cruzamento:
- Para cada conta Instagram com `source = 'business_manager'` e `facebook_page_id = null`
- Verificar se alguma pagina tem `instagram_business_account_id` igual ao `instagram_id` dessa conta
- Se encontrar, atualizar o `facebook_page_id` da conta Instagram

### Passo 3: Atualizar o Token Resolver

Modificar o `_shared/instagram-token-resolver.ts`:
- Contas BM **com** pagina vinculada: usar o `page_access_token` dessa pagina (mesmo comportamento de contas `source: page`)
- Contas BM **sem** pagina vinculada: retornar erro claro explicando que o Instagram precisa ser vinculado a uma Pagina no Business Manager

### Passo 4: Diagnostico visual no modal "Testar Conexao"

Melhorar o `InstagramConnectionTestModal` para mostrar informacoes de diagnostico:
- Se a conta e do tipo BM e nao tem pagina vinculada, mostrar mensagem orientando o usuario a vincular a conta a uma pagina no Business Manager do Facebook
- Mostrar o tipo de token sendo utilizado (pagina vs BM vs fallback)

## Detalhes Tecnicos

### Alteracoes em `supabase/functions/fetch-facebook-pages/index.ts`

Adicionar busca de paginas do BM apos a linha 171 (dentro do loop de Business Managers):

```typescript
// Fetch pages owned by the BM
const bmPagesUrl = `https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,name,access_token,category,instagram_business_account&limit=100&access_token=${accessToken}`;
const bmPagesResponse = await fetch(bmPagesUrl);
if (bmPagesResponse.ok) {
  const bmPagesData = await bmPagesResponse.json();
  // Upsert each BM page into facebook_pages table
  // Then check instagram_business_account linkage
}
```

Apos processar tudo, cruzar dados:

```typescript
// Cross-reference: link BM IG accounts to their pages
for (const igAccount of bmInstagramAccounts) {
  const linkedPage = allPages.find(p => 
    p.instagram_business_account_id === igAccount.instagram_id
  );
  if (linkedPage) {
    await supabase
      .from('instagram_accounts')
      .update({ facebook_page_id: linkedPage.id })
      .eq('id', igAccount.id);
  }
}
```

### Alteracoes em `supabase/functions/_shared/instagram-token-resolver.ts`

```typescript
if (igAccount.source === 'business_manager') {
  // First check if we have a linked page (preferred)
  if (igAccount.facebook_page_id) {
    const { data: fbPage } = await supabase
      .from('facebook_pages')
      .select('page_access_token, instagram_business_account_id')
      .eq('id', igAccount.facebook_page_id)
      .single();

    if (fbPage?.page_access_token) {
      return {
        accessToken: fbPage.page_access_token,
        instagramUserId,
        source: 'business_manager',
      };
    }
  }
  // No page linked - try to find one dynamically
  // If not found, throw descriptive error
  throw new Error(
    'Conta Instagram via Business Manager sem pagina vinculada. ' +
    'Acesse o Business Manager do Facebook e vincule esta conta a uma Pagina.'
  );
}
```

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/fetch-facebook-pages/index.ts` | Buscar `owned_pages` e `client_pages` do BM; cruzar IG accounts com paginas |
| `supabase/functions/_shared/instagram-token-resolver.ts` | BM accounts usam page token quando vinculadas; erro claro quando nao |
| `supabase/functions/fetch-instagram-media/index.ts` | Alinhar logica com o token resolver atualizado |
| `src/components/clients/InstagramConnectionTestModal.tsx` | Mostrar diagnostico para contas BM sem pagina |

### Fluxo Pos-Implementacao

1. Ir em **Configuracoes > Facebook Ads** e clicar em **"Atualizar Paginas"**
2. O sistema agora buscara tambem as paginas do Business Manager
3. Se a pagina do "Saque Fiscal" estiver vinculada ao Instagram "sacfiscal" no BM, o vinculo sera feito automaticamente
4. Testar a conexao novamente
5. Se o erro persistir, significa que no Business Manager do Facebook a conta Instagram nao esta atribuida a nenhuma Pagina -- nesse caso, e necessario fazer essa atribuicao diretamente no Business Manager do Facebook

