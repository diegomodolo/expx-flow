import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular data de ontem (dia anterior)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const executionDate = yesterday.toISOString().split('T')[0];
    const since = `${executionDate}T00:00:00-03:00`; // UTC-3 (Brasília)
    const until = `${executionDate}T23:59:59-03:00`;

    console.log(`📅 Starting daily snapshot for date: ${executionDate}`);
    console.log(`⏰ Time range: ${since} to ${until}`);

    // Criar log de execução
    const { data: logEntry, error: logError } = await supabase
      .from('snapshot_execution_log')
      .insert({
        execution_date: executionDate,
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to create execution log:', logError);
      throw logError;
    }

    const logId = logEntry.id;
    let stats = {
      clientsProcessed: 0,
      campaignsProcessed: 0,
      adsetsProcessed: 0,
      adsProcessed: 0,
      snapshotsCreated: 0,
      errors: [] as string[]
    };

    // Buscar todos os clientes ativos com integração do Facebook
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        company_id,
        ad_account_id,
        facebook_ad_accounts!clients_ad_account_id_fkey (
          account_id,
          facebook_integrations (
            access_token,
            is_active
          )
        )
      `)
      .not('ad_account_id', 'is', null);

    if (clientsError) throw clientsError;

    console.log(`👥 Found ${clients?.length || 0} clients to process`);

    // Processar cada cliente
    for (const client of clients || []) {
      try {
        console.log(`\n🔄 Processing client: ${client.name}`);
        
        // Acessar dados do JOIN
        const fbAccount = client.facebook_ad_accounts;
        if (!fbAccount || !fbAccount.facebook_integrations) {
          console.log(`  ⚠️ No Facebook integration found for client ${client.name}`);
          continue;
        }
        
        // Verificar se a integração está ativa
        if (!fbAccount.facebook_integrations.is_active) {
          console.log(`  ⚠️ Facebook integration is inactive for client ${client.name}`);
          continue;
        }
        
        const fbAccountId = fbAccount.account_id.replace('act_', '');
        const accessToken = fbAccount.facebook_integrations.access_token;

        // Helper para fazer requisição ao Facebook API Insights
        const fetchFacebookInsights = async (endpoint: string, level: string) => {
          const url = `https://graph.facebook.com/v18.0/act_${fbAccountId}/insights?level=${level}&time_range={since:'${executionDate}',until:'${executionDate}'}&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,frequency,actions&access_token=${accessToken}`;
          
          const response = await fetch(url);
          
          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Facebook API error: ${response.status} - ${error}`);
          }
          
          const data = await response.json();
          return data.data || [];
        };

        // Helper para delay entre requisições (evitar rate limit)
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 1. BUSCAR E PROCESSAR CAMPANHAS
        try {
          const campaignInsights = await fetchFacebookInsights('insights', 'campaign');
          
          console.log(`  📊 Found ${campaignInsights.length} campaigns with data`);

          for (const insight of campaignInsights) {
            try {
              // Buscar campanha no banco pelo facebook_id
              const { data: dbCampaign } = await supabase
                .from('campaigns')
                .select('id')
                .eq('facebook_id', insight.campaign_id)
                .single();

              if (!dbCampaign) continue;

              // Calcular métricas
              const spend = parseFloat(insight.spend || '0');
              const impressions = parseInt(insight.impressions || '0');
              const clicks = parseInt(insight.clicks || '0');
              const reach = parseInt(insight.reach || '0');
              const frequency = parseFloat(insight.frequency || '0');
              
              // Extrair conversões (leads)
              let conversions = 0;
              if (insight.actions) {
                const leadAction = insight.actions.find((a: any) => 
                  a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead'
                );
                conversions = leadAction ? parseInt(leadAction.value) : 0;
              }

              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const cpa = conversions > 0 ? spend / conversions : spend;

              // Inserir snapshot
              const { error: insertError } = await supabase
                .from('performance_snapshots')
                .insert({
                  company_id: client.company_id,
                  entity_type: 'campaign',
                  entity_id: dbCampaign.id,
                  entity_name: insight.campaign_name,
                  campaign_id: dbCampaign.id,
                  client_id: client.id,
                  spend,
                  impressions,
                  clicks,
                  conversions,
                  reach,
                  ctr,
                  cpc,
                  cpa,
                  frequency,
                  snapshot_date: executionDate,
                  snapshot_period: 'daily'
                });

              if (insertError) {
                console.error(`    ⚠️ Error saving campaign snapshot: ${insertError.message}`);
                stats.errors.push(`Campaign ${insight.campaign_name}: ${insertError.message}`);
              } else {
                stats.snapshotsCreated++;
                stats.campaignsProcessed++;
              }

              await delay(100); // Pequeno delay entre inserções
            } catch (err) {
              console.error(`    ❌ Error processing campaign ${insight.campaign_id}:`, err);
              stats.errors.push(`Campaign ${insight.campaign_id}: ${err.message}`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Error fetching campaign insights:`, err);
          stats.errors.push(`Client ${client.name} campaigns: ${err.message}`);
        }

        await delay(500); // Delay entre diferentes tipos de entidade

        // 2. BUSCAR E PROCESSAR AD SETS
        try {
          const adsetInsights = await fetchFacebookInsights('insights', 'adset');
          
          console.log(`  📊 Found ${adsetInsights.length} ad sets with data`);

          for (const insight of adsetInsights) {
            try {
              const { data: dbAdSet } = await supabase
                .from('ad_sets')
                .select('id, campaign_id')
                .eq('facebook_id', insight.adset_id)
                .single();

              if (!dbAdSet) continue;

              const spend = parseFloat(insight.spend || '0');
              const impressions = parseInt(insight.impressions || '0');
              const clicks = parseInt(insight.clicks || '0');
              const reach = parseInt(insight.reach || '0');
              const frequency = parseFloat(insight.frequency || '0');
              
              let conversions = 0;
              if (insight.actions) {
                const leadAction = insight.actions.find((a: any) => 
                  a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead'
                );
                conversions = leadAction ? parseInt(leadAction.value) : 0;
              }

              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const cpa = conversions > 0 ? spend / conversions : spend;

              const { error: insertError } = await supabase
                .from('performance_snapshots')
                .insert({
                  company_id: client.company_id,
                  entity_type: 'ad_set',
                  entity_id: dbAdSet.id,
                  entity_name: insight.adset_name,
                  campaign_id: dbAdSet.campaign_id,
                  client_id: client.id,
                  spend,
                  impressions,
                  clicks,
                  conversions,
                  reach,
                  ctr,
                  cpc,
                  cpa,
                  frequency,
                  snapshot_date: executionDate,
                  snapshot_period: 'daily'
                });

              if (insertError) {
                console.error(`    ⚠️ Error saving ad set snapshot: ${insertError.message}`);
                stats.errors.push(`AdSet ${insight.adset_name}: ${insertError.message}`);
              } else {
                stats.snapshotsCreated++;
                stats.adsetsProcessed++;
              }

              await delay(100);
            } catch (err) {
              console.error(`    ❌ Error processing ad set ${insight.adset_id}:`, err);
              stats.errors.push(`AdSet ${insight.adset_id}: ${err.message}`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Error fetching ad set insights:`, err);
          stats.errors.push(`Client ${client.name} ad sets: ${err.message}`);
        }

        await delay(500);

        // 3. BUSCAR E PROCESSAR ADS
        try {
          const adsInsights = await fetchFacebookInsights('insights', 'ad');
          
          console.log(`  📊 Found ${adsInsights.length} ads with data`);

          for (const insight of adsInsights) {
            try {
              const { data: dbAd } = await supabase
                .from('ads')
                .select('id, campaign_id, ad_set_id')
                .eq('facebook_id', insight.ad_id)
                .single();

              if (!dbAd) continue;

              const spend = parseFloat(insight.spend || '0');
              const impressions = parseInt(insight.impressions || '0');
              const clicks = parseInt(insight.clicks || '0');
              const reach = parseInt(insight.reach || '0');
              const frequency = parseFloat(insight.frequency || '0');
              
              let conversions = 0;
              if (insight.actions) {
                const leadAction = insight.actions.find((a: any) => 
                  a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead'
                );
                conversions = leadAction ? parseInt(leadAction.value) : 0;
              }

              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const cpa = conversions > 0 ? spend / conversions : spend;

              const { error: insertError } = await supabase
                .from('performance_snapshots')
                .insert({
                  company_id: client.company_id,
                  entity_type: 'ad',
                  entity_id: dbAd.id,
                  entity_name: insight.ad_name,
                  campaign_id: dbAd.campaign_id,
                  client_id: client.id,
                  spend,
                  impressions,
                  clicks,
                  conversions,
                  reach,
                  ctr,
                  cpc,
                  cpa,
                  frequency,
                  snapshot_date: executionDate,
                  snapshot_period: 'daily'
                });

              if (insertError) {
                console.error(`    ⚠️ Error saving ad snapshot: ${insertError.message}`);
                stats.errors.push(`Ad ${insight.ad_name}: ${insertError.message}`);
              } else {
                stats.snapshotsCreated++;
                stats.adsProcessed++;
              }

              await delay(100);
            } catch (err) {
              console.error(`    ❌ Error processing ad ${insight.ad_id}:`, err);
              stats.errors.push(`Ad ${insight.ad_id}: ${err.message}`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Error fetching ad insights:`, err);
          stats.errors.push(`Client ${client.name} ads: ${err.message}`);
        }

        stats.clientsProcessed++;
        console.log(`✅ Client ${client.name} processed successfully`);
        
        await delay(1000); // Delay maior entre clientes
      } catch (err) {
        console.error(`❌ Error processing client ${client.name}:`, err);
        stats.errors.push(`Client ${client.name}: ${err.message}`);
      }
    }

    // Atualizar log de execução
    const finalStatus = stats.errors.length > 0 ? 
      (stats.snapshotsCreated > 0 ? 'partial' : 'failed') : 
      'completed';

    await supabase
      .from('snapshot_execution_log')
      .update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        clients_processed: stats.clientsProcessed,
        campaigns_processed: stats.campaignsProcessed,
        adsets_processed: stats.adsetsProcessed,
        ads_processed: stats.adsProcessed,
        snapshots_created: stats.snapshotsCreated,
        errors_count: stats.errors.length,
        error_messages: stats.errors.slice(0, 100) // Limitar a 100 mensagens
      })
      .eq('id', logId);

    console.log('\n📊 EXECUTION SUMMARY:');
    console.log(`  ✅ Clients processed: ${stats.clientsProcessed}`);
    console.log(`  📈 Campaigns: ${stats.campaignsProcessed}`);
    console.log(`  📊 Ad Sets: ${stats.adsetsProcessed}`);
    console.log(`  🎨 Ads: ${stats.adsProcessed}`);
    console.log(`  💾 Total snapshots: ${stats.snapshotsCreated}`);
    console.log(`  ❌ Errors: ${stats.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        execution_date: executionDate,
        stats: {
          clients_processed: stats.clientsProcessed,
          campaigns_processed: stats.campaignsProcessed,
          adsets_processed: stats.adsetsProcessed,
          ads_processed: stats.adsProcessed,
          snapshots_created: stats.snapshotsCreated,
          errors_count: stats.errors.length
        },
        log_id: logId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
