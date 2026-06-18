import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Loader2, Save, ShieldAlert } from "lucide-react";
import {
  useSystemConfig,
  useUpsertSystemConfig,
  useIsSystemOwner,
  type SystemConfigProvider,
} from "@/hooks/useSystemConfig";

// ============================================================
// SystemConfigSettings — UI em /configuracoes/sistema
// Acesso: apenas system owner (primeiro user ou role='owner').
// 8 abas, uma por provedor de system_config_*.
// ============================================================

function SecretField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value === "" ? "(deixe vazio para manter)" : placeholder}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar" : "Mostrar"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function FieldRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface FormProps {
  provider: SystemConfigProvider;
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}

function ProviderForm({
  provider,
  title,
  description,
  children,
  onSave,
  saving,
}: FormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="pt-2">
          <Button
            onClick={onSave}
            disabled={saving}
            data-testid={`save-${provider}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Salvar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemConfigSettings() {
  const { data: isOwner, isLoading: ownerLoading } = useIsSystemOwner();

  if (ownerLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Acesso negado</h3>
            <p className="text-sm text-muted-foreground">
              Apenas o proprietário da instalação pode acessar estas
              configurações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Credenciais globais da instalação.{" "}
          <strong>Todas as integrações</strong> podem ser sobrescritas por
          empresa em suas respectivas páginas de configuração.
        </p>
      </div>

      <Tabs defaultValue="app" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="app">App</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="tools">Ferramentas</TabsTrigger>
          <TabsTrigger value="discord">Discord</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="mt-4">
          <AppTab />
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <AITab />
        </TabsContent>
        <TabsContent value="facebook" className="mt-4">
          <FacebookTab />
        </TabsContent>
        <TabsContent value="google" className="mt-4">
          <GoogleTab />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailTab />
        </TabsContent>
        <TabsContent value="tools" className="mt-4">
          <ToolsTab />
        </TabsContent>
        <TabsContent value="discord" className="mt-4">
          <DiscordTab />
        </TabsContent>
        <TabsContent value="github" className="mt-4">
          <GithubTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Aba App ----
function AppTab() {
  const { data, isLoading } = useSystemConfig("app");
  const upsert = useUpsertSystemConfig("app");
  const [appUrl, setAppUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setAppUrl(data.app_url || "");
    setAppName(data.app_name || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="app"
      title="Aplicação"
      description="URL pública e nome desta instalação (usados em emails, links e OAuth redirects)."
      onSave={() =>
        upsert.mutate({ app_url: appUrl, app_name: appName } as never)
      }
      saving={upsert.isPending}
    >
      <FieldRow
        id="app_url"
        label="URL pública"
        value={appUrl}
        onChange={setAppUrl}
        placeholder="https://seu-app.vercel.app"
        hint="Sem barra final. Usada em redirects OAuth e links de email."
      />
      <FieldRow
        id="app_name"
        label="Nome do app"
        value={appName}
        onChange={setAppName}
        placeholder="Expx Flow"
      />
    </ProviderForm>
  );
}

// ---- Aba IA ----
function AITab() {
  const { data, isLoading } = useSystemConfig("ai");
  const upsert = useUpsertSystemConfig("ai");
  const [openrouter, setOpenrouter] = useState("");
  const [openai, setOpenai] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setOpenrouter(data.openrouter_api_key || "");
    setOpenai(data.openai_api_key || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="ai"
      title="Inteligência Artificial"
      description="Fallback global de chaves OpenRouter/OpenAI. Cada empresa pode ter a sua em Configurações > IA."
      onSave={() =>
        upsert.mutate({
          openrouter_api_key: openrouter,
          openai_api_key: openai,
        } as never)
      }
      saving={upsert.isPending}
    >
      <SecretField
        id="openrouter_api_key"
        label="OpenRouter API Key"
        value={openrouter}
        onChange={setOpenrouter}
        placeholder="sk-or-..."
      />
      <SecretField
        id="openai_api_key"
        label="OpenAI API Key (opcional)"
        value={openai}
        onChange={setOpenai}
        placeholder="sk-..."
      />
    </ProviderForm>
  );
}

// ---- Aba Facebook ----
function FacebookTab() {
  const { data, isLoading } = useSystemConfig("facebook");
  const upsert = useUpsertSystemConfig("facebook");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [graphVersion, setGraphVersion] = useState("v21.0");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setAppId(data.app_id || "");
    setAppSecret(data.app_secret || "");
    setGraphVersion(data.graph_api_version || "v21.0");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="facebook"
      title="Facebook / Meta"
      description="App ID e App Secret do Facebook for Developers. Graph API version default: v21.0."
      onSave={() =>
        upsert.mutate({
          app_id: appId,
          app_secret: appSecret,
          graph_api_version: graphVersion,
        } as never)
      }
      saving={upsert.isPending}
    >
      <FieldRow
        id="fb_app_id"
        label="App ID"
        value={appId}
        onChange={setAppId}
        placeholder="1234567890123456"
      />
      <SecretField
        id="fb_app_secret"
        label="App Secret"
        value={appSecret}
        onChange={setAppSecret}
      />
      <FieldRow
        id="fb_graph_version"
        label="Graph API Version"
        value={graphVersion}
        onChange={setGraphVersion}
        placeholder="v21.0"
      />
    </ProviderForm>
  );
}

// ---- Aba Google ----
function GoogleTab() {
  const { data, isLoading } = useSystemConfig("google");
  const upsert = useUpsertSystemConfig("google");
  const [adsClientId, setAdsClientId] = useState("");
  const [adsClientSecret, setAdsClientSecret] = useState("");
  const [adsDevToken, setAdsDevToken] = useState("");
  const [meetClientId, setMeetClientId] = useState("");
  const [meetClientSecret, setMeetClientSecret] = useState("");
  const [ytApiKey, setYtApiKey] = useState("");
  const [gcpSaJson, setGcpSaJson] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setAdsClientId(data.ads_client_id || "");
    setAdsClientSecret(data.ads_client_secret || "");
    setAdsDevToken(data.ads_developer_token || "");
    setMeetClientId(data.meet_client_id || "");
    setMeetClientSecret(data.meet_client_secret || "");
    setYtApiKey(data.youtube_api_key || "");
    setGcpSaJson(data.gcp_service_account_json || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="google"
      title="Google (Ads + Meet + YouTube + Slides)"
      description="Credenciais OAuth e service account para os produtos Google."
      onSave={() =>
        upsert.mutate({
          ads_client_id: adsClientId,
          ads_client_secret: adsClientSecret,
          ads_developer_token: adsDevToken,
          meet_client_id: meetClientId,
          meet_client_secret: meetClientSecret,
          youtube_api_key: ytApiKey,
          gcp_service_account_json: gcpSaJson,
        } as never)
      }
      saving={upsert.isPending}
    >
      <FieldRow
        id="g_ads_client_id"
        label="Google Ads Client ID"
        value={adsClientId}
        onChange={setAdsClientId}
      />
      <SecretField
        id="g_ads_client_secret"
        label="Google Ads Client Secret"
        value={adsClientSecret}
        onChange={setAdsClientSecret}
      />
      <SecretField
        id="g_ads_dev_token"
        label="Google Ads Developer Token"
        value={adsDevToken}
        onChange={setAdsDevToken}
      />
      <FieldRow
        id="g_meet_client_id"
        label="Google Meet Client ID"
        value={meetClientId}
        onChange={setMeetClientId}
      />
      <SecretField
        id="g_meet_client_secret"
        label="Google Meet Client Secret"
        value={meetClientSecret}
        onChange={setMeetClientSecret}
      />
      <SecretField
        id="g_yt_api_key"
        label="YouTube Data API Key"
        value={ytApiKey}
        onChange={setYtApiKey}
      />
      <SecretField
        id="g_gcp_sa_json"
        label="GCP Service Account JSON (Google Slides)"
        value={gcpSaJson}
        onChange={setGcpSaJson}
      />
    </ProviderForm>
  );
}

// ---- Aba Email ----
function EmailTab() {
  const { data, isLoading } = useSystemConfig("email");
  const upsert = useUpsertSystemConfig("email");
  const [resendKey, setResendKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setResendKey(data.resend_api_key || "");
    setFromEmail(data.from_email || "");
    setFromName(data.from_name || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="email"
      title="Email (Resend)"
      description="Credenciais usadas em convites de colaboradores, resumo de apresentação e notificações por email."
      onSave={() =>
        upsert.mutate({
          resend_api_key: resendKey,
          from_email: fromEmail,
          from_name: fromName,
        } as never)
      }
      saving={upsert.isPending}
    >
      <SecretField
        id="resend_api_key"
        label="Resend API Key"
        value={resendKey}
        onChange={setResendKey}
        placeholder="re_..."
      />
      <FieldRow
        id="from_email"
        label="Email remetente (from)"
        value={fromEmail}
        onChange={setFromEmail}
        placeholder="noreply@seu-dominio.com"
      />
      <FieldRow
        id="from_name"
        label="Nome remetente"
        value={fromName}
        onChange={setFromName}
        placeholder="Expx Flow"
      />
    </ProviderForm>
  );
}

// ---- Aba Ferramentas ----
function ToolsTab() {
  const { data, isLoading } = useSystemConfig("tools");
  const upsert = useUpsertSystemConfig("tools");
  const [apify, setApify] = useState("");
  const [firecrawl, setFirecrawl] = useState("");
  const [shotstack, setShotstack] = useState("");
  const [ytProxy, setYtProxy] = useState("");
  const [api4com, setApi4com] = useState("https://api.api4com.com");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setApify(data.apify_api_token || "");
    setFirecrawl(data.firecrawl_api_key || "");
    setShotstack(data.shotstack_api_key || "");
    setYtProxy(data.youtube_proxy_url || "");
    setApi4com(data.api4com_base_url || "https://api.api4com.com");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="tools"
      title="Ferramentas"
      description="APIs de automação externa (scraping, vídeo, voz)."
      onSave={() =>
        upsert.mutate({
          apify_api_token: apify,
          firecrawl_api_key: firecrawl,
          shotstack_api_key: shotstack,
          youtube_proxy_url: ytProxy,
          api4com_base_url: api4com,
        } as never)
      }
      saving={upsert.isPending}
    >
      <SecretField
        id="apify_token"
        label="Apify API Token"
        value={apify}
        onChange={setApify}
      />
      <SecretField
        id="firecrawl_key"
        label="Firecrawl API Key"
        value={firecrawl}
        onChange={setFirecrawl}
      />
      <SecretField
        id="shotstack_key"
        label="Shotstack API Key"
        value={shotstack}
        onChange={setShotstack}
      />
      <FieldRow
        id="yt_proxy"
        label="YouTube Proxy URL (Railway)"
        value={ytProxy}
        onChange={setYtProxy}
        placeholder="https://seu-proxy.up.railway.app"
        hint="Serviço opcional para download de vídeos do YouTube."
      />
      <FieldRow
        id="api4com_url"
        label="API4Com Base URL"
        value={api4com}
        onChange={setApi4com}
        placeholder="https://api.api4com.com"
      />
    </ProviderForm>
  );
}

// ---- Aba Discord ----
function DiscordTab() {
  const { data, isLoading } = useSystemConfig("discord");
  const upsert = useUpsertSystemConfig("discord");
  const [token, setToken] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setToken(data.bot_token || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="discord"
      title="Discord"
      description="Token do bot usado como fallback global (cada empresa pode ter o seu em Configurações > Discord)."
      onSave={() => upsert.mutate({ bot_token: token } as never)}
      saving={upsert.isPending}
    >
      <SecretField
        id="discord_token"
        label="Bot Token"
        value={token}
        onChange={setToken}
      />
    </ProviderForm>
  );
}

// ---- Aba GitHub ----
function GithubTab() {
  const { data, isLoading } = useSystemConfig("github");
  const upsert = useUpsertSystemConfig("github");
  const [pat, setPat] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && data) {
    setPat(data.pat || "");
    setOwner(data.repo_owner || "");
    setRepo(data.repo_name || "");
    setHydrated(true);
  }

  if (isLoading) return <div>Carregando…</div>;

  return (
    <ProviderForm
      provider="github"
      title="GitHub"
      description="Repositório para tracking de issues e release notes. Integração opcional — se vazio, fica desativada."
      onSave={() =>
        upsert.mutate({
          pat,
          repo_owner: owner,
          repo_name: repo,
        } as never)
      }
      saving={upsert.isPending}
    >
      <SecretField
        id="gh_pat"
        label="Personal Access Token"
        value={pat}
        onChange={setPat}
        placeholder="ghp_..."
      />
      <FieldRow
        id="gh_owner"
        label="Repo Owner (user/org)"
        value={owner}
        onChange={setOwner}
        placeholder="minha-empresa"
      />
      <FieldRow
        id="gh_repo"
        label="Repo Name"
        value={repo}
        onChange={setRepo}
        placeholder="expx-flow-issues"
      />
    </ProviderForm>
  );
}
