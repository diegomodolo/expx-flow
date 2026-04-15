// src/hooks/useClientCopywriter.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientCopywriter {
  client_id: string;
  company_id: string;
  tom_de_voz: string | null;
  publico_alvo: string | null;
  persona_marca: string | null;
  regras_de_copy: string | null;
  exemplos_aprovados: string | null;
  palavras_evitar: string | null;
  palavras_preferidas: string | null;
}

export type ClientCopywriterInput = Omit<ClientCopywriter, "company_id">;

export function useClientCopywriter(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["client-copywriter", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_copywriters")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as ClientCopywriter | null;
    },
    enabled: !!clientId,
  });
}

export function useSaveClientCopywriter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ClientCopywriterInput & { company_id: string },
    ) => {
      const { error } = await supabase
        .from("client_copywriters")
        .upsert(input, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-copywriter", variables.client_id],
      });
      toast.success("Copywriter salvo com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar copywriter");
    },
  });
}

/**
 * Serializa as instruções do copywriter em um bloco de texto para injetar no systemPrompt da IA.
 * Campos vazios/nulos são omitidos.
 */
export function serializeCopywriter(
  cw: ClientCopywriter | null | undefined,
): string | null {
  if (!cw) return null;

  const lines: string[] = [];

  if (cw.tom_de_voz?.trim()) lines.push(`Tom de voz: ${cw.tom_de_voz.trim()}`);
  if (cw.publico_alvo?.trim())
    lines.push(`Público-alvo: ${cw.publico_alvo.trim()}`);
  if (cw.persona_marca?.trim())
    lines.push(`Persona da marca: ${cw.persona_marca.trim()}`);
  if (cw.regras_de_copy?.trim())
    lines.push(`Regras de copy: ${cw.regras_de_copy.trim()}`);
  if (cw.palavras_preferidas?.trim())
    lines.push(`Palavras preferidas: ${cw.palavras_preferidas.trim()}`);
  if (cw.palavras_evitar?.trim())
    lines.push(`Palavras a evitar: ${cw.palavras_evitar.trim()}`);
  if (cw.exemplos_aprovados?.trim()) {
    lines.push(
      `Exemplos de copies aprovadas:\n${cw.exemplos_aprovados.trim()}`,
    );
  }

  if (lines.length === 0) return null;
  return lines.join("\n");
}
