import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, ArrowRight, Loader2, Plus, Settings, ImageIcon, Eye, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { usePresentations, usePresentationDetails } from "@/hooks/usePresentations";
import { CreativesList } from "./CreativesList";
import { CreativeForm } from "./CreativeForm";
import { PresentationPreview } from "./PresentationPreview";

interface PresentationWizardProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear + i - 1),
  label: String(currentYear + i - 1),
}));

export function PresentationWizard({ open, onClose, editingId }: PresentationWizardProps) {
  const [step, setStep] = useState<'config' | 'creatives' | 'preview'>('config');
  const [showCreativeForm, setShowCreativeForm] = useState(false);
  const [editingCreativeId, setEditingCreativeId] = useState<string | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    month: String(new Date().getMonth() + 1),
    year: String(currentYear),
    primary_color: "#1a73e8",
    secondary_color: "#ffffff",
  });

  const { clients } = useClients();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { createPresentation, updatePresentation } = usePresentations();
  const { data: presentationDetails, isLoading: loadingDetails } = usePresentationDetails(editingId || '');

  const [presentationId, setPresentationId] = useState<string | null>(editingId);

  useEffect(() => {
    if (editingId && presentationDetails) {
      setFormData({
        name: presentationDetails.name,
        client_id: presentationDetails.client_id,
        month: String(presentationDetails.month),
        year: String(presentationDetails.year),
        primary_color: presentationDetails.primary_color,
        secondary_color: presentationDetails.secondary_color,
      });
      setPresentationId(editingId);
      setStep('creatives');
    }
  }, [editingId, presentationDetails]);

  useEffect(() => {
    if (!open) {
      setStep('config');
      setFormData({
        name: "",
        client_id: "",
        month: String(new Date().getMonth() + 1),
        year: String(currentYear),
        primary_color: "#1a73e8",
        secondary_color: "#ffffff",
      });
      setPresentationId(null);
      setShowCreativeForm(false);
      setEditingCreativeId(null);
    }
  }, [open]);

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({ ...prev, client_id: clientId }));
    
    // Auto-set name based on client and month/year
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const monthName = MONTHS.find(m => m.value === formData.month)?.label;
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        name: `Conteúdo ${monthName} ${formData.year} - ${client.name}`,
      }));
    }
  };

  const handleCreatePresentation = async () => {
    if (!activeCompany?.company_id || !user?.id) return;

    const result = await createPresentation.mutateAsync({
      ...formData,
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      company_id: activeCompany.company_id,
      user_id: user.id,
      status: 'draft',
    });

    setPresentationId(result.id);
    setStep('creatives');
  };

  const handleEditCreative = (id: string) => {
    setEditingCreativeId(id);
    setShowCreativeForm(true);
  };

  const handleCloseCreativeForm = () => {
    setShowCreativeForm(false);
    setEditingCreativeId(null);
  };

  const isConfigValid = formData.name && formData.client_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'config' && (
              <>
                <Settings className="w-5 h-5" />
                Configuração da Apresentação
              </>
            )}
            {step === 'creatives' && (
              <>
                <ImageIcon className="w-5 h-5" />
                Gerenciar Criativos
              </>
            )}
            {step === 'preview' && (
              <>
                <Eye className="w-5 h-5" />
                Preview da Apresentação
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'config' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientPopoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        {formData.client_id
                          ? clients.find((client) => client.id === formData.client_id)?.name
                          : "Selecione o cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  handleClientChange(client.id);
                                  setClientPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.client_id === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="name">Nome da Apresentação</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Conteúdo Dezembro 2025 - Cliente"
                  />
                </div>

                <div>
                  <Label>Mês</Label>
                  <Select 
                    value={formData.month} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, month: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ano</Label>
                  <Select 
                    value={formData.year} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, year: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'creatives' && presentationId && (
            <>
              {showCreativeForm ? (
                <CreativeForm
                  presentationId={presentationId}
                  editingId={editingCreativeId}
                  onClose={handleCloseCreativeForm}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={() => setShowCreativeForm(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Criativo
                    </Button>
                  </div>
                  <CreativesList
                    presentationId={presentationId}
                    onEdit={handleEditCreative}
                  />
                </div>
              )}
            </>
          )}

          {step === 'preview' && presentationId && (
            <PresentationPreview presentationId={presentationId} />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step !== 'config' && !showCreativeForm && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step === 'preview' ? 'creatives' : 'config')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            
            {step === 'config' && (
              <Button 
                onClick={handleCreatePresentation}
                disabled={!isConfigValid || createPresentation.isPending}
                className="gap-2"
              >
                {createPresentation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}

            {step === 'creatives' && !showCreativeForm && (
              <Button onClick={() => setStep('preview')} className="gap-2">
                Ver Preview
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
