import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { useCompetitors } from '@/hooks/useCompetitors';
import { toast } from 'sonner';

interface CompetitorDialogProps {
  clientId: string;
  onCompetitorAdded?: () => void;
}

export const CompetitorDialog = ({ clientId, onCompetitorAdded }: CompetitorDialogProps) => {
  const { createCompetitor } = useCompetitors(clientId);
  const [open, setOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.company_name) {
      toast.error('Nome e empresa são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await createCompetitor(formData);
      setFormData({
        name: '',
        company_name: '',
        facebook_page_name: '',
        instagram_handle: '',
        website_url: '',
        industry: '',
        description: ''
      });
      setOpen(false);
      onCompetitorAdded?.();
    } catch (error) {
      console.error('Error creating competitor:', error);
      toast.error('Erro ao adicionar concorrente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Concorrente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Concorrente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Concorrente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <Label htmlFor="company_name">Empresa *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Ex: Empresa Concorrente LTDA"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facebook_page_name">Página do Facebook</Label>
              <Input
                id="facebook_page_name"
                value={formData.facebook_page_name}
                onChange={(e) => handleInputChange('facebook_page_name', e.target.value)}
                placeholder="Nome da página no Facebook"
              />
            </div>
            <div>
              <Label htmlFor="instagram_handle">Instagram</Label>
              <Input
                id="instagram_handle"
                value={formData.instagram_handle}
                onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                placeholder="@username"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website_url">Site</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://site-concorrente.com"
                type="url"
              />
            </div>
            <div>
              <Label htmlFor="industry">Setor</Label>
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
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
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o concorrente, seus diferenciais, estratégias observadas..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar Concorrente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};