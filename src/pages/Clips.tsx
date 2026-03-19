import React, { useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  useClipGenerator,
  Clip,
  ProcessingStep,
} from "@/hooks/useClipGenerator";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Film,
  Upload,
  Link,
  Sparkles,
  Download,
  RotateCcw,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

const CLIP_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  insight: { label: "Insight", icon: "💡" },
  story: { label: "História", icon: "📖" },
  storytelling: { label: "Storytelling", icon: "📖" },
  humor: { label: "Humor", icon: "😂" },
  controversy: { label: "Polêmica", icon: "🔥" },
  polêmica: { label: "Polêmica", icon: "🔥" },
  value: { label: "Valor", icon: "✅" },
  hook: { label: "Hook", icon: "🎣" },
  tutorial: { label: "Tutorial", icon: "🎓" },
  motivacional: { label: "Motivacional", icon: "💪" },
};

const DURATION_OPTIONS = [
  { value: "30", label: "Até 30 segundos" },
  { value: "60", label: "Até 1 minuto" },
  { value: "90", label: "Até 1 min 30s" },
  { value: "180", label: "Até 3 minutos" },
  { value: "300", label: "Até 5 minutos" },
  { value: "600", label: "Até 10 minutos" },
  { value: "900", label: "Até 15 minutos" },
  { value: "1200", label: "Até 20 minutos" },
  { value: "1800", label: "Até 30 minutos" },
];

export default function ClipsPage() {
  const { activeCompany } = useCompany();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("9:16");
  const [maxDuration, setMaxDuration] = useState("60");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [context, setContext] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "upload">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    job,
    clips,
    steps,
    isLoading,
    processUrl,
    uploadAndProcess,
    reset,
    isDone,
    isError,
    isProcessing,
  } = useClipGenerator();

  const buildOptions = () => ({
    maxClips: 30,
    format,
    maxDurationSeconds: Number(maxDuration),
    timeStartSeconds: timeStart ? parseTimeToSeconds(timeStart) : undefined,
    timeEndSeconds: timeEnd ? parseTimeToSeconds(timeEnd) : undefined,
    contextDescription: context.trim() || undefined,
    companyId: activeCompany?.company_id || undefined,
  });

  const handleSubmitUrl = async () => {
    if (!url.trim()) return;
    await processUrl(url, buildOptions());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndProcess(file, buildOptions());
  };

  const showForm = !job;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerador de Clipes Virais</h1>
            <p className="text-sm text-muted-foreground">
              Transforme vídeos longos em clipes curtos e virais com IA
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novo Processamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Input Mode */}
              <Tabs
                value={inputMode}
                onValueChange={(v) => setInputMode(v as "url" | "upload")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload de Arquivo
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    URL do vídeo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label>URL do vídeo (YouTube ou link direto)</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... ou link direto .mp4"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cole a URL do YouTube ou link direto do arquivo de vídeo.
                      Vídeos do YouTube serão baixados automaticamente.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div>
                    <Label>Arquivo de vídeo</Label>
                    <div
                      className="mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste um vídeo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV, AVI — máx. 500MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/mov,video/avi,video/quicktime"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Options Row 1: Format & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Formato do clipe</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 (Reels/TikTok)</SelectItem>
                      <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                      <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração máxima do clipe</Label>
                  <Select value={maxDuration} onValueChange={setMaxDuration}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Options Row 2: Time Intervals */}
              <div>
                <Label>Intervalo de tempo (opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Analise apenas um trecho específico do vídeo. Formato: mm:ss
                  ou hh:mm:ss
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      placeholder="Início (ex: 02:30)"
                    />
                  </div>
                  <div>
                    <Input
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      placeholder="Fim (ex: 15:00)"
                    />
                  </div>
                </div>
              </div>

              {/* Context Description */}
              <div>
                <Label>Contexto desejado para os clipes (opcional)</Label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Descreva o tipo de conteúdo que procura. Ex: momentos de ensinamento, perguntas e respostas, quando a pessoa fala com entusiasmo, insights práticos, momentos engraçados..."
                  className="mt-1 min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A IA usará essas instruções para filtrar os melhores trechos
                  da transcrição.
                </p>
              </div>

              {/* Info */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p>
                  <strong>💡 Como funciona:</strong> O sistema analisa a
                  transcrição do vídeo e determina automaticamente quantos
                  clipes extrair (até 30), com base na qualidade do conteúdo e
                  nas configurações definidas.
                </p>
              </div>

              {inputMode === "url" && (
                <Button
                  onClick={handleSubmitUrl}
                  disabled={isLoading || !url.trim()}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isLoading ? "Iniciando..." : "Gerar Clipes"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {(isProcessing || isError) && job && (
          <Card className={isError ? "border-destructive/30" : ""}>
            <CardContent className="pt-6 space-y-4">
              {/* Step-by-step progress */}
              <div className="space-y-1">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 py-1.5">
                    {step.status === "done" && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    {step.status === "active" && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    )}
                    {step.status === "error" && (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    {step.status === "pending" && (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        step.status === "done"
                          ? "text-muted-foreground line-through"
                          : step.status === "active"
                            ? "font-medium text-foreground"
                            : step.status === "error"
                              ? "font-medium text-destructive"
                              : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job.progress_message || "Processando..."}</span>
                  <span className="font-bold text-primary">
                    {job.progress}%
                  </span>
                </div>
                <Progress value={job.progress} />
              </div>

              {/* Error details */}
              {isError && job.error_message && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive font-medium">
                      Erro no processamento
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.error_message}
                    </p>
                  </div>
                </div>
              )}

              {isError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="gap-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Tentar novamente
                </Button>
              )}

              {clips.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Clipes prontos até agora:
                  </p>
                  <ClipsGrid clips={clips} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {isDone && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                🎉 {clips.length} clipe{clips.length !== 1 ? "s" : ""} gerado
                {clips.length !== 1 ? "s" : ""}!
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                Processar outro vídeo
              </Button>
            </div>
            <ClipsGrid clips={clips} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ClipsGrid({ clips }: { clips: Clip[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clips.map((clip) => {
        const typeInfo = CLIP_TYPE_LABELS[clip.clip_type?.toLowerCase()] ?? {
          label: clip.clip_type || "Clip",
          icon: "📎",
        };
        return (
          <Card key={clip.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="text-xs">
                  {typeInfo.icon} {typeInfo.label}
                </Badge>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">
                    {clip.virality_score}/100
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-sm leading-snug">
                {clip.title}
              </h3>
              <p className="text-xs text-muted-foreground">{clip.reason}</p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(clip.duration_seconds)}</span>
              </div>

              {clip.public_url && (
                <a
                  href={clip.public_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="w-full gap-2">
                    <Download className="h-3 w-3" />
                    Baixar Clipe
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
