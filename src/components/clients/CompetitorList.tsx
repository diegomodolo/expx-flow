import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  Globe, 
  Facebook, 
  Instagram, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  ExternalLink,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { AdLibraryScrapeDialog } from './AdLibraryScrapeDialog';
import { CompetitorAnalysisModal } from './CompetitorAnalysisModal';
import { useCompetitors, Competitor, CompetitorAd } from '@/hooks/useCompetitors';
import { toast } from 'sonner';

interface CompetitorListProps {
  clientId: string;
  competitors: Competitor[];
  competitorAds: CompetitorAd[];
  onRefetch: () => void;
}

export const CompetitorList = ({ clientId, competitors, competitorAds, onRefetch }: CompetitorListProps) => {
  const { 
    updateCompetitor, 
    deleteCompetitor,
    createCompetitorAd,
    updateCompetitorAd,
    deleteCompetitorAd
  } = useCompetitors(clientId);

  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [analyzingCompetitor, setAnalyzingCompetitor] = useState<Competitor | null>(null);
  const [addingAd, setAddingAd] = useState<string | null>(null);
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    facebook_page_name: '',
    instagram_handle: '',
    website_url: '',
    industry: '',
    description: ''
  });
  const [adFormData, setAdFormData] = useState({
    platform: 'Facebook Ads',
    ad_title: '',
    ad_copy: '',
    call_to_action: '',
    ad_type: 'image',
    estimated_performance: 'medium',
    notes: ''
  });

  const handleEditCompetitor = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setFormData({
      name: competitor.name,
      company_name: competitor.company_name,
      facebook_page_name: competitor.facebook_page_name || '',
      instagram_handle: competitor.instagram_handle || '',
      website_url: competitor.website_url || '',
      industry: competitor.industry || '',
      description: competitor.description || ''
    });
  };

  const handleUpdateCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompetitor) return;

    setLoading(true);
    try {
      await updateCompetitor(editingCompetitor.id, formData);
      setEditingCompetitor(null);
      onRefetch();
    } catch (error) {
      toast.error('Erro ao atualizar concorrente');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdsExpansion = (competitorId: string) => {
    setExpandedAds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(competitorId)) {
        newSet.delete(competitorId);
      } else {
        newSet.add(competitorId);
      }
      return newSet;
    });
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este concorrente?')) return;

    try {
      await deleteCompetitor(id);
      onRefetch();
    } catch (error) {
      toast.error('Erro ao excluir concorrente');
    }
  };

  const handleAddAd = (competitorId: string) => {
    setAddingAd(competitorId);
    setAdFormData({
      platform: 'Facebook Ads',
      ad_title: '',
      ad_copy: '',
      call_to_action: '',
      ad_type: 'image',
      estimated_performance: 'medium',
      notes: ''
    });
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingAd) return;

    setLoading(true);
    try {
      await createCompetitorAd({
        ...adFormData,
        competitor_id: addingAd
      });
      setAddingAd(null);
      onRefetch();
    } catch (error) {
      toast.error('Erro ao adicionar anúncio');
    } finally {
      setLoading(false);
    }
  };

  const getCompetitorAds = (competitorId: string) => {
    return competitorAds.filter(ad => ad.competitor_id === competitorId);
  };

  const getPerformanceBadgeVariant = (performance: string) => {
    switch (performance) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPerformanceText = (performance: string) => {
    switch (performance) {
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      default: return 'Desconhecido';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {competitors.map((competitor) => {
          const ads = getCompetitorAds(competitor.id);
          
          return (
            <Card key={competitor.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{competitor.name}</CardTitle>
                      <p className="text-sm text-gray-600">{competitor.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAnalyzingCompetitor(competitor)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Análise
                    </Button>
                    <AdLibraryScrapeDialog 
                      competitor={competitor} 
                      onAdsAdded={onRefetch}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddAd(competitor.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Anúncio
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCompetitor(competitor)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium">Setor:</span>
                      <span>{competitor.industry || 'Não informado'}</span>
                    </div>
                    {competitor.website_url && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Globe className="w-4 h-4" />
                        <a 
                          href={competitor.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {competitor.website_url}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {competitor.facebook_page_name && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Facebook className="w-4 h-4" />
                        <span>{competitor.facebook_page_name}</span>
                      </div>
                    )}
                    {competitor.instagram_handle && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Instagram className="w-4 h-4" />
                        <span>{competitor.instagram_handle}</span>
                      </div>
                    )}
                  </div>
                </div>

                {competitor.description && (
                  <p className="text-sm text-gray-600 mb-4">{competitor.description}</p>
                )}

                {/* Anúncios do concorrente - Collapsible */}
                {ads.length > 0 && (
                  <div className="border-t pt-4">
                    <Collapsible 
                      open={expandedAds.has(competitor.id)} 
                      onOpenChange={() => toggleAdsExpansion(competitor.id)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-blue-600 transition-colors mb-3">
                        {expandedAds.has(competitor.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Anúncios Monitorados ({ads.length})
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {ads.map((ad) => (
                            <div key={ad.id} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-medium text-sm">{ad.ad_title || 'Título não informado'}</p>
                                  <p className="text-xs text-gray-500">{ad.platform}</p>
                                </div>
                                <Badge variant={getPerformanceBadgeVariant(ad.estimated_performance || 'medium')}>
                                  {getPerformanceText(ad.estimated_performance || 'medium')}
                                </Badge>
                              </div>
                              {ad.ad_copy && (
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{ad.ad_copy}</p>
                              )}
                              {ad.call_to_action && (
                                <div className="text-xs">
                                  <span className="font-medium">CTA:</span> {ad.call_to_action}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para editar concorrente */}
      <Dialog open={!!editingCompetitor} onOpenChange={(open) => !open && setEditingCompetitor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Concorrente</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateCompetitor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Nome do Concorrente</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_company_name">Empresa</Label>
                <Input
                  id="edit_company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_facebook_page_name">Página do Facebook</Label>
                <Input
                  id="edit_facebook_page_name"
                  value={formData.facebook_page_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebook_page_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_instagram_handle">Instagram</Label>
                <Input
                  id="edit_instagram_handle"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_website_url">Site</Label>
                <Input
                  id="edit_website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  type="url"
                />
              </div>
              <div>
                <Label htmlFor="edit_industry">Setor</Label>
                <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software, TI">Software, TI</SelectItem>
                    <SelectItem value="Varejo">Varejo</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Moda">Moda</SelectItem>
                    <SelectItem value="Saúde">Saúde</SelectItem>
                    <SelectItem value="Educação">Educação</SelectItem>
                    <SelectItem value="Automotivo">Automotivo</SelectItem>
                    <SelectItem value="Imobiliário">Imobiliário</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingCompetitor(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar anúncio */}
      <Dialog open={!!addingAd} onOpenChange={(open) => !open && setAddingAd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Anúncio do Concorrente</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ad_platform">Plataforma</Label>
                <Select value={adFormData.platform} onValueChange={(value) => setAdFormData(prev => ({ ...prev, platform: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                    <SelectItem value="Instagram Ads">Instagram Ads</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="LinkedIn Ads">LinkedIn Ads</SelectItem>
                    <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ad_type">Tipo de Anúncio</Label>
                <Select value={adFormData.ad_type} onValueChange={(value) => setAdFormData(prev => ({ ...prev, ad_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                    <SelectItem value="collection">Coleção</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="ad_title">Título do Anúncio</Label>
              <Input
                id="ad_title"
                value={adFormData.ad_title}
                onChange={(e) => setAdFormData(prev => ({ ...prev, ad_title: e.target.value }))}
                placeholder="Título principal do anúncio"
              />
            </div>

            <div>
              <Label htmlFor="ad_copy">Copy do Anúncio</Label>
              <Textarea
                id="ad_copy"
                value={adFormData.ad_copy}
                onChange={(e) => setAdFormData(prev => ({ ...prev, ad_copy: e.target.value }))}
                placeholder="Texto principal do anúncio observado..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="call_to_action">Call to Action</Label>
                <Input
                  id="call_to_action"
                  value={adFormData.call_to_action}
                  onChange={(e) => setAdFormData(prev => ({ ...prev, call_to_action: e.target.value }))}
                  placeholder="Ex: Saiba Mais, Compre Agora"
                />
              </div>
              <div>
                <Label htmlFor="estimated_performance">Performance Estimada</Label>
                <Select value={adFormData.estimated_performance} onValueChange={(value) => setAdFormData(prev => ({ ...prev, estimated_performance: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alto Desempenho</SelectItem>
                    <SelectItem value="medium">Desempenho Médio</SelectItem>
                    <SelectItem value="low">Baixo Desempenho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="ad_notes">Observações</Label>
              <Textarea
                id="ad_notes"
                value={adFormData.notes}
                onChange={(e) => setAdFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Insights, padrões observados, estratégias identificadas..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddingAd(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Anúncio'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Análise Competitiva */}
      {analyzingCompetitor && (
        <CompetitorAnalysisModal
          competitor={analyzingCompetitor}
          competitorAds={getCompetitorAds(analyzingCompetitor.id)}
          open={!!analyzingCompetitor}
          onOpenChange={(open) => !open && setAnalyzingCompetitor(null)}
        />
      )}
    </>
  );
};