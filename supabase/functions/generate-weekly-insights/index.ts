// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      clientData,
      currentWeekMetrics,
      previousWeekMetrics,
      campaignsData,
    } = await req.json();

    console.log("Generating weekly insights for client:", clientData.name);

    // Prepare context for AI analysis
    const analysisContext = {
      client: {
        name: clientData.name,
        sector: clientData.sector,
        monthlyBudget: clientData.monthly_budget,
        status: clientData.status,
      },
      currentWeek: {
        spend: currentWeekMetrics.totalSpend,
        conversions: currentWeekMetrics.totalConversions,
        cpa: currentWeekMetrics.averageCPA,
        ctr: currentWeekMetrics.averageCTR,
        impressions: currentWeekMetrics.totalImpressions,
        clicks: currentWeekMetrics.totalClicks,
        reach: currentWeekMetrics.totalReach,
        roas: currentWeekMetrics.roas,
      },
      previousWeek: {
        spend: previousWeekMetrics.totalSpend,
        conversions: previousWeekMetrics.totalConversions,
        cpa: previousWeekMetrics.averageCPA,
        ctr: previousWeekMetrics.averageCTR,
        impressions: previousWeekMetrics.totalImpressions,
        clicks: previousWeekMetrics.totalClicks,
        reach: previousWeekMetrics.totalReach,
        roas: previousWeekMetrics.roas,
      },
      activeCampaigns: campaignsData.filter(
        (c: unknown) => c.status === "active",
      ).length,
      totalCampaigns: campaignsData.length,
    };

    // Calculate key changes
    const cpaChange =
      previousWeekMetrics.averageCPA > 0
        ? ((currentWeekMetrics.averageCPA - previousWeekMetrics.averageCPA) /
            previousWeekMetrics.averageCPA) *
          100
        : 0;

    const conversionsChange =
      previousWeekMetrics.totalConversions > 0
        ? ((currentWeekMetrics.totalConversions -
            previousWeekMetrics.totalConversions) /
            previousWeekMetrics.totalConversions) *
          100
        : 0;

    const spendChange =
      previousWeekMetrics.totalSpend > 0
        ? ((currentWeekMetrics.totalSpend - previousWeekMetrics.totalSpend) /
            previousWeekMetrics.totalSpend) *
          100
        : 0;

    const prompt = `
Como especialista em marketing digital, analise os dados abaixo e gere insights e recomendações para o relatório semanal do cliente.

## Dados do Cliente:
${JSON.stringify(analysisContext, null, 2)}

## Variações Semanais:
- CPA: ${cpaChange.toFixed(1)}% (${cpaChange > 0 ? "aumento" : "redução"})
- Conversões: ${conversionsChange.toFixed(1)}% (${conversionsChange > 0 ? "aumento" : "redução"})
- Investimento: ${spendChange.toFixed(1)}% (${spendChange > 0 ? "aumento" : "redução"})

## Tarefas:
1. Identifique os 3 principais insights baseados na performance semanal
2. Para cada insight, classifique como: "warning" (problema), "opportunity" (oportunidade) ou "action_required" (ação urgente)
3. Defina a prioridade: "high", "medium" ou "low"
4. Forneça recomendações específicas e acionáveis

## Critérios de Análise:
- CPA ideal: < R$ 120
- CTR ideal: > 1.0%
- Variações acima de 20% são significativas
- Ausência de conversões com investimento > R$ 500 é crítica
- Campanhas inativas com orçamento disponível são oportunidades

Responda APENAS em JSON válido no formato:
{
  "insights": [
    {
      "id": "unique-id",
      "type": "warning|opportunity|action_required",
      "title": "Título do insight",
      "description": "Descrição detalhada do que foi identificado",
      "recommendation": "Recomendação específica e acionável",
      "priority": "high|medium|low",
      "metric": "Métrica principal relacionada",
      "value": "Valor atual da métrica",
      "relatedCampaignIds": []
    }
  ]
}`;

    const aiResult = await callAI({
      functionName: "generate-weekly-insights",
      systemPrompt:
        "Você é um especialista em análise de campanhas de marketing digital com foco em Facebook e Instagram Ads. Forneça sempre respostas em JSON válido.",
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: { type: "json_object" },
    });

    const aiContent = aiResult.content;

    console.log("AI response content:", aiContent);

    let insights;
    try {
      insights = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback to basic insights if AI parsing fails
      insights = generateFallbackInsights(
        currentWeekMetrics,
        previousWeekMetrics,
        cpaChange,
        conversionsChange,
      );
    }

    // Validate and ensure we have proper insights structure
    if (!insights.insights || !Array.isArray(insights.insights)) {
      insights = generateFallbackInsights(
        currentWeekMetrics,
        previousWeekMetrics,
        cpaChange,
        conversionsChange,
      );
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-weekly-insights function:", error);

    // Return fallback insights on any error
    const fallbackInsights = {
      insights: [
        {
          id: "error-fallback",
          type: "action_required",
          title: "Análise Manual Necessária",
          description:
            "Não foi possível gerar insights automáticos. Recomenda-se análise manual dos dados.",
          recommendation:
            "Revise manualmente as métricas de performance e identifique oportunidades de otimização.",
          priority: "medium",
          metric: "Sistema",
          value: "N/A",
        },
      ],
    };

    return new Response(JSON.stringify(fallbackInsights), {
      status: 200, // Return 200 with fallback instead of error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackInsights(
  currentWeek: unknown,
  previousWeek: unknown,
  cpaChange: number,
  conversionsChange: number,
) {
  const insights = [];

  // CPA Analysis
  if (currentWeek.averageCPA > 120) {
    insights.push({
      id: "high-cpa-fallback",
      type: "warning",
      title: "CPA Elevado Detectado",
      description: `O CPA atual de R$ ${currentWeek.averageCPA.toFixed(2)} está acima da meta de R$ 120.`,
      recommendation:
        "Revise a segmentação das campanhas e otimize os criativos para melhorar a performance.",
      priority: "high",
      metric: "CPA",
      value: `R$ ${currentWeek.averageCPA.toFixed(2)}`,
    });
  }

  // Conversions Analysis
  if (currentWeek.totalConversions === 0 && currentWeek.totalSpend > 0) {
    insights.push({
      id: "no-conversions-fallback",
      type: "action_required",
      title: "Nenhuma Conversão Registrada",
      description:
        "Campanhas ativas não estão gerando conversões apesar do investimento.",
      recommendation:
        "Verifique o pixel de conversão, revise a landing page e analise a segmentação.",
      priority: "high",
      metric: "Conversões",
      value: "0",
    });
  }

  // Performance Improvement Opportunity
  if (currentWeek.averageCPA < 80 && currentWeek.totalConversions >= 10) {
    insights.push({
      id: "scale-opportunity-fallback",
      type: "opportunity",
      title: "Oportunidade de Escalonamento",
      description: `CPA baixo (R$ ${currentWeek.averageCPA.toFixed(2)}) e bom volume de conversões indicam potencial para escalar.`,
      recommendation:
        "Considere aumentar o orçamento em 20-30% para capturar mais volume mantendo a eficiência.",
      priority: "medium",
      metric: "CPA",
      value: `R$ ${currentWeek.averageCPA.toFixed(2)}`,
    });
  }

  return { insights: insights.slice(0, 3) };
}
