/**
 * Shared helper to resolve the correct Instagram access token and IG user ID
 * based on whether the account is connected via Business Manager or Facebook Page.
 * 
 * - Page-linked accounts: use page_access_token + instagram_id (which matches the page's IG business account)
 * - Business Manager accounts: use user-level token (from facebook_integrations) + original instagram_id from BM
 *   Because the page's instagram_business_account_id may be a DIFFERENT account (e.g., personal)
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

  // Business Manager accounts: use user-level token with BM permissions
  if (igAccount.source === 'business_manager') {
    console.log(`[TokenResolver] BM account detected: @${igAccount.username} (${instagramUserId}). Using user-level token.`);
    
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
        source: 'business_manager',
      };
    }

    throw new Error('No active Facebook integration found for Business Manager account');
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
