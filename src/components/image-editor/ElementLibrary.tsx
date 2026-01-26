import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Library, Sparkles, Trash2, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GenerateElementModal } from './GenerateElementModal';
import { CanvasElement } from './hooks/useImageEditor';

interface ElementLibraryProps {
  companyId: string;
  onAddElement: (type: CanvasElement['type'], config?: Partial<CanvasElement>) => void;
}

interface LibraryElement {
  id: string;
  name: string;
  image_url: string;
  category: string;
  description: string | null;
  tags: string[] | null;
  is_default: boolean;
  created_at: string;
}

// Default elements (built-in)
const DEFAULT_ELEMENTS: Omit<LibraryElement, 'id' | 'created_at'>[] = [
  {
    name: 'Smartphone',
    image_url: 'https://img.icons8.com/3d-fluency/256/iphone-x.png',
    category: 'dispositivos',
    description: 'Smartphone moderno',
    tags: ['device', 'mobile'],
    is_default: true,
  },
  {
    name: 'Laptop',
    image_url: 'https://img.icons8.com/3d-fluency/256/laptop.png',
    category: 'dispositivos',
    description: 'Laptop moderno',
    tags: ['device', 'computer'],
    is_default: true,
  },
  {
    name: 'Monitor',
    image_url: 'https://img.icons8.com/3d-fluency/256/monitor.png',
    category: 'dispositivos',
    description: 'Monitor de computador',
    tags: ['device', 'screen'],
    is_default: true,
  },
  {
    name: 'Tablet',
    image_url: 'https://img.icons8.com/3d-fluency/256/ipad.png',
    category: 'dispositivos',
    description: 'Tablet moderno',
    tags: ['device', 'tablet'],
    is_default: true,
  },
  {
    name: 'Estrela',
    image_url: 'https://img.icons8.com/3d-fluency/256/star.png',
    category: 'icones',
    description: 'Ícone de estrela',
    tags: ['icon', 'star', 'rating'],
    is_default: true,
  },
  {
    name: 'Coração',
    image_url: 'https://img.icons8.com/3d-fluency/256/like.png',
    category: 'icones',
    description: 'Ícone de coração',
    tags: ['icon', 'heart', 'love'],
    is_default: true,
  },
  {
    name: 'Check',
    image_url: 'https://img.icons8.com/3d-fluency/256/checkmark.png',
    category: 'icones',
    description: 'Ícone de verificação',
    tags: ['icon', 'check', 'success'],
    is_default: true,
  },
  {
    name: 'Seta',
    image_url: 'https://img.icons8.com/3d-fluency/256/right.png',
    category: 'icones',
    description: 'Seta para direita',
    tags: ['icon', 'arrow'],
    is_default: true,
  },
  {
    name: 'Café',
    image_url: 'https://img.icons8.com/3d-fluency/256/coffee-cup.png',
    category: 'objetos',
    description: 'Xícara de café',
    tags: ['object', 'coffee', 'drink'],
    is_default: true,
  },
  {
    name: 'Lâmpada',
    image_url: 'https://img.icons8.com/3d-fluency/256/idea.png',
    category: 'objetos',
    description: 'Lâmpada de ideia',
    tags: ['object', 'idea', 'light'],
    is_default: true,
  },
  {
    name: 'Foguete',
    image_url: 'https://img.icons8.com/3d-fluency/256/rocket.png',
    category: 'objetos',
    description: 'Foguete',
    tags: ['object', 'rocket', 'launch'],
    is_default: true,
  },
  {
    name: 'Megafone',
    image_url: 'https://img.icons8.com/3d-fluency/256/megaphone.png',
    category: 'objetos',
    description: 'Megafone',
    tags: ['object', 'marketing', 'announce'],
    is_default: true,
  },
];

export const ElementLibrary: React.FC<ElementLibraryProps> = ({
  companyId,
  onAddElement,
}) => {
  const [customElements, setCustomElements] = useState<LibraryElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomElements();
  }, [companyId]);

  const fetchCustomElements = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('editor_element_library')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomElements(data || []);
    } catch (error) {
      console.error('Error fetching elements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddElement = (imageUrl: string) => {
    onAddElement('image', {
      content: imageUrl,
      width: 150,
      height: 150,
      x: 200,
      y: 200,
    });
    toast.success('Elemento adicionado ao canvas');
  };

  const handleDeleteElement = async (elementId: string) => {
    setDeletingId(elementId);
    try {
      const { error } = await supabase
        .from('editor_element_library')
        .delete()
        .eq('id', elementId);

      if (error) throw error;
      
      setCustomElements(prev => prev.filter(el => el.id !== elementId));
      toast.success('Elemento removido');
    } catch (error) {
      console.error('Error deleting element:', error);
      toast.error('Erro ao remover elemento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleElementGenerated = (element: LibraryElement) => {
    setCustomElements(prev => [element, ...prev]);
    setShowGenerateModal(false);
    toast.success('Elemento gerado e salvo na biblioteca!');
  };

  const filterElements = <T extends { name: string; category?: string | null; tags?: string[] | null }>(elements: T[]): T[] => {
    if (!searchQuery.trim()) return elements;
    const query = searchQuery.toLowerCase();
    return elements.filter(el => 
      el.name.toLowerCase().includes(query) ||
      el.category?.toLowerCase().includes(query) ||
      el.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };

  const filteredDefaults = filterElements(DEFAULT_ELEMENTS);
  const filteredCustom = filterElements(customElements);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Library className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Biblioteca</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar elementos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Generate with AI button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => setShowGenerateModal(true)}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Gerar com IA
      </Button>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList className="w-full h-8">
          <TabsTrigger value="defaults" className="text-xs flex-1">
            Padrões
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs flex-1">
            Meus ({customElements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="mt-2">
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredDefaults.map((element, index) => (
                  <button
                    key={`default-${index}`}
                    className="group relative aspect-square rounded-md border border-border bg-background/50 hover:bg-accent/50 hover:border-primary/50 transition-all overflow-hidden"
                    onClick={() => handleAddElement(element.image_url)}
                    title={element.name}
                  >
                    <img
                      src={element.image_url}
                      alt={element.name}
                      className="w-full h-full object-contain p-1.5"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-medium text-foreground line-clamp-1">
                        {element.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="mt-2">
          <ScrollArea className="h-[200px]">
            {customElements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Library className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhum elemento personalizado.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 text-xs"
                  onClick={() => setShowGenerateModal(true)}
                >
                  Gerar com IA
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredCustom.map((element) => (
                  <div
                    key={element.id}
                    className="group relative aspect-square rounded-md border border-border bg-background/50 hover:bg-accent/50 hover:border-primary/50 transition-all overflow-hidden"
                  >
                    <button
                      className="w-full h-full"
                      onClick={() => handleAddElement(element.image_url)}
                      title={element.name}
                    >
                      <img
                        src={element.image_url}
                        alt={element.name}
                        className="w-full h-full object-contain p-1.5"
                        loading="lazy"
                      />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-medium text-foreground line-clamp-1">
                        {element.name}
                      </span>
                    </div>
                    <button
                      className="absolute top-1 right-1 p-1 rounded-sm bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElement(element.id);
                      }}
                      disabled={deletingId === element.id}
                      title="Remover elemento"
                    >
                      {deletingId === element.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {showGenerateModal && (
        <GenerateElementModal
          companyId={companyId}
          onClose={() => setShowGenerateModal(false)}
          onElementGenerated={handleElementGenerated}
        />
      )}
    </div>
  );
};
