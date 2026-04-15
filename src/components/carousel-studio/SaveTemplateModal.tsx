// src/components/carousel-studio/SaveTemplateModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useClients } from "@/hooks/useClients";
import { useCreateTemplate } from "@/hooks/useCarouselStudioTemplates";
import { StudioProject, StudioSlide, TemplateSlideConfig } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: StudioProject;
  slides: StudioSlide[];
}

/** Campos de StudioSlide a excluir ao gerar a config do template */
const EXCLUDED_SLIDE_FIELDS = new Set([
  "id",
  "project_id",
  "headline",
  "subtitle",
  "visual_description",
  "bg_image_url",
  "bg_position_x",
  "bg_position_y",
  "bg_zoom",
  "content_image_urls",
  "badge_photo_url",
  "badge_name_text",
  "exported_image_url",
  "created_at",
  "updated_at",
]);

function extractVisualConfig(slide: StudioSlide): TemplateSlideConfig {
  return Object.fromEntries(
    Object.entries(slide).filter(([key]) => !EXCLUDED_SLIDE_FIELDS.has(key)),
  ) as TemplateSlideConfig;
}

export function SaveTemplateModal({
  open,
  onOpenChange,
  project,
  slides,
}: Props) {
  const [name, setName] = useState(project.title.slice(0, 60));
  const [clientId, setClientId] = useState<string>(project.client_id ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { clients, loading: loadingClients } = useClients();
  const createTemplate = useCreateTemplate();

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente para o template");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe um nome para o template");
      return;
    }

    const slidesConfig = slides
      .slice()
      .sort((a, b) => a.slide_number - b.slide_number)
      .map(extractVisualConfig);

    try {
      await createTemplate.mutateAsync({
        companyId: project.company_id,
        clientId,
        name: name.trim(),
        style: project.style,
        fontPair: project.font_pair,
        accentColor: project.accent_color,
        instagramHandle: project.instagram_handle,
        imageMode: project.image_mode,
        slidesCount: slides.length,
        slidesConfig,
      });
      toast.success("Template salvo!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar template");
    }
  };

  React.useEffect(() => {
    if (open) {
      setName(project.title.slice(0, 60));
      setClientId(project.client_id ?? "");
    }
  }, [open, project.title, project.client_id]);

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              NOME DO TEMPLATE
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Template Dark Minimalista"
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              CLIENTE (OBRIGATÓRIO)
            </Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between text-sm h-9"
                  disabled={loadingClients}
                >
                  <span className="truncate">
                    {selectedClient
                      ? selectedClient.name
                      : "Selecionar cliente..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setClientId(client.id);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            clientId === client.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="truncate">{client.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createTemplate.isPending || !name.trim() || !clientId}
          >
            {createTemplate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar Template"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
