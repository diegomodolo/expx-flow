import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ListChecks, ChevronRight, Plus } from 'lucide-react';
import { useChecklistTemplates } from '@/hooks/useChecklistTemplates';

interface ImportChecklistTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: { id: string; text: string; completed: boolean }[]) => void;
}

export function ImportChecklistTemplateModal({ open, onOpenChange, onImport }: ImportChecklistTemplateModalProps) {
  const { templates, isLoading, fetchTemplateItems } = useChecklistTemplates();
  const [search, setSearch] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (templateId: string) => {
    setLoadingTemplate(templateId);
    try {
      const items = await fetchTemplateItems(templateId);
      const checklistItems = items.map(item => ({
        id: crypto.randomUUID(),
        text: item.text,
        completed: false,
      }));
      onImport(checklistItems);
      onOpenChange(false);
    } catch {
      // error handled silently
    } finally {
      setLoadingTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Importar Template de Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <ListChecks className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum template encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  disabled={loadingTemplate === template.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ListChecks className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
