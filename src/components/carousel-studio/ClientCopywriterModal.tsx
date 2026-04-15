// src/components/carousel-studio/ClientCopywriterModal.tsx
import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  ClientCopywriter,
  useClientCopywriter,
  useSaveClientCopywriter,
} from "@/hooks/useClientCopywriter";
import { useCompany } from "@/contexts/CompanyContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  clientName: string;
}

type FormValues = Omit<ClientCopywriter, "client_id" | "company_id">;

export function ClientCopywriterModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: Props) {
  const { activeCompany } = useCompany();
  const { data: existing, isLoading } = useClientCopywriter(clientId);
  const { mutate: save, isPending: isSaving } = useSaveClientCopywriter();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      tom_de_voz: "",
      publico_alvo: "",
      persona_marca: "",
      regras_de_copy: "",
      exemplos_aprovados: "",
      palavras_evitar: "",
      palavras_preferidas: "",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        tom_de_voz: existing.tom_de_voz ?? "",
        publico_alvo: existing.publico_alvo ?? "",
        persona_marca: existing.persona_marca ?? "",
        regras_de_copy: existing.regras_de_copy ?? "",
        exemplos_aprovados: existing.exemplos_aprovados ?? "",
        palavras_evitar: existing.palavras_evitar ?? "",
        palavras_preferidas: existing.palavras_preferidas ?? "",
      });
    }
  }, [existing, reset]);

  const onSubmit = (values: FormValues) => {
    save(
      {
        client_id: clientId,
        company_id: activeCompany.company_id,
        ...values,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Copywriter — {clientName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                TOM DE VOZ
              </Label>
              <Input
                {...register("tom_de_voz")}
                placeholder="Ex: Informal, próximo, usa linguagem leve..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                PÚBLICO-ALVO
              </Label>
              <Input
                {...register("publico_alvo")}
                placeholder="Ex: Mulheres 25-40, interessadas em saúde..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                PERSONA DA MARCA
              </Label>
              <Input
                {...register("persona_marca")}
                placeholder="Ex: Marca humanizada, como uma amiga expert..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                REGRAS DE COPY
              </Label>
              <Textarea
                {...register("regras_de_copy")}
                placeholder="Ex: Sempre termine slides com pergunta, use técnica PAS..."
                className="min-h-[70px] resize-none text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                PALAVRAS/TERMOS PREFERIDOS
              </Label>
              <Input
                {...register("palavras_preferidas")}
                placeholder="Ex: transformação, resultado, jornada"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                PALAVRAS/TERMOS A EVITAR
              </Label>
              <Input
                {...register("palavras_evitar")}
                placeholder="Ex: barato, promoção, compre agora"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                EXEMPLOS DE COPIES APROVADAS
              </Label>
              <Textarea
                {...register("exemplos_aprovados")}
                placeholder="Cole aqui exemplos de textos que funcionaram bem para este cliente..."
                className="min-h-[100px] resize-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Copywriter"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
