import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdSetMismatch {
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  adSetName: string;
  adSetFacebookId: string;
  campaignName: string;
  campaignFacebookId: string;
  mismatchType: "instagram" | "facebook_page" | "both";
  expectedInstagram: string | null;
  actualInstagram: string | null;
  expectedPage: string | null;
  actualPage: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active clients with their linked accounts
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        "id, name, avatar, ad_account_id, facebook_page_id, instagram_account_id",
      )
      .eq("company_id", companyId)
      .eq("is_canceled", false)
      .eq("is_paused", false)
      .not("ad_account_id", "is", null);

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ mismatches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get facebook pages for these clients
    const pageIds = clients.map((c) => c.facebook_page_id).filter(Boolean);
    const pageMap = new Map<
      string,
      { page_id: string; instagram_business_account_id: string | null }
    >();

    if (pageIds.length > 0) {
      const { data: pages } = await supabase
        .from("facebook_pages")
        .select("id, page_id, instagram_business_account_id")
        .in("id", pageIds);

      (pages || []).forEach((p) => {
        pageMap.set(p.id, {
          page_id: p.page_id,
          instagram_business_account_id: p.instagram_business_account_id,
        });
      });
    }

    // Get instagram accounts for these clients
    const igIds = clients.map((c) => c.instagram_account_id).filter(Boolean);
    const igMap = new Map<string, { instagram_id: string; username: string }>();

    if (igIds.length > 0) {
      const { data: igAccounts } = await supabase
        .from("instagram_accounts")
        .select("id, instagram_id, username")
        .in("id", igIds);

      (igAccounts || []).forEach((ig) => {
        igMap.set(ig.id, {
          instagram_id: ig.instagram_id,
          username: ig.username,
        });
      });
    }

    // Get ad accounts with integration (for access token)
    const adAccountIds = [
      ...new Set(clients.map((c) => c.ad_account_id).filter(Boolean)),
    ];

    const { data: adAccounts } = await supabase
      .from("facebook_ad_accounts")
      .select("id, account_id, integration_id")
      .in("id", adAccountIds);

    if (!adAccounts || adAccounts.length === 0) {
      return new Response(JSON.stringify({ mismatches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get integrations for access tokens
    const integrationIds = [
      ...new Set(adAccounts.map((a) => a.integration_id)),
    ];
    const { data: integrations } = await supabase
      .from("facebook_integrations")
      .select("id, access_token")
      .in("id", integrationIds)
      .eq("is_active", true);

    const integrationMap = new Map<string, string>();
    (integrations || []).forEach((i) => {
      integrationMap.set(i.id, i.access_token);
    });

    const adAccountMap = new Map<
      string,
      { account_id: string; accessToken: string }
    >();
    (adAccounts || []).forEach((a) => {
      const token = integrationMap.get(a.integration_id);
      if (token) {
        adAccountMap.set(a.id, {
          account_id: a.account_id,
          accessToken: token,
        });
      }
    });

    const mismatches: AdSetMismatch[] = [];

    // Process each client
    for (const client of clients) {
      if (!client.ad_account_id) continue;

      const adAccountInfo = adAccountMap.get(client.ad_account_id);
      if (!adAccountInfo) continue;

      // Get client's expected page_id and instagram_id
      const clientPage = client.facebook_page_id
        ? pageMap.get(client.facebook_page_id)
        : null;
      const clientIg = client.instagram_account_id
        ? igMap.get(client.instagram_account_id)
        : null;

      // If client has no linked page or instagram, skip (we can't compare)
      if (!clientPage && !clientIg) continue;

      const expectedPageId = clientPage?.page_id || null;
      const expectedIgId =
        clientPage?.instagram_business_account_id ||
        clientIg?.instagram_id ||
        null;

      try {
        // Fetch active ad sets from Meta API with promoted_object
        const accountId = adAccountInfo.account_id.startsWith("act_")
          ? adAccountInfo.account_id
          : `act_${adAccountInfo.account_id}`;

        const allAdSets: unknown[] = [];
        let url: string | null =
          `https://graph.facebook.com/v20.0/${accountId}/adsets?` +
          `fields=id,name,promoted_object,campaign{id,name}&` +
          `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&` +
          `limit=200&access_token=${adAccountInfo.accessToken}`;

        while (url) {
          const response = await fetch(url);
          const data = await response.json();

          if (data.error) {
            console.error(
              `Meta API error for client ${client.name}:`,
              data.error.message,
            );
            break;
          }

          if (data.data) {
            allAdSets.push(...data.data);
          }

          url = data.paging?.next || null;
        }

        // Check each ad set's promoted_object
        for (const adSet of allAdSets) {
          const promotedObject = adSet.promoted_object;
          if (!promotedObject) continue;

          const adSetPageId = promotedObject.page_id || null;
          const adSetIgId = promotedObject.instagram_actor_id || null;

          let hasMismatch = false;
          let mismatchType: "instagram" | "facebook_page" | "both" =
            "instagram";

          const pageMismatch =
            expectedPageId && adSetPageId && adSetPageId !== expectedPageId;
          const igMismatch =
            expectedIgId && adSetIgId && adSetIgId !== expectedIgId;

          if (pageMismatch && igMismatch) {
            mismatchType = "both";
            hasMismatch = true;
          } else if (pageMismatch) {
            mismatchType = "facebook_page";
            hasMismatch = true;
          } else if (igMismatch) {
            mismatchType = "instagram";
            hasMismatch = true;
          }

          if (hasMismatch) {
            mismatches.push({
              clientId: client.id,
              clientName: client.name,
              clientAvatar: client.avatar,
              adSetName: adSet.name,
              adSetFacebookId: adSet.id,
              campaignName: adSet.campaign?.name || "N/A",
              campaignFacebookId: adSet.campaign?.id || "N/A",
              mismatchType,
              expectedInstagram: expectedIgId,
              actualInstagram: adSetIgId,
              expectedPage: expectedPageId,
              actualPage: adSetPageId,
            });
          }
        }
      } catch (err) {
        console.error(`Error checking client ${client.name}:`, err);
      }
    }

    return new Response(JSON.stringify({ mismatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
