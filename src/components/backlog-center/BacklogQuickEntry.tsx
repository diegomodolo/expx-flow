import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Zap, User, Hash, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTeams } from "@/hooks/useTeams";
import { useTaskCategorias } from "@/hooks/useTaskCategorias";
import { cn } from "@/lib/utils";

interface Props {
  clients: any[];
  companyId: string | undefined;
}

type TokenType = "@" | "#" | "/" | null;

const TIME_SUGGESTIONS = [
  { label: "18 min", value: 18 },
  { label: "36 min (2 blocos)", value: 36 },
  { label: "54 min (3 blocos)", value: 54 },
  { label: "72 min (4 blocos)", value: 72 },
  { label: "90 min (5 blocos)", value: 90 },
];

function getActiveToken(text: string, cursorPos: number): { type: TokenType; search: string; start: number } {
  const before = text.slice(0, cursorPos);

  let lastAt = before.lastIndexOf("@");
  let lastHash = before.lastIndexOf("#");
  let lastSlash = before.lastIndexOf("/");

  const candidates = [
    { type: "@" as TokenType, pos: lastAt },
    { type: "#" as TokenType, pos: lastHash },
    { type: "/" as TokenType, pos: lastSlash },
  ].filter(c => c.pos >= 0);

  if (candidates.length === 0) return { type: null, search: "", start: 0 };

  const winner = candidates.reduce((a, b) => (a.pos > b.pos ? a : b));
  const searchText = before.slice(winner.pos + 1);

  // If the token is already "closed" (e.g. /18min followed by space)
  if (winner.type === "/" && searchText.match(/^\d+\s*min\s/i)) {
    return { type: null, search: "", start: 0 };
  }

  return { type: winner.type, search: searchText, start: winner.pos };
}

function parseQuickEntry(input: string, clients: any[]) {
  const clientMatch = input.match(/@([\w\sÀ-ú]+?)(?=\s[#/]|$)/i);
  const categoryMatch = input.match(/#([\w\sÀ-ú]+?)(?=\s[@/]|$)/i);
  const minutesMatch = input.match(/\/(\d+)\s*min/i);

  let clientId: string | null = null;
  if (clientMatch) {
    const search = clientMatch[1].toLowerCase().trim();
    const found = clients.find((c: any) => c.name.toLowerCase().includes(search));
    if (found) clientId = found.id;
  }

  let title = input
    .replace(/@[\w\sÀ-ú]+/i, "")
    .replace(/#[\w\sÀ-ú]+/i, "")
    .replace(/\/\d+\s*min/i, "")
    .trim();

  return {
    title: title || input,
    clientId,
    category: categoryMatch?.[1]?.trim() || null,
    minutes: minutesMatch ? parseInt(minutesMatch[1]) : 18,
  };
}

export function BacklogQuickEntry({ clients, companyId }: Props) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { teams } = useTeams();
  const { categorias } = useTaskCategorias();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const activeToken = useMemo(() => getActiveToken(value, cursorPos), [value, cursorPos]);

  const suggestions = useMemo(() => {
    if (!activeToken.type) return [];
    const q = activeToken.search.toLowerCase().trim();

    if (activeToken.type === "@") {
      return clients
        .filter((c: any) => c.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map((c: any) => ({ id: c.id, label: c.name, icon: "user" as const }));
    }

    if (activeToken.type === "#") {
      return categorias
        .filter((cat) => cat.nome.toLowerCase().includes(q))
        .slice(0, 8)
        .map((cat) => ({ id: cat.id, label: cat.nome, icon: "hash" as const }));
    }

    if (activeToken.type === "/") {
      return TIME_SUGGESTIONS
        .filter((t) => t.label.toLowerCase().includes(q) || String(t.value).includes(q))
        .map((t) => ({ id: String(t.value), label: t.label, icon: "clock" as const }));
    }

    return [];
  }, [activeToken, clients, categorias]);

  const isOpen = isFocused && suggestions.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length, activeToken.type, activeToken.search]);

  const applySuggestion = useCallback(
    (suggestion: { id: string; label: string; icon: string }) => {
      const before = value.slice(0, activeToken.start);
      const after = value.slice(cursorPos);

      let replacement = "";
      if (activeToken.type === "@") {
        replacement = `@${suggestion.label} `;
      } else if (activeToken.type === "#") {
        replacement = `#${suggestion.label} `;
      } else if (activeToken.type === "/") {
        replacement = `/${suggestion.id}min `;
      }

      const newValue = before + replacement + after;
      setValue(newValue);

      const newCursorPos = before.length + replacement.length;
      setCursorPos(newCursorPos);
      setTimeout(() => {
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current?.focus();
      }, 0);
    },
    [value, cursorPos, activeToken]
  );

  const handleSubmit = async () => {
    if (!value.trim() || !user || !companyId) return;
    setSubmitting(true);

    try {
      const parsed = parseQuickEntry(value, clients);
      const defaultTeam = teams[0];

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: parsed.title,
          description: "",
          status: "todo" as any,
          priority: "medium" as any,
          task_type: parsed.category || "geral",
          ai_estimated_minutes: parsed.minutes,
          responsible_name: user.user_metadata?.full_name || "Admin",
          user_id: user.id,
          team_id: defaultTeam?.id || "",
          company_id: companyId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          progress: 0,
          related_client_id: parsed.clientId,
        })
        .select()
        .single();

      if (error) throw error;

      if (parsed.clientId && task) {
        await supabase.from("task_clients" as any).insert({
          task_id: task.id,
          client_id: parsed.clientId,
          company_id: companyId,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-center-task-clients"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setValue("");
      toast({ title: "Tarefa criada", description: `"${parsed.title}" adicionada ao backlog.` });
    } catch (err) {
      console.error("Quick entry error:", err);
      toast({ title: "Erro", description: "Falha ao criar tarefa.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && suggestions.length > 0)) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsFocused(false);
        return;
      }
    }

    if (e.key === "Enter" && !isOpen && !submitting) {
      handleSubmit();
    }
  };

  const iconForType = (icon: string) => {
    if (icon === "user") return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    if (icon === "hash") return <Hash className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="p-4 border-b">
      <div className="relative">
        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCursorPos(e.target.selectionStart ?? e.target.value.length);
          }}
          onClick={(e) => {
            setCursorPos((e.target as HTMLInputElement).selectionStart ?? 0);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay to allow clicking on suggestions
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Post Black Friday @Cliente #Design /18min — Enter para criar"
          className="pl-9 pr-20 h-10 text-sm"
          disabled={submitting}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Enter</span>
        </div>

        {/* Dropdown de sugestões */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
          >
            <div className="text-[10px] text-muted-foreground px-2 py-1 font-medium">
              {activeToken.type === "@" && "Selecionar cliente"}
              {activeToken.type === "#" && "Selecionar categoria"}
              {activeToken.type === "/" && "Tempo estimado"}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors",
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {iconForType(s.icon)}
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
        Use <span className="font-medium">@cliente</span> para vincular, <span className="font-medium">#categoria</span> para tipo, <span className="font-medium">/18min</span> para tempo — autocomplete com ↑↓ e Tab
      </p>
    </div>
  );
}
