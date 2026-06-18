import { useEffect, useState } from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  validateTokens,
  type TokenValidationResult,
  InstallerApiError,
} from "@/components/onboarding/api/installerClient";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

export type TokenField = "vercelToken" | "supabaseToken";

/** Chave do campo no body vs chave no resultado da API. */
const FIELD_TO_API_KEY: Record<TokenField, "vercel" | "supabase"> = {
  vercelToken: "vercel",
  supabaseToken: "supabase",
};

interface TokenStepSharedProps {
  data: OnboardingData;
  field: TokenField;
  label: string;
  description: string;
  helpText: string;
  helpLink: {
    href: string;
    label: string;
  };
  validHint: string;
  invalidHint: string;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  /** Token do "outro" — necessário porque validate-tokens valida ambos. */
  otherToken: string;
  otherField: TokenField;
  validateLabel?: string;
}

export function TokenStepShared(props: TokenStepSharedProps) {
  const {
    data,
    field,
    label,
    description,
    helpText,
    helpLink,
    validHint,
    invalidHint,
    onUpdate,
    onNext,
    onBack,
    otherToken,
    validateLabel = "Validar",
  } = props;

  const value = data[field];
  const [result, setResult] = useState<TokenValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset quando o usuário muda o token depois de validado.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [value]);

  const isValid = result !== null && result[FIELD_TO_API_KEY[field]] === true;
  const isInvalid =
    result !== null && result[FIELD_TO_API_KEY[field]] === false;

  const canSubmit = value.trim().length > 0 && !loading;
  const canAdvance = isValid;

  async function handleValidate() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<TokenField, string> = {
        vercelToken: "",
        supabaseToken: "",
      };
      body[field] = value.trim();
      body[props.otherField] = otherToken.trim();
      const res = await validateTokens({
        vercelToken: body.vercelToken,
        supabaseToken: body.supabaseToken,
      });
      setResult(res);
      // Mantém válido mesmo se o "outro" falhar (cada passo valida o seu).
    } catch (err) {
      const message =
        err instanceof InstallerApiError
          ? err.message
          : "Não foi possível validar o token. Verifique sua conexão.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <CardTitle className="text-xl">{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
        <p className="text-muted-foreground">{helpText}</p>
        <a
          href={helpLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          {helpLink.label}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={field}
            name={field}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Cole o token aqui"
            value={value}
            onChange={(e) =>
              onUpdate({ [field]: e.target.value } as Partial<OnboardingData>)
            }
            aria-invalid={isInvalid}
            aria-describedby={`${field}-feedback`}
          />
          <Button
            type="button"
            onClick={handleValidate}
            disabled={!canSubmit}
            variant="secondary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Validando...
              </>
            ) : (
              validateLabel
            )}
          </Button>
        </div>
        <FeedbackArea
          id={`${field}-feedback`}
          loading={loading}
          error={error}
          isValid={isValid}
          isInvalid={isInvalid}
          result={result}
          validHint={validHint}
          invalidHint={invalidHint}
          field={field}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Button>
        <Button type="button" onClick={onNext} disabled={!canAdvance}>
          Avançar
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function FeedbackArea(props: {
  id: string;
  loading: boolean;
  error: string | null;
  isValid: boolean;
  isInvalid: boolean;
  result: TokenValidationResult | null;
  validHint: string;
  invalidHint: string;
  field: TokenField;
}) {
  if (props.loading) {
    return (
      <p
        id={props.id}
        className="text-sm text-muted-foreground"
        aria-live="polite"
      >
        Validando o token...
      </p>
    );
  }
  if (props.error) {
    return (
      <p
        id={props.id}
        role="alert"
        className="flex items-center gap-1.5 text-sm text-destructive"
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        {props.error}
      </p>
    );
  }
  if (props.isValid) {
    return (
      <p
        id={props.id}
        className="flex items-center gap-1.5 text-sm text-emerald-600"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {props.validHint}
      </p>
    );
  }
  if (props.isInvalid) {
    const msg =
      props.result?.error && props.result.error.length > 0
        ? props.result.error
        : props.invalidHint;
    return (
      <p
        id={props.id}
        role="alert"
        className="flex items-center gap-1.5 text-sm text-destructive"
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        {msg}
      </p>
    );
  }
  return null;
}
