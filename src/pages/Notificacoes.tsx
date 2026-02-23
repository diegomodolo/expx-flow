import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useUserNotifications, UserNotification } from "@/hooks/useUserNotifications";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import {
  Bell, CheckCheck, MessageSquare, AlertTriangle, Sparkles,
  ClipboardList, Megaphone, User, Zap, Search, Filter, X, CircleCheck
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ─── Type maps ────────────────────────────────────────────────────────────────

const typeIconMap: Record<string, React.ElementType> = {
  lead_disqualified: AlertTriangle,
  ad_pending_approval: Megaphone,
  task_review: ClipboardList,
  task_assigned: User,
  message_mention: MessageSquare,
  message_channel: MessageSquare,
  creative_pending: Sparkles,
  client_alert: AlertTriangle,
  campaign_alert: Zap,
  system: Bell,
  chat: MessageSquare,
};

const typeColorMap: Record<string, string> = {
  lead_disqualified: "text-destructive bg-destructive/10",
  ad_pending_approval: "text-warning bg-warning/10",
  task_review: "text-primary bg-primary/10",
  task_assigned: "text-primary bg-primary/10",
  message_mention: "text-primary bg-primary/10",
  message_channel: "text-muted-foreground bg-muted",
  creative_pending: "text-warning bg-warning/10",
  client_alert: "text-destructive bg-destructive/10",
  campaign_alert: "text-warning bg-warning/10",
  system: "text-muted-foreground bg-muted",
  chat: "text-primary bg-primary/10",
};

const typeLabelMap: Record<string, string> = {
  lead_disqualified: "Lead",
  ad_pending_approval: "Anúncio",
  task_review: "Tarefa",
  task_assigned: "Tarefa",
  message_mention: "Mensagem",
  message_channel: "Canal",
  creative_pending: "Criativo",
  client_alert: "Cliente",
  campaign_alert: "Campanha",
  system: "Sistema",
  chat: "Chat",
};

const TASK_TYPES = new Set(["task_review", "task_assigned"]);

// ─── Merged notification item ─────────────────────────────────────────────────

type NotifItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  action_url?: string | null;
  source_id?: string | null;
  _source: "user" | "chat";
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Notificacoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notifications, chatNotifications, totalUnreadCount, unreadCount, markAsRead, markAllAsRead } = useUserNotifications();
  const { updateTask } = useTasks();

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all"); // all | unread | read
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Chat mark read mutation ────────────────────────────────────────────────
  const markChatRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("internal_notifications" as any).update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] }),
  });

  const markAllChatRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase.from("internal_notifications" as any).update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internal-notifications-unified", user?.id] }),
  });

  // ── Merged & sorted list ───────────────────────────────────────────────────
  const allItems = useMemo<NotifItem[]>(() => {
    const u = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      created_at: n.created_at,
      action_url: n.action_url,
      source_id: n.source_id,
      _source: "user" as const,
    }));
    const c = chatNotifications.map((n: any) => ({
      id: n.id,
      type: "chat",
      title: n.title,
      body: n.body,
      is_read: n.is_read,
      created_at: n.created_at,
      action_url: null,
      source_id: n.task_id || n.channel_id || null,
      _source: "chat" as const,
    }));
    return [...u, ...c].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications, chatNotifications]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allItems.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (readFilter === "unread" && n.is_read) return false;
      if (readFilter === "read" && !n.is_read) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !(n.body || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allItems, typeFilter, readFilter, search]);

  // ── Unique types for filter dropdown ──────────────────────────────────────
  const availableTypes = useMemo(() => {
    const types = new Set(allItems.map((n) => n.type));
    return Array.from(types);
  }, [allItems]);

  // ── Mark read helper ───────────────────────────────────────────────────────
  const markRead = (item: NotifItem) => {
    if (!item.is_read) {
      if (item._source === "user") markAsRead.mutate(item.id);
      else markChatRead.mutate(item.id);
    }
  };

  // ── Handle click: open task dialog or navigate ─────────────────────────────
  const handleClick = async (item: NotifItem) => {
    markRead(item);

    if (TASK_TYPES.has(item.type) && item.source_id) {
      // Fetch task data then open dialog
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", item.source_id)
        .single();
      if (data) {
        setSelectedTaskData(data);
        setTaskDialogOpen(true);
        return;
      }
    }

    // For chat notifications with task_id
    if (item._source === "chat" && item.source_id) {
      const { data } = await supabase.from("tasks").select("*").eq("id", item.source_id).single();
      if (data) {
        setSelectedTaskData(data);
        setTaskDialogOpen(true);
        return;
      }
    }

    // Navigate to action_url or fallback routes
    if (item.action_url) {
      navigate(item.action_url);
      return;
    }

    const fallbackRoutes: Record<string, string> = {
      lead_disqualified: "/clientes",
      ad_pending_approval: "/geradores/fabrica-anuncios/revisao-diaria",
      creative_pending: "/geradores/fabrica-criativos/revisao-diaria",
      client_alert: "/clientes",
      campaign_alert: "/campanhas",
    };
    if (fallbackRoutes[item.type]) navigate(fallbackRoutes[item.type]);
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((n) => n.id)));
  };

  const markSelectedRead = () => {
    filtered.filter((n) => selected.has(n.id) && !n.is_read).forEach((n) => markRead(n));
    setSelected(new Set());
  };

  const handleMarkAll = () => {
    if (unreadCount > 0) markAllAsRead.mutate();
    if (chatNotifications.length > 0) markAllChatRead.mutate();
  };

  const unreadCount_filtered = filtered.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      {/* Full-height flex column */}
      <div className="flex flex-col h-full -m-8 min-h-0">

        {/* ─ Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Notificações</h1>
            {totalUnreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive text-xs">
                {totalUnreadCount} não lida{totalUnreadCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={markSelectedRead}>
                <CircleCheck className="w-3.5 h-3.5" />
                Marcar {selected.size} como lida{selected.size !== 1 ? "s" : ""}
              </Button>
            )}
            {totalUnreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleMarkAll}>
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        {/* ─ Filter bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-8 py-3 border-b border-border bg-card shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notificação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>{typeLabelMap[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || typeFilter !== "all" || readFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground gap-1"
              onClick={() => { setSearch(""); setTypeFilter("all"); setReadFilter("all"); }}
            >
              <X className="w-3 h-3" /> Limpar filtros
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} notificaç{filtered.length !== 1 ? "ões" : "ão"}
            {unreadCount_filtered > 0 && ` · ${unreadCount_filtered} não lida${unreadCount_filtered !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* ─ Table ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Bell className="w-12 h-12 opacity-20" />
              <p className="text-sm">Nenhuma notificação encontrada</p>
              {(search || typeFilter !== "all" || readFilter !== "all") && (
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setReadFilter("all"); }}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-8">
                    <Checkbox
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead>Notificação</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-28 text-right pr-8">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const Icon = typeIconMap[item.type] || Bell;
                  const colorClass = typeColorMap[item.type] || "text-muted-foreground bg-muted";
                  const label = typeLabelMap[item.type] || "Sistema";
                  return (
                    <TableRow
                      key={`${item._source}-${item.id}`}
                      className={cn(
                        "cursor-pointer group",
                        !item.is_read && "bg-primary/[0.03]"
                      )}
                      onClick={() => handleClick(item)}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-8 w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>

                      {/* Unread dot */}
                      <TableCell className="w-8">
                        {!item.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary mx-auto" />
                        )}
                      </TableCell>

                      {/* Content */}
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className={cn("shrink-0 p-1.5 rounded-md mt-0.5", colorClass)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              "text-sm leading-snug truncate",
                              !item.is_read ? "font-semibold text-foreground" : "text-foreground/80"
                            )}>
                              {item.title}
                            </p>
                            {item.body && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.body}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                          {label}
                        </Badge>
                      </TableCell>

                      {/* Time */}
                      <TableCell className="text-xs text-muted-foreground text-right pr-8 whitespace-nowrap">
                        {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ─ Task Dialog ───────────────────────────────────────────────────────── */}
      {taskDialogOpen && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={(open) => {
            setTaskDialogOpen(open);
            if (!open) setSelectedTaskData(null);
          }}
          task={selectedTaskData}
          onSave={async (data) => {
            if (selectedTaskData?.id) {
              await updateTask(selectedTaskData.id, data);
            }
            setTaskDialogOpen(false);
            setSelectedTaskData(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
