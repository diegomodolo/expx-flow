import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Building2, DollarSign, CheckCircle, AlertTriangle, Facebook, Unlink, RefreshCw, Shield, Instagram, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const FacebookIntegrationSettings = () => {
  const { activeCompany } = useCompany();
  const { 
    loading, 
    integration, 
    adAccounts, 
    loadIntegration, 
    connectFacebook, 
    disconnectFacebook,
    refreshAdAccounts,
    checkScopes
  } = useFacebookIntegration();
  
  const { pages, instagramAccounts, refreshPages } = useFacebookPages();

  const [showScopesModal, setShowScopesModal] = useState(false);
  const [scopesData, setScopesData] = useState<any>(null);
  const [checkingScopes, setCheckingScopes] = useState(false);
  const [refreshingPages, setRefreshingPages] = useState(false);
  const [adAccountsOpen, setAdAccountsOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  
  // Search states
  const [adAccountSearch, setAdAccountSearch] = useState("");
  const [pagesSearch, setPagesSearch] = useState("");
  const [instagramSearch, setInstagramSearch] = useState("");
  
  // Filtered lists
  const filteredAdAccounts = useMemo(() => {
    if (!adAccountSearch.trim()) return adAccounts;
    const search = adAccountSearch.toLowerCase();
    return adAccounts.filter(account => 
      account.account_name?.toLowerCase().includes(search) ||
      account.id?.toLowerCase().includes(search)
    );
  }, [adAccounts, adAccountSearch]);
  
  const filteredPages = useMemo(() => {
    if (!pagesSearch.trim()) return pages;
    const search = pagesSearch.toLowerCase();
    return pages.filter(page => 
      page.page_name?.toLowerCase().includes(search) ||
      page.page_id?.toLowerCase().includes(search)
    );
  }, [pages, pagesSearch]);
  
  const filteredInstagramAccounts = useMemo(() => {
    if (!instagramSearch.trim()) return instagramAccounts;
    const search = instagramSearch.toLowerCase();
    return instagramAccounts.filter(account => 
      account.username?.toLowerCase().includes(search) ||
      account.instagram_id?.toLowerCase().includes(search)
    );
  }, [instagramAccounts, instagramSearch]);

  const handleCheckScopes = async () => {
    if (!activeCompany?.company_id) return;
    
    setCheckingScopes(true);
    const data = await checkScopes(activeCompany.company_id);
    setCheckingScopes(false);
    
    if (data) {
      setScopesData(data);
      setShowScopesModal(true);
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany?.company_id]);

  const isConnected = integration && integration.is_active;
  const isExpired = integration && new Date(integration.expires_at) < new Date();

  const handleRefreshPages = async () => {
    if (!integration?.id) return;
    setRefreshingPages(true);
    try {
      await refreshPages(integration.id);
    } finally {
      setRefreshingPages(false);
    }
  };

  // Auto-fetch pages when integration becomes available and pages are empty
  useEffect(() => {
    if (integration?.id && isConnected && pages.length === 0 && !refreshingPages) {
      handleRefreshPages();
    }
  }, [integration?.id, isConnected]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Integração Facebook Ads</h2>
          <p className="text-muted-foreground">
            Gerencie sua conexão com o Facebook Ads
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando informações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Integração Facebook Ads</h2>
        <p className="text-muted-foreground">
          Gerencie sua conexão com o Facebook Ads e visualize informações das contas
        </p>
      </div>

      {/* Card de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Status da Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? "Conectado ao Facebook Ads com sucesso" 
                  : "Conecte sua conta do Facebook Ads para importar campanhas e métricas"
                }
              </p>
              {isConnected && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    Conectado - {adAccounts.length} conta(s) de anúncios
                  </span>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      Token Expirado
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isConnected && (
                <Button
                  variant="outline"
                  onClick={handleCheckScopes}
                  disabled={loading || checkingScopes}
                  className="flex items-center gap-2"
                >
                  <Shield className={`h-4 w-4 ${checkingScopes ? 'animate-pulse' : ''}`} />
                  Verificar Permissões
                </Button>
              )}
              
              {isConnected ? (
                <Button
                  variant="outline"
                  onClick={disconnectFacebook}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Unlink className="h-4 w-4" />
                  Desconectar
                </Button>
              ) : (
                <Button
                  onClick={connectFacebook}
                  disabled={loading || !activeCompany}
                  className="flex items-center gap-2"
                >
                  <Facebook className="h-4 w-4" />
                  Conectar ao Facebook Ads
                </Button>
              )}
            </div>
          </div>

          {isExpired && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Seu token do Facebook expirou. Clique em "Conectar ao Facebook Ads" para renovar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações Detalhadas - só mostra se conectado */}
      {isConnected && (
        <>
          {/* Card de Informações do Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Informações do Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Conectado em:
                  </label>
                  <p className="text-sm">
                    {format(new Date(integration.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Expira em:
                  </label>
                  <p className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                    {format(new Date(integration.expires_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Contas de Anúncios - Colapsável */}
          <Card>
            <Collapsible open={adAccountsOpen} onOpenChange={setAdAccountsOpen}>
              <CardHeader className="cursor-pointer" onClick={() => setAdAccountsOpen(!adAccountsOpen)}>
                <CardTitle className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      {adAccountsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <DollarSign className="h-4 w-4" />
                      Contas de Anúncios ({adAccounts.length})
                    </div>
                  </CollapsibleTrigger>
                  {isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); refreshAdAccounts(); }}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Atualizar Contas
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {adAccounts.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar conta de anúncios..."
                        value={adAccountSearch}
                        onChange={(e) => setAdAccountSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}
                  {filteredAdAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {filteredAdAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{account.account_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {account.id}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {account.currency}
                            </Badge>
                            {account.is_active && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                Ativa
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : adAccounts.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta encontrada para "{adAccountSearch}".
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta de anúncios encontrada.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Card de Páginas do Facebook - Colapsável */}
          <Card>
            <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
              <CardHeader className="cursor-pointer" onClick={() => setPagesOpen(!pagesOpen)}>
                <CardTitle className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      {pagesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Páginas do Facebook ({pages.length})
                    </div>
                  </CollapsibleTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleRefreshPages(); }}
                    disabled={refreshingPages}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingPages ? 'animate-spin' : ''}`} />
                    {refreshingPages ? 'Buscando...' : 'Atualizar Páginas'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {pages.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar página..."
                        value={pagesSearch}
                        onChange={(e) => setPagesSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}
                  {filteredPages.length > 0 ? (
                    <div className="space-y-3">
                      {filteredPages.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{page.page_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {page.page_id}
                            </div>
                          </div>
                          {page.page_category && (
                            <Badge variant="outline" className="text-xs">
                              {page.page_category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : pages.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma página encontrada para "{pagesSearch}".
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {refreshingPages ? 'Buscando páginas...' : 'Nenhuma página encontrada. Clique em "Atualizar Páginas" para buscar.'}
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Card de Contas do Instagram - Colapsável */}
          <Card>
            <Collapsible open={instagramOpen} onOpenChange={setInstagramOpen}>
              <CardHeader className="cursor-pointer" onClick={() => setInstagramOpen(!instagramOpen)}>
                <CardTitle className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      {instagramOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Instagram className="h-4 w-4 text-pink-600" />
                      Contas do Instagram ({instagramAccounts.length})
                    </div>
                  </CollapsibleTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleRefreshPages(); }}
                    disabled={refreshingPages}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingPages ? 'animate-spin' : ''}`} />
                    {refreshingPages ? 'Buscando...' : 'Atualizar Contas'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {instagramAccounts.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar conta do Instagram..."
                        value={instagramSearch}
                        onChange={(e) => setInstagramSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}
                  {filteredInstagramAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {filteredInstagramAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">@{account.username}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {account.instagram_id}
                              {account.facebook_page?.page_name && (
                                <> • Via: {account.facebook_page.page_name}</>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                account.source === 'business_manager' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {account.source === 'business_manager' ? 'Business Manager' : 'Via Página'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {account.followers_count?.toLocaleString() || 0} seguidores
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : instagramAccounts.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta encontrada para "{instagramSearch}".
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta do Instagram encontrada. Clique em "Atualizar Contas" para buscar.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </>
      )}

      {/* Modal de Verificação de Escopos */}
      <Dialog open={showScopesModal} onOpenChange={setShowScopesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões do Token Facebook
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre as permissões concedidas ao token de acesso
            </DialogDescription>
          </DialogHeader>

          {scopesData && (
            <div className="space-y-4">
              {/* Alerta se faltar ads_management */}
              {!scopesData.permissions.ads_management && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Permissão "ads_management" ausente!</strong>
                    <br />
                    Esta permissão é necessária para enviar conversões offline ao Facebook.
                    <br />
                    <strong>Solução:</strong> Desconecte e reconecte a integração para obter esta permissão.
                  </AlertDescription>
                </Alert>
              )}

              {/* Informações do Token */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Informações do Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={scopesData.tokenInfo.isValid ? "default" : "destructive"}>
                      {scopesData.tokenInfo.isValid ? "Válido" : "Inválido"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expira em:</span>
                    <span>
                      {format(new Date(scopesData.tokenInfo.expiresAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">App ID:</span>
                    <span className="font-mono">{scopesData.tokenInfo.appId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono">{scopesData.tokenInfo.userId}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Permissões Críticas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Permissões Críticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">ads_management</span>
                    {scopesData.permissions.ads_management ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concedida
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Ausente
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">ads_read</span>
                    {scopesData.permissions.ads_read ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concedida
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Ausente
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">business_management</span>
                    {scopesData.permissions.business_management ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concedida
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Ausente
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Todas as Permissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Todas as Permissões ({scopesData.scopes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {scopesData.scopes.map((scope: string) => (
                      <Badge key={scope} variant="outline" className="text-xs font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};