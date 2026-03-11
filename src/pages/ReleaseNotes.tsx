import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useReleaseNotes, ReleaseNote } from "@/hooks/useReleaseNotes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  Megaphone,
  Loader2,
  Sparkles,
  Bug,
  Wrench,
  Package,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType; color: string }
> = {
  feature: {
    label: "Nova Feature",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  fix: {
    label: "Correção",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: Bug,
    color: "text-red-600 dark:text-red-400",
  },
  improvement: {
    label: "Melhoria",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400",
  },
  other: {
    label: "Outros",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    icon: Package,
    color: "text-slate-600 dark:text-slate-400",
  },
};

function groupByMonth(notes: ReleaseNote[]): Record<string, ReleaseNote[]> {
  const groups: Record<string, ReleaseNote[]> = {};
  for (const note of notes) {
    const key = format(new Date(note.published_at), "MMMM yyyy", {
      locale: ptBR,
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(note);
  }
  return groups;
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function KpiCard({ icon: Icon, label, value, color, bgColor }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-2.5 ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NoteCard({ note }: { note: ReleaseNote }) {
  const config = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.other;

  return (
    <div className="bg-white dark:bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="secondary" className={config.className}>
              {config.label}
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-foreground leading-snug">
            {note.friendly_title || note.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(note.published_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReleaseNotes() {
  const { notes, loading, hasMore, loadMore, sync, syncing } =
    useReleaseNotes();

  const stats = useMemo(() => {
    const features = notes.filter((n) => n.category === "feature").length;
    const fixes = notes.filter((n) => n.category === "fix").length;
    const improvements = notes.filter(
      (n) => n.category === "improvement",
    ).length;
    const others = notes.filter((n) => n.category === "other").length;
    return { total: notes.length, features, fixes, improvements, others };
  }, [notes]);

  const grouped = groupByMonth(notes);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="w-full px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Novidades do Sistema
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync()}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard
              icon={Package}
              label="Total de Atualizações"
              value={stats.total}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <KpiCard
              icon={Sparkles}
              label="Novas Features"
              value={stats.features}
              color="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <KpiCard
              icon={Bug}
              label="Correções"
              value={stats.fixes}
              color="text-red-600 dark:text-red-400"
              bgColor="bg-red-100 dark:bg-red-900/30"
            />
            <KpiCard
              icon={Wrench}
              label="Melhorias"
              value={stats.improvements}
              color="text-blue-600 dark:text-blue-400"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
            />
            <KpiCard
              icon={Package}
              label="Outros"
              value={stats.others}
              color="text-slate-600 dark:text-slate-400"
              bgColor="bg-slate-100 dark:bg-slate-800"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-20">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                Nenhuma novidade ainda
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Clique em "Atualizar" para sincronizar as novidades do GitHub.
              </p>
              <Button onClick={() => sync()} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Agora
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([month, monthNotes]) => (
                <section key={month}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider capitalize mb-3">
                    {month}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {monthNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </section>
              ))}

              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={loadMore}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
