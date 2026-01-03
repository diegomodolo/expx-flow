import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Loader2 } from "lucide-react";
import { useMarketResearchInsights } from "@/hooks/useMarketResearchInsights";

interface Props {
  clientId: string;
  onInsightAdded?: () => void;
}

export function TemasPesquisaDialog({ clientId, onInsightAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createInsight } = useMarketResearchInsights(clientId);
  
  const [formData, setFormData] = useState({
    topic: "",
    pain_point: "",
    opportunity: "",
    sentiment: "neutral",
    relevance_score: 5,
    source_url: "",
    source_type: "manual",
    raw_content: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      return;
    }

    setLoading(true);
    try {
      await createInsight(formData);
      setOpen(false);
      setFormData({
        topic: "",
        pain_point: "",
        opportunity: "",
        sentiment: "neutral",
        relevance_score: 5,
        source_url: "",
        source_type: "manual",
        raw_content: "",
      });
      onInsightAdded?.();
    } catch (error) {
      console.error('Error creating insight:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Tema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Tema de Pesquisa</DialogTitle>
          <DialogDescription>
            Adicione um tema ou insight de mercado para geração de conceitos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Tópico/Tema *</Label>
            <Input
              id="topic"
              placeholder="Ex: Dor nas costas no home office"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pain_point">Pain Point Principal</Label>
            <Textarea
              id="pain_point"
              placeholder="Qual a dor/problema que o público enfrenta?"
              value={formData.pain_point}
              onChange={(e) => setFormData({ ...formData, pain_point: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opportunity">Oportunidade Identificada</Label>
            <Textarea
              id="opportunity"
              placeholder="Como o produto/serviço resolve essa dor?"
              value={formData.opportunity}
              onChange={(e) => setFormData({ ...formData, opportunity: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sentiment">Sentimento</Label>
              <Select 
                value={formData.sentiment} 
                onValueChange={(value) => setFormData({ ...formData, sentiment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="neutral">Neutro</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_type">Tipo de Fonte</Label>
              <Select 
                value={formData.source_type} 
                onValueChange={(value) => setFormData({ ...formData, source_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="forum">Fórum</SelectItem>
                  <SelectItem value="social">Redes Sociais</SelectItem>
                  <SelectItem value="article">Artigo</SelectItem>
                  <SelectItem value="research">Pesquisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Relevância: {formData.relevance_score}/10</Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[formData.relevance_score]}
              onValueChange={([value]) => setFormData({ ...formData, relevance_score: value })}
            />
            <p className="text-xs text-muted-foreground">
              Temas com maior relevância têm prioridade na geração de conceitos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_url">URL da Fonte (opcional)</Label>
            <Input
              id="source_url"
              type="url"
              placeholder="https://..."
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="raw_content">Conteúdo/Citação (opcional)</Label>
            <Textarea
              id="raw_content"
              placeholder="Cole aqui um trecho relevante, citação ou comentário que inspirou este tema..."
              value={formData.raw_content}
              onChange={(e) => setFormData({ ...formData, raw_content: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.topic.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
