import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Zap, User, Hash, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTeams } from "@/hooks/useTeams";
import { useTaskCategorias } from "@/hooks/useTaskCategorias";
import { cn } from "@/lib/utils";

interface Props {
  clients: unknown[];
  companyId: string | undefined;
}

type TokenType = "@" | "#" | "/" | "!" | null;

const TIME_SUGGESTIONS = [
  { label: "20 min", value: 20 },
  { label: "40 min (2 blocos)", value: 40 },
  { label: "60 min (3 blocos)", value: 60 },
  { label: "72 min (4 blocos)", value: 72 },
  { label: "90 min (5 blocos)", value: 90 },
];

const PRIORITY_SUGGESTIONS = [
  { id: "high", label: "Alta (Urgente)", value: "high" },
  { id: "medium", label: "Média", value: "medium" },
  { id: "low", label: "Baixa", value: "low" },
];

function getActiveToken(text: string, cursorPos: number): { type: TokenType; search: string; start: number } {
  const before = text.slice(0, cursorPos);

  const lastAt = before.lastIndexOf("@");
  const lastHash = before.lastIndexOf("#");
  const lastSlash = before.lastIndexOf("/");
  const lastBang = before.lastIndexOf("!");

  const candidates = [
    { type: "@" as TokenType, pos: lastAt },
    { type: "#" as TokenType, pos: lastHash },
    { type: "/" as TokenType, pos: lastSlash },
    { type: "!" as TokenType, pos: lastBang },
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

function parseQuickEntry(input: string, clients: unknown[]) {
  const clientMatch = input.match(/@([\w\sÀ-ú]+?)(?=\s[#/!]|$)/i);
  const categoryMatch = input.match(/#([\w\sÀ-ú]+?)(?=\s[@/!]|$)/i);
  const minutesMatch = input.match(/\/(\d+)\s*min/i);
  const priorityMatch = input.match(/!(alta|media|média|baixa|high|medium|low)/i);

  let clientId: string | null = null;
  if (clientMatch) {
    const search = clientMatch[1].toLowerCase().trim();
    const found = clients.find((c: unknown) => c.name.toLowerCase().includes(search));
    if (found) clientId = found.id;
  }

  let priority = "medium";
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === "alta" || p === "high") priority = "high";
    else if (p === "baixa" || p === "low") priority = "low";
  }

  const title = input
    .replace(/@[\w\sÀ-ú]+/i, "")
    .replace(/#[\w\sÀ-ú]+/i, "")
    .replace(/\/\d+\s*min/i, "")
    .replace(/!(alta|media|média|baixa|high|medium|low)/i, "")
    .trim();

  return {
    title: title || input,
    clientId,
    category: categoryMatch?.[1]?.trim() || null,
    minutes: minutesMatch ? parseInt(minutesMatch[1]) : 20,
    priority,
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

  // Sync cursor position after every render when value changes
  useEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      setCursorPos(el.selectionStart ?? value.length);
    }
  }, [value]);

  const activeToken = useMemo(() => getActiveToken(value, cursorPos), [value, cursorPos]);

  const suggestions = useMemo(() => {
    if (!activeToken.type) return [];
    const q = activeToken.search.toLowerCase().trim();

    if (activeToken.type === "@") {
      return clients
        .filter((c: unknown) => c.name.toLowerCase().includes(q))
        .map((c: unknown) => ({ id: c.id, label: c.name, icon: "user" as const }));
    }

    if (activeToken.type === "#") {
      return categorias
        .filter((cat) => cat.nome.toLowerCase().includes(q))
        .map((cat) => ({ id: cat.id, label: cat.nome, icon: "hash" as const }));
    }

    if (activeToken.type === "/") {
      return TIME_SUGGESTIONS
        .filter((t) => t.label.toLowerCase().includes(q) || String(t.value).includes(q))
        .map((t) => ({ id: String(t.value), label: t.label, icon: "clock" as const }));
    }

    if (activeToken.type === "!") {
      return PRIORITY_SUGGESTIONS
        .filter((p) => p.label.toLowerCase().includes(q) || p.value.includes(q))
        .map((p) => ({ id: p.id, label: p.label, icon: "priority" as const }));
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
      } else if (activeToken.type === "!") {
        // Map label back to keyword
        const keyMap: Record<string, string> = { high: "alta", medium: "media", low: "baixa" };
        replacement = `!${keyMap[suggestion.id] || suggestion.id} `;
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

      const insertPayload = {
        title: parsed.title,
        description: "",
        status: "todo" as unknown,
        priority: parsed.priority as unknown,
        task_type: "Tarefa",
        task_state: "backlog" as unknown,
        ai_estimated_minutes: parsed.minutes,
        responsible_name: user.user_metadata?.full_name || "Admin",
        user_id: user.id,
        team_id: defaultTeam?.id || null,
        company_id: companyId,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        progress: 0,
        related_client_id: parsed.clientId || null,
      };
      console.log("Insert payload:", JSON.stringify(insertPayload));

      const { data: task, error } = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      if (parsed.clientId && task) {
        await supabase.from("task_clients" as unknown).insert({
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
    } catch (err: unknown) {
      console.error("Quick entry error:", err?.message || err?.code || err);
      toast({ title: "Erro", description: `Falha ao criar tarefa: ${err?.message || 'erro desconhecido'}`, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToItem = useCallback((index: number) => {
    const container = dropdownRef.current?.querySelector('[data-suggestions]');
    if (!container) return;
    const items = container.querySelectorAll('button');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = (prev + 1) % suggestions.length;
          scrollToItem(next);
          return next;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = (prev - 1 + suggestions.length) % suggestions.length;
          scrollToItem(next);
          return next;
        });
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

    if (e.key === "Enter" && !e.shiftKey && !isOpen && !submitting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const iconForType = (icon: string) => {
    if (icon === "user") return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    if (icon === "hash") return <Hash className="w-3.5 h-3.5 text-muted-foreground" />;
    if (icon === "priority") return <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="relative">
      {/* Dropdown de sugestões - agora abre para cima */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 bottom-full mb-2 z-50 bg-popover border rounded-xl shadow-lg p-1 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <div className="text-[10px] text-muted-foreground px-3 py-1.5 font-medium">
            {activeToken.type === "@" && "Selecionar cliente"}
            {activeToken.type === "#" && "Selecionar categoria"}
            {activeToken.type === "/" && "Tempo estimado"}
            {activeToken.type === "!" && "Prioridade"}
          </div>
          <div data-suggestions className="max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
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

      <div className="relative flex items-start bg-muted/50 border rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
        <Zap className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0 mt-1.5" />
        <textarea
          ref={inputRef as unknown}
          value={value}
          onChange={(e) => {
            const newVal = e.target.value;
            const pos = e.target.selectionStart ?? newVal.length;
            setValue(newVal);
            requestAnimationFrame(() => {
              const el = inputRef.current as unknown;
              if (el) setCursorPos(el.selectionStart ?? pos);
            });
          }}
          onKeyUp={(e) => {
            const el = e.target as HTMLTextAreaElement;
            setCursorPos(el.selectionStart ?? 0);
          }}
          onClick={(e) => {
            setCursorPos((e.target as HTMLTextAreaElement).selectionStart ?? 0);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nova tarefa... use @cliente #categoria /20min !alta"
          className="flex-1 border-0 bg-transparent shadow-none focus:outline-none focus-visible:ring-0 text-sm px-0 placeholder:text-muted-foreground/60 resize-none"
          rows={3}
          disabled={submitting}
          autoComplete="off"
        />
        <div className="flex items-center gap-2 ml-2 flex-shrink-0 mt-1.5">
          <kbd className="hidden sm:inline-flex text-[10px] text-muted-foreground bg-background border rounded px-1.5 py-0.5">Enter</kbd>
        </div>
      </div>
    </div>
  );
}
