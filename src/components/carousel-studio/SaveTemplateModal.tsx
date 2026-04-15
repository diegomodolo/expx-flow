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
import {
  useCreateTemplate,
  useUpdateTemplate,
  useClientTemplates,
} from "@/hooks/useCarouselStudioTemplates";
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

type Mode = "create" | "update";

export function SaveTemplateModal({
  open,
  onOpenChange,
  project,
  slides,
}: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState(project.title.slice(0, 60));
  const [clientId, setClientId] = useState<string>(project.client_id ?? "");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { clients, loading: loadingClients } = useClients();
  const { data: existingTemplates } = useClientTemplates(clientId || null);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const hasTemplates = (existingTemplates?.length ?? 0) > 0;
  const selectedTemplate = existingTemplates?.find(
    (t) => t.id === selectedTemplateId,
  );

  // Ao trocar de cliente, volta ao modo criar e limpa seleção
  const handleClientChange = (id: string) => {
    setClientId(id);
    setSelectedTemplateId("");
    setMode("create");
    setClientPickerOpen(false);
  };

  // Ao selecionar template para atualizar, preenche o nome
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const t = existingTemplates?.find((t) => t.id === id);
    if (t) setName(t.name);
    setTemplatePickerOpen(false);
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente para o template");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe um nome para o template");
      return;
    }
    if (mode === "update" && !selectedTemplateId) {
      toast.error("Selecione qual template deseja atualizar");
      return;
    }

    const slidesConfig = slides
      .slice()
      .sort((a, b) => a.slide_number - b.slide_number)
      .map(extractVisualConfig);

    try {
      if (mode === "update") {
        await updateTemplate.mutateAsync({
          templateId: selectedTemplateId,
          clientId,
          companyId: project.company_id,
          name: name.trim(),
          style: project.style,
          fontPair: project.font_pair,
          accentColor: project.accent_color,
          instagramHandle: project.instagram_handle,
          imageMode: project.image_mode,
          slidesCount: slides.length,
          slidesConfig,
        });
        toast.success("Template atualizado!");
      } else {
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
      }
      onOpenChange(false);
    } catch {
      toast.error(
        mode === "update"
          ? "Erro ao atualizar template"
          : "Erro ao salvar template",
      );
    }
  };

  React.useEffect(() => {
    if (open) {
      setName(project.title.slice(0, 60));
      setClientId(project.client_id ?? "");
      setSelectedTemplateId("");
      setMode("create");
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
          {/* Cliente */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              CLIENTE (OBRIGATÓRIO)
            </Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
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
                        onSelect={() => handleClientChange(client.id)}
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

          {/* Modo: criar novo ou atualizar existente */}
          {clientId && hasTemplates && (
            <div className="flex gap-2">
              <Button
                variant={mode === "create" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setMode("create");
                  setSelectedTemplateId("");
                  setName(project.title.slice(0, 60));
                }}
              >
                Novo template
              </Button>
              <Button
                variant={mode === "update" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setMode("update")}
              >
                Atualizar existente
              </Button>
            </div>
          )}

          {/* Seletor de template (modo update) */}
          {mode === "update" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                TEMPLATE A ATUALIZAR
              </Label>
              <Popover
                open={templatePickerOpen}
                onOpenChange={setTemplatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-sm h-9"
                  >
                    <span className="truncate">
                      {selectedTemplate
                        ? selectedTemplate.name
                        : "Selecionar template..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar template..." />
                    <CommandEmpty>Nenhum template encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {existingTemplates?.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={t.name}
                          onSelect={() => handleTemplateSelect(t.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedTemplateId === t.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="truncate">{t.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Nome */}
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
            disabled={
              isPending ||
              !name.trim() ||
              !clientId ||
              (mode === "update" && !selectedTemplateId)
            }
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...
              </>
            ) : mode === "update" ? (
              "Atualizar Template"
            ) : (
              "Salvar Template"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
