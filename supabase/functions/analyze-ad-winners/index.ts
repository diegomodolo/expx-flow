import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdPerformance {
  id: string;
  facebook_ad_id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  days_running: number;
}

interface WinnerCriteria {
  min_spend: number;
  min_days: number;
  min_conversions: number;
  cpa_threshold_percentile: number;
  ctr_threshold_percentile: number;
}

const DEFAULT_CRITERIA: WinnerCriteria = {
  min_spend: 50,
  min_days: 3,
  min_conversions: 5,
  cpa_threshold_percentile: 25, // Top 25% CPA
  ctr_threshold_percentile: 75, // Top 25% CTR (75th percentile and above)
};

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function determineWinnerReason(ad: AdPerformance, avgCPA: number, avgCTR: number): string {
  const reasons: string[] = [];
  
  if (ad.cpa > 0 && ad.cpa < avgCPA * 0.7) {
    reasons.push(`CPA ${((1 - ad.cpa / avgCPA) * 100).toFixed(0)}% abaixo da média`);
  }
  
  if (ad.ctr > avgCTR * 1.3) {
    reasons.push(`CTR ${((ad.ctr / avgCTR - 1) * 100).toFixed(0)}% acima da média`);
  }
  
  if (ad.conversions > 10) {
    reasons.push(`${ad.conversions} conversões`);
  }
  
  if (ad.roas && ad.roas > 2) {
    reasons.push(`ROAS ${ad.roas.toFixed(1)}x`);
  }
  
  return reasons.length > 0 ? reasons.join(' | ') : 'Performance consistente';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, company_id, criteria } = await req.json();

    if (!client_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'client_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const winnerCriteria = { ...DEFAULT_CRITERIA, ...criteria };

    console.log(`Analyzing winners for client ${client_id} with criteria:`, winnerCriteria);

    // Fetch ads with performance data
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_id', client_id)
      .eq('is_active', true);

    if (adsError) {
      console.error('Error fetching ads:', adsError);
      throw adsError;
    }

    if (!ads || ads.length === 0) {
      console.log('No ads found for analysis');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No ads found for analysis',
          winners: [],
          analyzed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate days running for each ad
    const adsWithDays: AdPerformance[] = ads.map(ad => {
      const createdAt = new Date(ad.created_at);
      const now = new Date();
      const daysRunning = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: ad.id,
        facebook_ad_id: ad.facebook_id,
        name: ad.name,
        spend: ad.spend || 0,
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        conversions: ad.conversions || 0,
        ctr: ad.ctr || 0,
        cpa: ad.cpa || 0,
        roas: ad.spend > 0 && ad.conversions > 0 ? (ad.conversions * 100) / ad.spend : 0, // Simplified ROAS
        days_running: daysRunning,
      };
    });

    // Filter ads that meet minimum criteria
    const eligibleAds = adsWithDays.filter(ad => 
      ad.spend >= winnerCriteria.min_spend &&
      ad.days_running >= winnerCriteria.min_days &&
      ad.conversions >= winnerCriteria.min_conversions
    );

    console.log(`${eligibleAds.length} ads meet minimum criteria out of ${adsWithDays.length}`);

    if (eligibleAds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No ads meet minimum criteria yet',
          winners: [],
          analyzed: adsWithDays.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate percentile thresholds
    const cpas = eligibleAds.filter(a => a.cpa > 0).map(a => a.cpa);
    const ctrs = eligibleAds.map(a => a.ctr);
    
    const cpaThreshold = calculatePercentile(cpas, winnerCriteria.cpa_threshold_percentile);
    const ctrThreshold = calculatePercentile(ctrs, winnerCriteria.ctr_threshold_percentile);
    
    const avgCPA = cpas.length > 0 ? cpas.reduce((a, b) => a + b, 0) / cpas.length : 0;
    const avgCTR = ctrs.length > 0 ? ctrs.reduce((a, b) => a + b, 0) / ctrs.length : 0;

    console.log(`Thresholds - CPA: ${cpaThreshold}, CTR: ${ctrThreshold}`);

    // Identify winners
    const winners = eligibleAds.filter(ad => {
      const goodCPA = ad.cpa > 0 && ad.cpa <= cpaThreshold;
      const goodCTR = ad.ctr >= ctrThreshold;
      return goodCPA || goodCTR;
    });

    console.log(`Found ${winners.length} winning ads`);

    // Upsert winners to ad_performance_winners table
    const winnersToUpsert = winners.map(winner => ({
      client_id,
      company_id,
      ad_id: winner.id,
      facebook_ad_id: winner.facebook_ad_id,
      ad_name: winner.name,
      spend: winner.spend,
      impressions: winner.impressions,
      clicks: winner.clicks,
      conversions: winner.conversions,
      ctr: winner.ctr,
      cpa: winner.cpa,
      roas: winner.roas,
      days_running: winner.days_running,
      is_winner: true,
      winner_reason: determineWinnerReason(winner, avgCPA, avgCTR),
      last_analyzed_at: new Date().toISOString(),
    }));

    if (winnersToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('ad_performance_winners')
        .upsert(winnersToUpsert, { 
          onConflict: 'ad_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting winners:', upsertError);
        throw upsertError;
      }
    }

    // Mark non-winners as not winners
    const winnerIds = winners.map(w => w.id);
    const nonWinnerIds = eligibleAds.filter(a => !winnerIds.includes(a.id)).map(a => a.id);

    if (nonWinnerIds.length > 0) {
      const { error: updateError } = await supabase
        .from('ad_performance_winners')
        .update({ is_winner: false, last_analyzed_at: new Date().toISOString() })
        .in('ad_id', nonWinnerIds);

      if (updateError) {
        console.error('Error updating non-winners:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: adsWithDays.length,
        eligible: eligibleAds.length,
        winners: winnersToUpsert,
        thresholds: {
          cpa: cpaThreshold,
          ctr: ctrThreshold,
          avgCPA,
          avgCTR,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-ad-winners:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
