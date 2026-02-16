/**
 * Shared helper to resolve the correct Instagram access token and IG user ID
 * based on whether the account is connected via Business Manager or Facebook Page.
 * 
 * - Page-linked accounts: use page_access_token + instagram_id
 * - Business Manager accounts WITH linked page: use page_access_token (preferred)
 * - Business Manager accounts WITHOUT linked page: try dynamic page lookup, then error
 */

interface ResolvedInstagramCredentials {
  accessToken: string;
  instagramUserId: string;
  source: 'page' | 'business_manager' | 'fallback';
}

export async function resolveInstagramCredentials(
  supabase: any,
  instagramAccountId: string,
  companyId: string
): Promise<ResolvedInstagramCredentials> {
  // Fetch the instagram account details
  const { data: igAccount, error: igError } = await supabase
    .from('instagram_accounts')
    .select('id, instagram_id, username, source, facebook_page_id')
    .eq('id', instagramAccountId)
    .single();

  if (igError || !igAccount) {
    throw new Error(`Instagram account not found: ${igError?.message || 'No data'}`);
  }

  const instagramUserId = igAccount.instagram_id;

  if (!instagramUserId) {
    throw new Error('Instagram account has no instagram_id');
  }

  // Business Manager accounts: prefer page_access_token when linked to a page
  if (igAccount.source === 'business_manager') {
    console.log(`[TokenResolver] BM account detected: @${igAccount.username} (${instagramUserId}).`);
    
    // Option 1: BM account has a linked facebook page
    if (igAccount.facebook_page_id) {
      const { data: fbPage } = await supabase
        .from('facebook_pages')
        .select('page_access_token, instagram_business_account_id')
        .eq('id', igAccount.facebook_page_id)
        .single();

      if (fbPage?.page_access_token) {
        console.log(`[TokenResolver] BM account has linked page. Using page_access_token.`);
        return {
          accessToken: fbPage.page_access_token,
          instagramUserId,
          source: 'business_manager',
        };
      }
    }

    // Option 2: Try to find a page dynamically by matching instagram_business_account_id
    console.log(`[TokenResolver] BM account without linked page. Searching for matching page...`);
    const { data: matchingPage } = await supabase
      .from('facebook_pages')
      .select('id, page_access_token, page_name')
      .eq('company_id', companyId)
      .eq('instagram_business_account_id', instagramUserId)
      .eq('is_active', true)
      .single();

    if (matchingPage?.page_access_token) {
      console.log(`[TokenResolver] Found matching page: ${matchingPage.page_name}. Linking and using page_access_token.`);
      
      // Auto-link the instagram account to this page
      await supabase
        .from('instagram_accounts')
        .update({ facebook_page_id: matchingPage.id })
        .eq('id', igAccount.id);

      return {
        accessToken: matchingPage.page_access_token,
        instagramUserId,
        source: 'business_manager',
      };
    }

    // Option 3: No page found - return descriptive error
    throw new Error(
      'Conta Instagram via Business Manager sem página vinculada. ' +
      'Sincronize as páginas do Facebook (Configurações > Facebook Ads > Atualizar Páginas) ' +
      'ou vincule esta conta Instagram a uma Página no Business Manager do Facebook.'
    );
  }

  // Page-linked accounts: use page access token
  if (igAccount.facebook_page_id) {
    console.log(`[TokenResolver] Page-linked account: @${igAccount.username}. Using page token.`);
    
    const { data: fbPage } = await supabase
      .from('facebook_pages')
      .select('page_access_token, instagram_business_account_id')
      .eq('id', igAccount.facebook_page_id)
      .single();

    if (fbPage?.page_access_token) {
      return {
        accessToken: fbPage.page_access_token,
        instagramUserId,
        source: 'page',
      };
    }
  }

  // Fallback: try user-level token
  console.log(`[TokenResolver] Fallback: using user-level token for @${igAccount.username}`);
  
  const { data: integration } = await supabase
    .from('facebook_integrations')
    .select('access_token')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (integration?.access_token) {
    return {
      accessToken: integration.access_token,
      instagramUserId,
      source: 'fallback',
    };
  }

  throw new Error('No access token found. Reconnect Facebook in settings.');
}
