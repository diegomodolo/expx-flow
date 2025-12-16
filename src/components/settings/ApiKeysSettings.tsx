import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  expires_at: string | null;
}

export const ApiKeysSettings = () => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const companyId = activeCompany?.company_id;

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('company_api_keys')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!companyId
  });

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'lih_'; // Lead Intelligence Hub prefix
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const hashApiKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      
      const { error } = await supabase
        .from('company_api_keys')
        .insert({
          company_id: companyId,
          name,
          api_key: apiKey,
          api_key_hash: apiKeyHash,
          is_active: true,
          permissions: { capture: true, conversion: true }
        });
      
      if (error) throw error;
      return apiKey;
    },
    onSuccess: (apiKey) => {
      setNewlyCreatedKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyName("");
      toast.success("API Key criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar API Key: " + error.message);
    }
  });

  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('company_api_keys')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("Status atualizado!");
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("API Key removida!");
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••••••' + key.substring(key.length - 4);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Digite um nome para a API Key");
      return;
    }
    createKeyMutation.mutate(newKeyName);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Gerencie as chaves de API para integração com o Lead Intelligence Hub
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova API Key</DialogTitle>
                  <DialogDescription>
                    Crie uma chave para integrar sistemas externos com o Lead Intelligence Hub.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Nome da API Key</Label>
                    <Input
                      id="keyName"
                      placeholder="Ex: Integração CRM, Landing Page..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateKey} disabled={createKeyMutation.isPending}>
                    {createKeyMutation.isPending ? "Criando..." : "Criar API Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {newlyCreatedKey && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                ⚠️ Copie sua API Key agora! Ela não será exibida novamente.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded border text-sm font-mono">
                  {newlyCreatedKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewlyCreatedKey(null)}
              >
                Entendi, fechar aviso
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requisições</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {showKeys[key.id] ? key.api_key : maskApiKey(key.api_key)}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setShowKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                        >
                          {showKeys[key.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(key.api_key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={key.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleKeyMutation.mutate({ id: key.id, isActive: !key.is_active })}
                      >
                        {key.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>{key.request_count?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {key.last_used_at 
                        ? format(new Date(key.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "Nunca"
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(key.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Todas as integrações que usam esta chave deixarão de funcionar.
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma API Key cadastrada</p>
              <p className="text-sm">Crie sua primeira chave para começar a integrar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentação da API</CardTitle>
          <CardDescription>
            Use estas endpoints para capturar e atualizar leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium">Capturar Lead</h4>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`POST https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/lead-capture-api
Headers:
  X-API-Key: lih_xxxxx...
  Content-Type: application/json`}
            </pre>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Campos do Body (JSON)</h4>
            
            {/* 1. Identificação do Lead */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">1. Identificação do Lead</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"full_name": "string",           // ✅ OBRIGATÓRIO - Nome completo
"email": "string",               // ✅ OBRIGATÓRIO (email ou phone)
"phone": "string",               // ✅ OBRIGATÓRIO (email ou phone)
"lead_status": "string",         // Status: novo, qualificado, etc
"primary_source": "string",      // Origem primária do lead
"secondary_source": "string",    // Origem secundária / campanha
"capture_url": "string",         // URL onde o lead foi capturado
"capture_type": "string"         // ebook, webinar, oferta_direta, diagnostico`}
              </pre>
            </div>

            {/* 2. Dados da Empresa */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">2. Dados da Empresa</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"company_name": "string",        // Nome da empresa
"company_trade_name": "string",  // Nome fantasia
"cnpj": "string",                // CNPJ
"company_segment": "string",     // Segmento principal
"company_subsegment": "string",  // Subsegmento
"cnae": "string",                // CNAE (se disponível)
"company_size": "string",        // ME, EPP, Média, Grande
"monthly_revenue": "string",     // Faixa de faturamento mensal
"annual_revenue": "string",      // Faixa de faturamento anual
"employee_count": "string",      // Quantidade de funcionários (faixa)
"years_in_market": number,       // Tempo de mercado (anos)
"client_type": "string",         // B2B, B2C, B2B2C
"company_website": "string",     // Site da empresa
"company_linkedin": "string"     // LinkedIn da empresa`}
              </pre>
            </div>

            {/* 3. Dados do Contato */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">3. Dados do Contato (Pessoa)</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"first_name": "string",          // Primeiro nome
"last_name": "string",           // Sobrenome
"job_title": "string",           // Cargo
"job_level": "string",           // C-Level, Diretoria, Gestão, Operacional
"department": "string",          // Departamento / Área
"email_type": "string",          // corporativo, genérico
"whatsapp": "string",            // WhatsApp
"linkedin_profile": "string",    // LinkedIn do contato
"city": "string",                // Cidade
"state": "string",               // Estado (UF)
"country": "string",             // País (default: BR)
"zip_code": "string",            // CEP
"date_of_birth": "string",       // Data de nascimento (YYYY-MM-DD)
"gender": "string",              // m, f, o
"facebook_id": "string",         // ID do Facebook
"instagram": "string"            // Instagram`}
              </pre>
            </div>

            {/* 4. Estrutura Organizacional */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">4. Estrutura Organizacional / Decisão</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"buying_role": "string",         // Decisor, Influenciador, Usuário, Financeiro
"is_decision_maker": boolean,    // Participa da decisão de compra
"influence_level": "string",     // baixa, média, alta
"decision_makers_count": number  // Número de decisores envolvidos`}
              </pre>
            </div>

            {/* 5. Stack Atual */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">5. Stack Atual / Contexto de Software</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"uses_software": boolean,        // Usa software atualmente
"software_type": "string",       // Tipo de software utilizado
"current_software": "string",    // Nome do software atual
"current_vendor": "string",      // Fornecedor atual
"software_usage_time": "string", // Tempo de uso do software
"software_satisfaction": "string", // baixa, média, alta
"main_pain_point": "string",     // Principal dor com o software atual
"switch_reason": "string"        // Motivo de troca (se houver)`}
              </pre>
            </div>

            {/* 6. Potencial de Compra */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">6. Potencial de Compra</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"estimated_users": number,       // Número estimado de usuários
"license_type": "string",        // por usuário, por módulo, flat
"budget_range": "string",        // Orçamento estimado (faixa)
"purchase_timeline": "string",   // Prazo estimado para compra
"urgency_level": "string"        // baixa, média, alta`}
              </pre>
            </div>

            {/* 7. Comportamento e Engajamento */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">7. Comportamento e Engajamento</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"first_interaction_at": "string",  // ISO timestamp da primeira interação
"last_interaction_at": "string",   // ISO timestamp da última interação
"content_consumed": ["string"],    // Array de conteúdos consumidos
"content_type": "string",          // topo, meio, fundo
"pages_visited": ["string"],       // Array de páginas visitadas
"visited_pricing": boolean,        // Visitou página de preços
"attended_webinar": boolean,       // Participou de webinar
"requested_demo": boolean          // Solicitou contato / demo`}
              </pre>
            </div>

            {/* 8. Origem de Marketing */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">8. Origem de Marketing e Aquisição</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"acquisition_channel": "string",  // orgânico, pago, evento, indicação
"specific_source": "string",      // Google, Meta, LinkedIn, YouTube
"campaign": "string",             // Nome da campanha
"ad_set": "string",               // Conjunto / público
"creative": "string",             // Criativo
"keyword": "string",              // Palavra-chave (se houver)
"lead_cost": number,              // Custo do lead (R$)
"utm_source": "string",           // UTM source
"utm_medium": "string",           // UTM medium
"utm_campaign": "string"          // UTM campaign`}
              </pre>
            </div>

            {/* 9. Qualidade e Enriquecimento */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">9. Qualidade e Enriquecimento</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"lead_validated": boolean,       // Lead validado
"company_validated": boolean,    // Empresa validada
"email_verified": boolean,       // E-mail verificado
"phone_verified": boolean,       // Telefone verificado
"data_enriched": boolean,        // Dados enriquecidos automaticamente
"enrichment_source": "string"    // Fonte do enriquecimento`}
              </pre>
            </div>

            {/* 10. Consentimento e Compliance */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">10. Consentimento e Compliance (LGPD)</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"lgpd_consent": boolean,         // Consentimento LGPD
"consent_date": "string",        // Data do consentimento (ISO)
"consent_source": "string",      // Fonte do consentimento
"data_purpose": "string",        // Finalidade declarada do uso
"partner_sharing_consent": boolean // Aceite de compartilhamento`}
              </pre>
            </div>

            {/* 11. Campos Técnicos */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-primary">11. Campos Técnicos / Operacionais</h5>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"internal_classification": "string", // Classificação interna
"internal_notes": "string",          // Observações internas
"tags": ["string"],                  // Array de tags
"assigned_to": "uuid",               // UUID do responsável interno
"client_id": "string",               // UUID, email ou nome do cliente
"client_sector": "string",           // Setor do cliente (fallback)
"value": number,                     // Valor associado ao lead
"extra_data": { }                    // Campos adicionais (JSON)`}
              </pre>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium">Exemplo Completo</h4>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
{`{
  "full_name": "João Silva",
  "email": "joao@techsolutions.com.br",
  "phone": "+5511999998888",
  "whatsapp": "+5511999998888",
  
  "company_name": "Tech Solutions Ltda",
  "cnpj": "12.345.678/0001-90",
  "company_segment": "Tecnologia",
  "company_size": "EPP",
  "employee_count": "11-50",
  
  "job_title": "Diretor de TI",
  "job_level": "Diretoria",
  "buying_role": "Decisor",
  "is_decision_maker": true,
  
  "uses_software": true,
  "current_software": "Competitor XYZ",
  "software_satisfaction": "baixa",
  "main_pain_point": "Falta integração com ERP",
  
  "budget_range": "R$ 5.000 - R$ 10.000",
  "purchase_timeline": "1-3 meses",
  "urgency_level": "alta",
  
  "acquisition_channel": "pago",
  "specific_source": "Meta",
  "campaign": "Campanha Black Friday",
  
  "lgpd_consent": true,
  "consent_date": "2024-12-16",
  "consent_source": "landing_page",
  
  "tags": ["hot-lead", "enterprise"],
  "client_id": "cliente@email.com"
}`}
            </pre>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium">Atualizar Conversão</h4>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`PATCH https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/lead-conversion-api
Headers:
  X-API-Key: lih_xxxxx...
  Content-Type: application/json

Body:
{
  "external_id": "lead@exemplo.com", // email ou phone do lead
  "client_id": "uuid-do-cliente",
  "conversion_type": "sale",         // sale, qualified, scheduled
  "value": 15000.00                  // valor da conversão (opcional)
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
