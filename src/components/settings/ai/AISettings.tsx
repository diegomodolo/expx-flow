import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Save, Settings2, Loader2, Trash2 } from "lucide-react";
import { useAIModelConfigs } from "@/hooks/useAIModelConfigs";
import { useAIApiKey } from "@/hooks/useAIApiKey";
import { ModelSelectorModal } from "./ModelSelectorModal";
import { AI_FUNCTIONS, AI_FUNCTION_CATEGORIES } from "./aiModelFunctions";

export function AISettings() {
  const { configs, upsertConfig, deleteConfig } = useAIModelConfigs();
  const { maskedKey, hasKey, saveKey } = useAIApiKey();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    functionName: string;
    field: "primary" | "fallback";
  } | null>(null);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    saveKey.mutate(apiKeyInput.trim());
    setApiKeyInput("");
  };

  const handleOpenModelSelector = (
    functionName: string,
    field: "primary" | "fallback",
  ) => {
    setModalTarget({ functionName, field });
    setModalOpen(true);
  };

  const handleModelSelect = (modelId: string) => {
    if (!modalTarget) return;
    const existing = configs.find(
      (c) => c.function_name === modalTarget.functionName,
    );

    if (modalTarget.field === "primary") {
      upsertConfig.mutate({
        functionName: modalTarget.functionName,
        primaryModel: modelId,
        fallbackModel: existing?.fallback_model,
      });
    } else {
      upsertConfig.mutate({
        functionName: modalTarget.functionName,
        primaryModel: existing?.primary_model || modelId,
        fallbackModel: modelId,
      });
    }
  };

  const getModelLabel = (
    functionName: string,
    field: "primary" | "fallback",
  ): string => {
    const config = configs.find((c) => c.function_name === functionName);
    const fnDef = AI_FUNCTIONS.find((f) => f.functionName === functionName);
    const fallbackDefault =
      field === "primary"
        ? fnDef?.defaultPrimary || "google/gemini-2.5-flash"
        : fnDef?.defaultFallback || null;

    if (!config) {
      return (
        fallbackDefault ||
        (field === "primary" ? "google/gemini-2.5-flash" : "Nenhum")
      );
    }
    const model =
      field === "primary" ? config.primary_model : config.fallback_model;
    return (
      model ||
      fallbackDefault ||
      (field === "primary" ? "google/gemini-2.5-flash" : "Nenhum")
    );
  };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Key do OpenRouter</CardTitle>
          <CardDescription>
            Insira sua chave de API do OpenRouter para acessar os modelos de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasKey && (
            <p className="text-sm text-muted-foreground">
              Chave atual: <span className="font-mono">{maskedKey}</span>
            </p>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={
                  hasKey ? "Substituir chave existente..." : "sk-or-..."
                }
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim() || saveKey.isPending}
            >
              {saveKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de cache */}
      <p className="text-xs text-muted-foreground">
        Alterações podem levar até 1 minuto para entrar em vigor em todas as
        funções.
      </p>

      {/* Functions by category */}
      {AI_FUNCTION_CATEGORIES.map((category) => {
        const functions = AI_FUNCTIONS.filter((f) => f.category === category);
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {functions.map((fn) => {
                  const hasConfig = configs.some(
                    (c) => c.function_name === fn.functionName,
                  );
                  return (
                    <div
                      key={fn.functionName}
                      className="flex items-center justify-between px-6 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fn.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {getModelLabel(fn.functionName, "primary")}
                          </span>
                          {getModelLabel(fn.functionName, "fallback") !==
                            "Nenhum" && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                →
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {getModelLabel(fn.functionName, "fallback")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasConfig && (
                          <Button
                            aria-label="Excluir"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteConfig.mutate(fn.functionName)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenModelSelector(fn.functionName, "primary")
                          }
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                          Modelo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenModelSelector(fn.functionName, "fallback")
                          }
                        >
                          Fallback
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleModelSelect}
        selectedModelId={
          modalTarget
            ? getModelLabel(modalTarget.functionName, modalTarget.field) !==
                "Padrão" &&
              getModelLabel(modalTarget.functionName, modalTarget.field) !==
                "Nenhum"
              ? getModelLabel(modalTarget.functionName, modalTarget.field)
              : undefined
            : undefined
        }
        title={
          modalTarget
            ? `Selecionar ${modalTarget.field === "primary" ? "Modelo Principal" : "Modelo de Fallback"}`
            : "Selecionar Modelo"
        }
      />
    </div>
  );
}
