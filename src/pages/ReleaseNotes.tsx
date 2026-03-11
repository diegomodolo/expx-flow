import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useReleaseNotes, ReleaseNote } from "@/hooks/useReleaseNotes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, Megaphone, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  feature: {
    label: "Nova Feature",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  fix: {
    label: "Correção",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  improvement: {
    label: "Melhoria",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  other: {
    label: "Outros",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
};

function groupByMonth(notes: ReleaseNote[]): Record<string, ReleaseNote[]> {
  const groups: Record<string, ReleaseNote[]> = {};
  for (const note of notes) {
    const key = format(new Date(note.published_at), "MMMM yyyy", { locale: ptBR });
    if (!groups[key]) groups[key] = [];
    groups[key].push(note);
  }
  return groups;
}

function NoteCard({ note }: { note: ReleaseNote }) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.other;
  const hasLongDescription = note.description && note.description.length > 200;

  return (
    <div className="bg-white dark:bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="secondary" className={config.className}>
              {config.label}
            </Badge>
            {note.source_type === "pr" && (
              <span className="text-xs text-muted-foreground">PR</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-foreground leading-snug">
            {note.title}
          </h3>
          {note.description && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {hasLongDescription && !expanded
                  ? note.description.substring(0, 200) + "..."
                  : note.description}
              </p>
              {hasLongDescription && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {expanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {note.author_name && <span>{note.author_name}</span>}
            <span>
              {formatDistanceToNow(new Date(note.published_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
        {note.source_url && (
          <a
            href={note.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Ver no GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ReleaseNotes() {
  const { notes, loading, hasMore, loadMore, sync, syncing } =
    useReleaseNotes();

  const grouped = groupByMonth(notes);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
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
            <div className="space-y-8">
              {Object.entries(grouped).map(([month, monthNotes]) => (
                <section key={month}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                    {month}
                  </h2>
                  <div className="space-y-3">
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
