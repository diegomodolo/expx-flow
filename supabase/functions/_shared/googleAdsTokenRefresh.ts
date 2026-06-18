/**
 * Utilitário para gerenciar refresh automático de tokens do Google Ads
 *
 * O access_token do Google OAuth 2.0 expira em 1 hora.
 * Esta função verifica se o token está prestes a expirar e o renova automaticamente.
 */

import { getSystemConfig, resolveCredential } from "./getSystemConfig.ts";
import type { SystemConfigGoogle } from "./getSystemConfig.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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
export function isTokenExpiredOrExpiring(
  expiresAt: string,
  marginMinutes: number = 5,
): boolean {
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
  clientSecret: string,
): Promise<{
  accessToken: string;
  expiresIn: number;
  newRefreshToken?: string;
}> {
  console.log("Refreshing Google Ads access token...");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token refresh failed:", errorText);
    throw new Error(
      "Failed to refresh Google Ads token. User may need to reconnect.",
    );
  }

  const tokens = await tokenResponse.json();
  console.log(
    "Token refreshed successfully. New refresh_token received:",
    !!tokens.refresh_token,
  );

  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    newRefreshToken: tokens.refresh_token || undefined,
  };
}

/**
 * Obtém um token válido para a integração, renovando automaticamente se necessário.
 * Atualiza o banco de dados se o token foi renovado.
 */
/**
 * Força a renovação do token, independente de estar expirado ou não.
 * Use esta função no início de sincronizações agendadas para garantir token válido por 1 hora.
 */

/**
 * Resolve client_id/client_secret do Google Ads (env > banco system_config_google).
 * Mensagens PT-BR apontando para Configurações > Sistema > Google.
 */
async function resolveAdsOAuthCredentials(
  supabaseClient: SupabaseClient,
): Promise<{ clientId: string; clientSecret: string }> {
  const gCfg = await getSystemConfig<SystemConfigGoogle>(
    supabaseClient,
    "google",
  );
  const clientId = resolveCredential(
    Deno.env.get("GOOGLE_ADS_CLIENT_ID"),
    gCfg?.ads_client_id,
    "Google Ads Client ID não configurado. Acesse Configurações > Sistema > Google.",
  );
  const clientSecret = resolveCredential(
    Deno.env.get("GOOGLE_ADS_CLIENT_SECRET"),
    gCfg?.ads_client_secret,
    "Google Ads Client Secret não configurado. Acesse Configurações > Sistema > Google.",
  );
  return { clientId, clientSecret };
}

export async function forceRefreshGoogleAdsToken(
  supabaseClient: SupabaseClient,
  integration: GoogleAdsIntegration,
): Promise<RefreshResult> {
  console.log("🔄 Forçando renovação do token (scheduled sync)...");

  const { clientId, clientSecret } =
    await resolveAdsOAuthCredentials(supabaseClient);

  if (!integration.refresh_token) {
    throw new Error(
      "No refresh token available. User needs to reconnect Google Ads.",
    );
  }

  // Renovar o token incondicionalmente
  const { accessToken, expiresIn, newRefreshToken } =
    await refreshGoogleAdsToken(
      integration.refresh_token,
      clientId,
      clientSecret,
    );

  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Atualizar no banco de dados (incluindo novo refresh_token se retornado)
  const updateData: Record<string, string> = {
    access_token: accessToken,
    expires_at: newExpiresAt,
  };
  if (newRefreshToken) {
    updateData.refresh_token = newRefreshToken;
    console.log("✅ Novo refresh_token recebido e salvo!");
  }

  const { error: updateError } = await supabaseClient
    .from("google_ads_integrations")
    .update(updateData)
    .eq("id", integration.id);

  if (updateError) {
    console.error("Failed to update token in database:", updateError);
  } else {
    console.log("✅ Token renovado e salvo, nova expiração:", newExpiresAt);
  }

  return {
    accessToken,
    wasRefreshed: true,
    newExpiresAt,
  };
}

/**
 * Obtém um token válido para a integração, renovando automaticamente se necessário.
 * Atualiza o banco de dados se o token foi renovado.
 * Use esta função para chamadas manuais (UI) - só renova se estiver expirando.
 */
export async function getValidGoogleAdsToken(
  supabaseClient: SupabaseClient,
  integration: GoogleAdsIntegration,
): Promise<RefreshResult> {
  // Verifica se o token está expirado ou expirando em breve
  if (!isTokenExpiredOrExpiring(integration.expires_at)) {
    return {
      accessToken: integration.access_token,
      wasRefreshed: false,
    };
  }

  console.log("Token expired or expiring soon, refreshing...");

  const { clientId, clientSecret } =
    await resolveAdsOAuthCredentials(supabaseClient);

  if (!integration.refresh_token) {
    throw new Error(
      "No refresh token available. User needs to reconnect Google Ads.",
    );
  }

  // Renovar o token
  const { accessToken, expiresIn, newRefreshToken } =
    await refreshGoogleAdsToken(
      integration.refresh_token,
      clientId,
      clientSecret,
    );

  // Calcular nova data de expiração
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Atualizar no banco de dados (incluindo novo refresh_token se retornado)
  const updateData: Record<string, string> = {
    access_token: accessToken,
    expires_at: newExpiresAt,
  };
  if (newRefreshToken) {
    updateData.refresh_token = newRefreshToken;
    console.log("✅ Novo refresh_token recebido e salvo!");
  }

  const { error: updateError } = await supabaseClient
    .from("google_ads_integrations")
    .update(updateData)
    .eq("id", integration.id);

  if (updateError) {
    console.error("Failed to update token in database:", updateError);
  } else {
    console.log("Token updated in database, new expiry:", newExpiresAt);
  }

  return {
    accessToken,
    wasRefreshed: true,
    newExpiresAt,
  };
}
