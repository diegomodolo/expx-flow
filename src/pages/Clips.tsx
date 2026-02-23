import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useClipGenerator, Clip } from "@/hooks/useClipGenerator";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

const CLIP_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  insight: { label: "Insight", icon: "💡" },
  story: { label: "História", icon: "📖" },
  humor: { label: "Humor", icon: "😂" },
  controversy: { label: "Polêmica", icon: "🔥" },
  value: { label: "Valor", icon: "✅" },
};

export default function ClipsPage() {
  const { activeCompany } = useCompany();
  const [url, setUrl] = useState("");
  const [maxClips, setMaxClips] = useState("3");
  const [format, setFormat] = useState("9:16");
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    job,
    clips,
    isLoading,
    processUrl,
    uploadAndProcess,
    reset,
    isDone,
    isError,
    isProcessing,
  } = useClipGenerator();

  const handleSubmitUrl = async () => {
    if (!url.trim()) return;
    await processUrl(url, {
      maxClips: Number(maxClips),
      format,
      companyId: activeCompany?.company_id || undefined,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndProcess(file, {
      maxClips: Number(maxClips),
      format,
      companyId: activeCompany?.company_id || undefined,
    });
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
            <CardContent className="space-y-4">
              <Tabs
                value={inputMode}
                onValueChange={(v) => setInputMode(v as "url" | "upload")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    URL do YouTube
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload de Arquivo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label>URL do YouTube</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-1"
                    />
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

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número de clipes</Label>
                  <Select value={maxClips} onValueChange={setMaxClips}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 clipe</SelectItem>
                      <SelectItem value="2">2 clipes</SelectItem>
                      <SelectItem value="3">3 clipes</SelectItem>
                      <SelectItem value="5">5 clipes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato</Label>
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
        {isProcessing && job && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="animate-spin">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">
                    {job.progress_message || "Processando..."}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {job.progress}%
                </span>
              </div>
              <Progress value={job.progress} />

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

        {/* Error */}
        {isError && job && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">
                    Erro no processamento
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.error_message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="mt-3 gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {isDone && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                🎉 {clips.length} clipe{clips.length !== 1 ? "s" : ""}{" "}
                gerado{clips.length !== 1 ? "s" : ""}!
              </h2>
              <Button variant="outline" size="sm" onClick={reset} className="gap-2">
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
        const typeInfo = CLIP_TYPE_LABELS[clip.clip_type] ?? {
          label: clip.clip_type,
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
                <span>{Math.round(clip.duration_seconds)}s</span>
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
