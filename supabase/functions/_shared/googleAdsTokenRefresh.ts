/**
 * Utilitário para gerenciar refresh automático de tokens do Google Ads
 * 
 * O access_token do Google OAuth 2.0 expira em 1 hora.
 * Esta função verifica se o token está prestes a expirar e o renova automaticamente.
 */

interface GoogleAdsIntegration {
  id: string;
  company_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  is_active: boolean;
}

interface RefreshResult {
  accessToken: string;
  wasRefreshed: boolean;
  newExpiresAt?: string;
}

/**
 * Verifica se o token está expirado ou prestes a expirar (margem de 5 minutos)
 */
export function isTokenExpiredOrExpiring(expiresAt: string, marginMinutes: number = 5): boolean {
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const marginMs = marginMinutes * 60 * 1000;
  
  return expirationDate.getTime() - now.getTime() < marginMs;
}

/**
 * Renova o access_token usando o refresh_token
 */
export async function refreshGoogleAdsToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number }> {
  console.log('Refreshing Google Ads access token...');
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh Google Ads token. User may need to reconnect.');
  }

  const tokens = await tokenResponse.json();
  console.log('Token refreshed successfully');
  
  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
  };
}

/**
 * Obtém um token válido para a integração, renovando automaticamente se necessário.
 * Atualiza o banco de dados se o token foi renovado.
 */
export async function getValidGoogleAdsToken(
  supabaseClient: any,
  integration: GoogleAdsIntegration
): Promise<RefreshResult> {
  // Verifica se o token está expirado ou expirando em breve
  if (!isTokenExpiredOrExpiring(integration.expires_at)) {
    return {
      accessToken: integration.access_token,
      wasRefreshed: false,
    };
  }

  console.log('Token expired or expiring soon, refreshing...');
  
  const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Google Ads OAuth credentials not configured');
  }

  if (!integration.refresh_token) {
    throw new Error('No refresh token available. User needs to reconnect Google Ads.');
  }

  // Renovar o token
  const { accessToken, expiresIn } = await refreshGoogleAdsToken(
    integration.refresh_token,
    clientId,
    clientSecret
  );

  // Calcular nova data de expiração
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Atualizar no banco de dados
  const { error: updateError } = await supabaseClient
    .from('google_ads_integrations')
    .update({
      access_token: accessToken,
      expires_at: newExpiresAt,
    })
    .eq('id', integration.id);

  if (updateError) {
    console.error('Failed to update token in database:', updateError);
    // Mesmo que falhe ao salvar, retornamos o token para a operação atual
  } else {
    console.log('Token updated in database, new expiry:', newExpiresAt);
  }

  return {
    accessToken,
    wasRefreshed: true,
    newExpiresAt,
  };
}
