import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, FolderPlus, Send, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadSegment {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  lead_count: number | null;
}

interface SendToSegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  leadsCount: number;
  onConfirm: (segmentId: string, segmentName: string, isNew: boolean) => Promise<void>;
}

export function SendToSegmentModal({
  open,
  onOpenChange,
  companyId,
  leadsCount,
  onConfirm,
}: SendToSegmentModalProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [newSegmentName, setNewSegmentName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch existing segments
  const { data: segments, isLoading: isLoadingSegments } = useQuery({
    queryKey: ['lead-segments-for-send', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_segments')
        .select('id, name, description, color, icon, lead_count')
        .eq('company_id', companyId)
        .order('name');
      
      if (error) throw error;
      return data as LeadSegment[];
    },
    enabled: open && !!companyId
  });

  const filteredSegments = segments?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = async () => {
    if (isCreatingNew && !newSegmentName.trim()) {
      toast.error("Digite o nome do novo segmento");
      return;
    }
    
    if (!isCreatingNew && !selectedSegmentId) {
      toast.error("Selecione um segmento");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        // Create new segment first
        const { data: newSegment, error } = await supabase
          .from('lead_segments')
          .insert({
            company_id: companyId,
            name: newSegmentName.trim(),
            segment_type: 'sector',
            is_auto: false,
            color: '#3b82f6',
            icon: '📁',
            lead_count: 0
          })
          .select('id, name')
          .single();
        
        if (error) throw error;
        await onConfirm(newSegment.id, newSegment.name, true);
      } else {
        const segment = segments?.find(s => s.id === selectedSegmentId);
        await onConfirm(selectedSegmentId, segment?.name || '', false);
      }
      
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error("Error sending to segment:", error);
      toast.error("Erro ao enviar leads para o segmento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setSelectedSegmentId("");
    setNewSegmentName("");
    setIsCreatingNew(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetState();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar para Segmento
          </DialogTitle>
          <DialogDescription>
            Enviar <strong>{leadsCount.toLocaleString('pt-BR')}</strong> leads filtrados para um segmento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Toggle between existing and new */}
          <div className="flex gap-2">
            <Button
              variant={!isCreatingNew ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCreatingNew(false)}
              className="flex-1"
            >
              Segmento Existente
            </Button>
            <Button
              variant={isCreatingNew ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCreatingNew(true)}
              className="flex-1 gap-1"
            >
              <FolderPlus className="h-4 w-4" />
              Criar Novo
            </Button>
          </div>

          {isCreatingNew ? (
            <div className="space-y-2">
              <Label htmlFor="newSegmentName">Nome do novo segmento</Label>
              <Input
                id="newSegmentName"
                placeholder="Ex: Leads Qualificados SP"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar segmento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Segments list */}
              <ScrollArea className="h-64 border rounded-md">
                {isLoadingSegments ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSegments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <p className="text-sm text-center">
                      {searchTerm ? "Nenhum segmento encontrado" : "Nenhum segmento criado ainda"}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsCreatingNew(true)}
                      className="mt-2"
                    >
                      Criar novo segmento
                    </Button>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedSegmentId}
                    onValueChange={setSelectedSegmentId}
                    className="p-2 space-y-1"
                  >
                    {filteredSegments.map((segment) => (
                      <div
                        key={segment.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors
                          ${selectedSegmentId === segment.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted border border-transparent'
                          }
                        `}
                        onClick={() => setSelectedSegmentId(segment.id)}
                      >
                        <RadioGroupItem value={segment.id} id={segment.id} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{segment.icon || '📁'}</span>
                            <span className="font-medium truncate">{segment.name}</span>
                          </div>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {segment.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {(segment.lead_count || 0).toLocaleString('pt-BR')} leads
                        </Badge>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
