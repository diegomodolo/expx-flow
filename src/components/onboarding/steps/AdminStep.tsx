import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import {
  createAdmin,
  InstallerApiError,
} from "@/components/onboarding/api/installerClient";
import { invalidateInstallationStatus } from "@/guards/installationStatusCache";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

const adminSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().email("E-mail inválido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

type AdminFormValues = z.infer<typeof adminSchema>;

interface AdminStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AdminStep({ data, onUpdate, onNext, onBack }: AdminStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: data.adminEmail ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Observa valores para habilitar o botão dinamicamente.
  watch();

  async function onSubmit(values: AdminFormValues) {
    setServerError(null);
    if (!data.projectRef || !data.serviceRoleKey) {
      setServerError(
        "Não foi possível obter as credenciais do projeto recém-criado. Volte e tente novamente.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await createAdmin({
        projectRef: data.projectRef,
        serviceRoleKey: data.serviceRoleKey,
        email: values.email,
        password: values.password,
        fullName: values.fullName || undefined,
      });
      onUpdate({ adminEmail: values.email });
      // Invalida o cache do guard — ao navegar para "/", ele refaz o status.
      invalidateInstallationStatus();
      toast.success("Administrador criado com sucesso!");
      onNext();
    } catch (err) {
      const message =
        err instanceof InstallerApiError
          ? err.message
          : "Não foi possível criar o administrador. Tente novamente.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <CardTitle className="text-xl">Criar administrador</CardTitle>
        <CardDescription>
          Crie a conta do administrador da instalação. Este usuário terá acesso
          total ao Expx Flow.
        </CardDescription>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
        <div className="flex items-start gap-2">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            Anote o e-mail e a senha em local seguro. Eles só podem ser
            recuperados via fluxo de "esqueci minha senha" depois.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-fullName">Nome completo (opcional)</Label>
          <Input
            id="admin-fullName"
            placeholder="Ex: Maria Silva"
            autoComplete="name"
            {...register("fullName")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-email">E-mail</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-password">Senha</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-confirmPassword">Confirmar senha</Label>
          <Input
            id="admin-confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p role="alert" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Button>
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {submitting ? "Criando..." : "Criar administrador"}
        </Button>
      </div>
    </form>
  );
}
