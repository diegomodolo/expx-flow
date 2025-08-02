import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompetitors, Competitor } from '@/hooks/useCompetitors';
import { toast } from 'sonner';

interface AdLibraryScrapeDialogProps {
  competitor: Competitor;
  onAdsAdded: () => void;
}

interface ScrapedAd {
  ad_title?: string;
  ad_copy?: string;
  call_to_action?: string;
  ad_type?: string;
  estimated_performance?: string;
  notes?: string;
  platforms?: string;
  date_started?: string;
}

export const AdLibraryScrapeDialog = ({ competitor, onAdsAdded }: AdLibraryScrapeDialogProps) => {
  const { createCompetitorAd } = useCompetitors(competitor.client_id);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [adLibraryUrl, setAdLibraryUrl] = useState('');
  const [scrapedAds, setScrapedAds] = useState<ScrapedAd[]>([]);
  const [selectedAds, setSelectedAds] = useState<Set<number>>(new Set());

  const handleScrape = async () => {
    if (!adLibraryUrl) {
      toast.error('Insira a URL da biblioteca de anúncios');
      return;
    }

    setLoading(true);
    setProgress(10);
    setScrapedAds([]);

    try {
      setProgress(30);
      
      const { data, error } = await supabase.functions.invoke('scrape-competitor-ads', {
        body: {
          url: adLibraryUrl,
          competitorId: competitor.id,
          competitorName: competitor.name
        }
      });

      setProgress(70);

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer scraping dos anúncios');
      }

      setProgress(90);
      setScrapedAds(data.ads || []);
      
      // Selecionar todos os anúncios por padrão
      setSelectedAds(new Set(data.ads?.map((_: any, index: number) => index) || []));
      
      setProgress(100);
      toast.success(`${data.ads?.length || 0} anúncios extraídos com sucesso!`);

    } catch (error) {
      console.error('Error scraping ads:', error);
      toast.error('Erro ao extrair anúncios da biblioteca');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelectedAds = async () => {
    if (selectedAds.size === 0) {
      toast.error('Selecione pelo menos um anúncio para salvar');
      return;
    }

    setLoading(true);
    let savedCount = 0;

    try {
      for (const index of selectedAds) {
        const ad = scrapedAds[index];
        if (ad) {
          await createCompetitorAd({
            competitor_id: competitor.id,
            platform: ad.platforms || 'Facebook Ads',
            ad_title: ad.ad_title || `Anúncio ${index + 1}`,
            ad_copy: ad.ad_copy || '',
            call_to_action: ad.call_to_action || '',
            ad_type: ad.ad_type || 'unknown',
            estimated_performance: ad.estimated_performance || 'medium',
            notes: `${ad.notes || ''}\n\nExtraído automaticamente de: ${adLibraryUrl}`.trim()
          });
          savedCount++;
        }
      }

      toast.success(`${savedCount} anúncios salvos com sucesso!`);
      onAdsAdded();
      setOpen(false);
      setScrapedAds([]);
      setSelectedAds(new Set());
      setAdLibraryUrl('');

    } catch (error) {
      console.error('Error saving ads:', error);
      toast.error('Erro ao salvar anúncios');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdSelection = (index: number) => {
    const newSelected = new Set(selectedAds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedAds(newSelected);
  };

  const selectAllAds = () => {
    setSelectedAds(new Set(scrapedAds.map((_, index) => index)));
  };

  const deselectAllAds = () => {
    setSelectedAds(new Set());
  };

  const getPerformanceBadgeVariant = (performance: string) => {
    switch (performance) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Globe className="w-4 h-4 mr-2" />
          Biblioteca de Anúncios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Extrair Anúncios - {competitor.name}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Cole a URL da biblioteca de anúncios do Facebook para extrair automaticamente os anúncios
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="library_url">URL da Biblioteca de Anúncios</Label>
            <div className="flex space-x-2">
              <Input
                id="library_url"
                value={adLibraryUrl}
                onChange={(e) => setAdLibraryUrl(e.target.value)}
                placeholder="https://www.facebook.com/ads/library/?..."
                className="flex-1"
              />
              <Button 
                onClick={handleScrape}
                disabled={loading || !adLibraryUrl}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Extrair
                  </>
                )}
              </Button>
            </div>
            {loading && (
              <Progress value={progress} className="w-full mt-2" />
            )}
          </div>


          {/* Anúncios extraídos */}
          {scrapedAds.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Anúncios Extraídos ({scrapedAds.length})
                </h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllAds}>
                    Selecionar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllAds}>
                    Desmarcar Todos
                  </Button>
                  <Button 
                    onClick={handleSaveSelectedAds}
                    disabled={loading || selectedAds.size === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Salvar Selecionados ({selectedAds.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {scrapedAds.map((ad, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all ${
                      selectedAds.has(index) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => toggleAdSelection(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {ad.ad_title || `Anúncio ${index + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ad.platforms || 'Facebook Ads'} • {ad.ad_type || 'Tipo não identificado'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getPerformanceBadgeVariant(ad.estimated_performance || 'medium')}>
                            {ad.estimated_performance === 'high' ? 'Alto' : 
                             ad.estimated_performance === 'low' ? 'Baixo' : 'Médio'}
                          </Badge>
                          {selectedAds.has(index) && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                      
                      {ad.ad_copy && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-3">
                          {ad.ad_copy}
                        </p>
                      )}
                      
                      {ad.call_to_action && (
                        <div className="text-xs">
                          <span className="font-medium">CTA:</span> {ad.call_to_action}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};