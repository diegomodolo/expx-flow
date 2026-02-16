import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!botToken && action !== "save-config") {
      return new Response(
        JSON.stringify({ error: "Discord Bot Token não configurado. Adicione o secret DISCORD_BOT_TOKEN." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "test-connection": {
        const { guild_id } = payload;
        const res = await fetch(`${DISCORD_API}/guilds/${guild_id}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (!res.ok) {
          const err = await res.json();
          return new Response(
            JSON.stringify({ success: false, error: err.message || "Falha ao conectar ao servidor Discord" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const guild = await res.json();
        return new Response(
          JSON.stringify({ success: true, guild_name: guild.name, guild_id: guild.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-channels": {
        const { guild_id } = payload;
        const res = await fetch(`${DISCORD_API}/guilds/${guild_id}/channels`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (!res.ok) {
          return new Response(
            JSON.stringify({ error: "Falha ao listar canais" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const channels = await res.json();
        // Filter text channels only (type 0)
        const textChannels = channels
          .filter((c: any) => c.type === 0)
          .map((c: any) => ({ id: c.id, name: c.name, position: c.position }))
          .sort((a: any, b: any) => a.position - b.position);
        return new Response(
          JSON.stringify({ channels: textChannels }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send-message": {
        const { channel_id, content, embed } = payload;
        const body: any = {};
        if (content) body.content = content;
        if (embed) body.embeds = [embed];

        const res = await fetch(`${DISCORD_API}/channels/${channel_id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          return new Response(
            JSON.stringify({ error: err.message || "Falha ao enviar mensagem" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const msg = await res.json();
        return new Response(
          JSON.stringify({ success: true, message_id: msg.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send-dm": {
        const { user_id: discordUserId, content, embed } = payload;
        // Create DM channel
        const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: discordUserId }),
        });
        if (!dmRes.ok) {
          return new Response(
            JSON.stringify({ error: "Falha ao criar canal DM" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const dm = await dmRes.json();
        const body: any = {};
        if (content) body.content = content;
        if (embed) body.embeds = [embed];

        const msgRes = await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!msgRes.ok) {
          return new Response(
            JSON.stringify({ error: "Falha ao enviar DM" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const msg = await msgRes.json();
        return new Response(
          JSON.stringify({ success: true, message_id: msg.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-guild-members": {
        const { guild_id } = payload;
        const res = await fetch(`${DISCORD_API}/guilds/${guild_id}/members?limit=1000`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (!res.ok) {
          return new Response(
            JSON.stringify({ error: "Falha ao listar membros" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const members = await res.json();
        const memberList = members.map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          display_name: m.nick || m.user.global_name || m.user.username,
          avatar: m.user.avatar,
        }));
        return new Response(
          JSON.stringify({ members: memberList }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Discord bot error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
