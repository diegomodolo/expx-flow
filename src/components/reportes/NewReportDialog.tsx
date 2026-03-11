import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useCreateReport } from "@/hooks/useCreateReport";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

const bugSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  url: z.string().optional(),
  steps: z.string().optional(),
  stack_trace: z.string().optional(),
  suspected_file: z.string().optional(),
});

const featureSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  problem: z.string().min(1, "Problema é obrigatório"),
  proposal: z.string().min(1, "Proposta é obrigatória"),
  impact: z.string().min(1, "Impacto é obrigatório"),
  complexity: z.string().min(1, "Complexidade é obrigatória"),
  area: z.string().optional(),
});

type BugFormData = z.infer<typeof bugSchema>;
type FeatureFormData = z.infer<typeof featureSchema>;

interface NewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = ["Competitiva", "Automação", "IA / Agentes", "Integração", "UX / Interface"];
const IMPACTS = ["Crítico", "Alto", "Médio", "Baixo"];
const COMPLEXITIES = ["Simples", "Média", "Complexa"];
const AREAS = [
  "Dashboard", "Campanhas", "Clientes", "CRM", "Geradores",
  "Tarefas", "Relatórios", "Configurações", "WhatsApp", "Outro",
];

export function NewReportDialog({ open, onOpenChange }: NewReportDialogProps) {
  const [type, setType] = useState<"bug" | "feature">("bug");
  const createReport = useCreateReport();
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const bugForm = useForm<BugFormData>({
    resolver: zodResolver(bugSchema),
    defaultValues: { title: "", description: "", url: "", steps: "", stack_trace: "", suspected_file: "" },
  });

  const featureForm = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema),
    defaultValues: { title: "", category: "", problem: "", proposal: "", impact: "", complexity: "", area: "" },
  });

  const handleSubmit = async () => {
    if (!user || !activeCompany) return;

    if (type === "bug") {
      const valid = await bugForm.trigger();
      if (!valid) return;
      const values = bugForm.getValues();
      createReport.mutate(
        {
          type: "bug",
          title: values.title,
          description: values.description,
          extra_fields: {
            ...(values.url && { url: values.url }),
            ...(values.steps && { steps: values.steps }),
            ...(values.stack_trace && { stack_trace: values.stack_trace }),
            ...(values.suspected_file && { suspected_file: values.suspected_file }),
          },
          user_name: user.user_metadata?.full_name || user.email || "Usuário",
          company_id: activeCompany.company_id,
          user_id: user.id,
        },
        {
          onSuccess: () => {
            bugForm.reset();
            onOpenChange(false);
          },
        }
      );
    } else {
      const valid = await featureForm.trigger();
      if (!valid) return;
      const values = featureForm.getValues();
      createReport.mutate(
        {
          type: "feature",
          title: values.title,
          description: values.problem,
          extra_fields: {
            category: values.category,
            problem: values.problem,
            proposal: values.proposal,
            impact: values.impact,
            complexity: values.complexity,
            ...(values.area && { area: values.area }),
          },
          user_name: user.user_metadata?.full_name || user.email || "Usuário",
          company_id: activeCompany.company_id,
          user_id: user.id,
        },
        {
          onSuccess: () => {
            featureForm.reset();
            onOpenChange(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Reporte</DialogTitle>
        </DialogHeader>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("bug")}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              type === "bug"
                ? "bg-red-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Bug
          </button>
          <button
            type="button"
            onClick={() => setType("feature")}
            className={cn(
              "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
              type === "feature"
                ? "bg-violet-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Feature
          </button>
        </div>

        {/* Bug Form */}
        {type === "bug" && (
          <Form {...bugForm}>
            <form className="space-y-4">
              <FormField control={bugForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input placeholder="Descreva o problema em poucas palavras..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL onde ocorreu (opcional)</FormLabel>
                  <FormControl><Input placeholder="Ex: /campanhas/editar/123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="O que aconteceu? O que esperava que acontecesse?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="steps" render={({ field }) => (
                <FormItem>
                  <FormLabel>Passos para reproduzir (opcional)</FormLabel>
                  <FormControl><Textarea placeholder={"1. Acessar a página X\n2. Clicar no botão Y\n3. ..."} rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="stack_trace" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stack trace / erro no console (opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Cole o erro aqui..." rows={2} className="font-mono text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={bugForm.control} name="suspected_file" render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivo suspeito (opcional)</FormLabel>
                  <FormControl><Input placeholder="src/pages/Dashboard.tsx" className="font-mono text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        {/* Feature Form */}
        {type === "feature" && (
          <Form {...featureForm}>
            <form className="space-y-4">
              <FormField control={featureForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Feature</FormLabel>
                  <FormControl><Input placeholder="Nome da funcionalidade..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="problem" render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema que resolve</FormLabel>
                  <FormControl><Textarea placeholder="Qual problema ou necessidade essa feature resolve?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={featureForm.control} name="proposal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposta de implementação</FormLabel>
                  <FormControl><Textarea placeholder="Como você imagina que deveria funcionar?" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={featureForm.control} name="impact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impacto estimado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {IMPACTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={featureForm.control} name="complexity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {COMPLEXITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={featureForm.control} name="area" render={({ field }) => (
                <FormItem>
                  <FormLabel>Área do sistema (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        <Button
          onClick={handleSubmit}
          disabled={createReport.isPending}
          className="w-full mt-2"
        >
          {createReport.isPending ? "Enviando..." : "Enviar Reporte"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
