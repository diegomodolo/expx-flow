import { Check, AlertCircle, Image, Film, Images, Users, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CampaignBuilderState } from "@/hooks/useCampaignBuilder";
import { cn } from "@/lib/utils";

interface ReviewSectionProps {
  state: CampaignBuilderState;
  validationError: string | null;
}

const OBJECTIVES: Record<string, string> = {
  'OUTCOME_TRAFFIC': 'Tráfego',
  'OUTCOME_ENGAGEMENT': 'Engajamento',
  'OUTCOME_LEADS': 'Leads',
  'OUTCOME_SALES': 'Vendas',
  'OUTCOME_AWARENESS': 'Reconhecimento',
  'OUTCOME_APP_PROMOTION': 'Promoção de App',
};

const CTA_LABELS: Record<string, string> = {
  'LEARN_MORE': 'Saiba Mais',
  'SHOP_NOW': 'Comprar Agora',
  'SIGN_UP': 'Cadastre-se',
  'BOOK_NOW': 'Reserve Agora',
  'CONTACT_US': 'Fale Conosco',
  'DOWNLOAD': 'Baixar',
  'GET_QUOTE': 'Obter Cotação',
  'APPLY_NOW': 'Candidatar-se',
  'SUBSCRIBE': 'Assinar',
  'WATCH_MORE': 'Assistir Mais',
  'SEND_MESSAGE': 'Enviar Mensagem',
  'GET_OFFER': 'Obter Oferta',
};

export function ReviewSection({ state, validationError }: ReviewSectionProps) {
  const { campaign, adSets } = state;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCreativeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Film className="h-4 w-4" />;
      case 'CAROUSEL': return <Images className="h-4 w-4" />;
      default: return <Image className="h-4 w-4" />;
    }
  };

  const totalCreatives = adSets.reduce((sum, adSet) => sum + adSet.creatives.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Revisão da Campanha</h2>
        <p className="text-sm text-muted-foreground">
          Confira todas as configurações antes de publicar no Meta Ads
        </p>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{validationError}</p>
        </div>
      )}

      {/* Campaign Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{campaign.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Objetivo</p>
              <p className="font-medium">{OBJECTIVES[campaign.objective] || campaign.objective}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orçamento</p>
              <p className="font-medium">
                {formatCurrency(campaign.budgetValue)}
                <span className="text-muted-foreground font-normal">
                  {campaign.budgetType === 'daily' ? '/dia' : ' total'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Inicial</p>
              <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{adSets.length}</div>
            <p className="text-sm text-muted-foreground">Conjunto(s) de Anúncios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalCreatives}</div>
            <p className="text-sm text-muted-foreground">Criativo(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {adSets.reduce((sum, adSet) => sum + adSet.includedAudiences.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Público(s) Selecionado(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Ad Sets Detail */}
      <div className="space-y-3">
        <h3 className="font-semibold">Conjuntos de Anúncios</h3>
        {adSets.map((adSet, adSetIndex) => (
          <Card key={adSet.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {adSet.name || `Conjunto ${adSetIndex + 1}`}
                </div>
                <Badge variant="outline">
                  {adSet.creatives.length} criativo(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Targeting Info */}
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Idade: {adSet.ageMin} - {adSet.ageMax === 65 ? '65+' : adSet.ageMax} anos
                  {adSet.genders[0] === 1 && ' • Masculino'}
                  {adSet.genders[0] === 2 && ' • Feminino'}
                </p>
                {adSet.includedAudiences.length > 0 && (
                  <p className="text-muted-foreground">
                    📎 {adSet.includedAudiences.length} público(s) incluído(s)
                  </p>
                )}
                {adSet.excludedAudiences.length > 0 && (
                  <p className="text-muted-foreground">
                    🚫 {adSet.excludedAudiences.length} público(s) excluído(s)
                  </p>
                )}
              </div>

              <Separator />

              {/* Creatives Preview */}
              <div className="grid grid-cols-4 gap-2">
                {adSet.creatives.map((creative, creativeIndex) => (
                  <div
                    key={creative.id}
                    className="border rounded-lg p-2 space-y-1"
                  >
                    {creative.mediaUrls.length > 0 ? (
                      <div className="aspect-square rounded overflow-hidden bg-muted">
                        {creative.type === 'VIDEO' ? (
                          <video
                            src={creative.mediaUrls[0]}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={creative.mediaUrls[0]}
                            alt={`Creative ${creativeIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square rounded bg-muted flex items-center justify-center">
                        {getCreativeIcon(creative.type)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getCreativeIcon(creative.type)}
                      <span className="truncate">
                        {creative.title || `Criativo ${creativeIndex + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Final Check */}
      {!validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm">Tudo pronto! Clique em "Publicar no Meta" para criar a campanha.</p>
        </div>
      )}
    </div>
  );
}
