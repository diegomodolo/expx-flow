import React, { useState, useMemo } from "react";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Clock, AlertTriangle, GripVertical, Filter, X, Search, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  tasks: CommandCenterTask[];
  getAgingHours: (createdAt: string) => number;
  teamColor?: string;
  onClickTask?: (task: CommandCenterTask) => void;
}

const priorityColors: Record<string, string> = {
  urgent: "border-destructive",
  high: "border-orange-500",
  medium: "border-yellow-500",
  low: "border-emerald-500",
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const typeLabels: Record<string, string> = {
  Tarefa: "Tarefa",
  Criativo: "Criativo",
  História: "História",
  Negócio: "Negócio",
  Reunião: "Reunião",
  Ticket: "Ticket",
};

const typeColors: Record<string, string> = {
  copy: "border-l-primary",
  design: "border-l-purple-400",
  social_media: "border-l-emerald-400",
  default: "border-l-border",
};

// Grouped structure: standalone tasks + story groups
interface StoryGroup {
  type: "story";
  parent: CommandCenterTask;
  children: CommandCenterTask[];
}
interface StandaloneItem {
  type: "standalone";
  task: CommandCenterTask;
}
type GroupedItem = StoryGroup | StandaloneItem;

export function BacklogColumn({ tasks, getAgingHours, teamColor, onClickTask }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterResponsible, setFilterResponsible] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedStories, setCollapsedStories] = useState<Set<string>>(new Set());

  // Extract unique values for filter options
  const uniqueClients = useMemo(() => {
    const clients: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    tasks.forEach(t => {
      t.clients?.forEach(c => {
        if (!seen.has(c.client_id)) {
          seen.add(c.client_id);
          clients.push({ id: c.client_id, name: c.client_name });
        }
      });
    });
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const uniqueResponsibles = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(t => { if (t.responsible_name) names.add(t.responsible_name); });
    return Array.from(names).sort();
  }, [tasks]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    tasks.forEach(t => { if (t.task_type) types.add(t.task_type); });
    return Array.from(types).sort();
  }, [tasks]);

  const uniquePriorities = useMemo(() => {
    const prios = new Set<string>();
    tasks.forEach(t => { if (t.priority) prios.add(t.priority); });
    return Array.from(prios);
  }, [tasks]);

  const activeFilterCount = [filterType, filterPriority, filterClient, filterResponsible].filter(f => f !== "all").length;
  const hasSearch = searchQuery.trim().length > 0;

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter(t => {
      if (filterType !== "all" && t.task_type !== filterType) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterClient !== "all" && !t.clients?.some(c => c.client_id === filterClient)) return false;
      if (filterResponsible !== "all" && t.responsible_name !== filterResponsible) return false;
      if (query) {
        const matchTitle = t.title?.toLowerCase().includes(query);
        const matchClient = t.clients?.some(c => c.client_name?.toLowerCase().includes(query));
        if (!matchTitle && !matchClient) return false;
      }
      return true;
    });
  }, [tasks, filterType, filterPriority, filterClient, filterResponsible, searchQuery]);

  // Group filtered tasks: stories with children grouped, standalone tasks separate
  const groupedItems = useMemo((): GroupedItem[] => {
    const taskMap = new Map(filteredTasks.map(t => [t.id, t]));
    const childrenByParent = new Map<string, CommandCenterTask[]>();
    const standalones: CommandCenterTask[] = [];
    const parentIds = new Set<string>();

    // First pass: identify children and their parents
    for (const t of filteredTasks) {
      if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
        // This task's parent is also in the list — group it
        const children = childrenByParent.get(t.parent_task_id) || [];
        children.push(t);
        childrenByParent.set(t.parent_task_id, children);
        parentIds.add(t.parent_task_id);
      } else if (t.parent_task_id && !taskMap.has(t.parent_task_id)) {
        // Parent exists but isn't in the filtered list — show as standalone
        standalones.push(t);
      }
    }

    const items: GroupedItem[] = [];
    const handledIds = new Set<string>();

    // Build ordered list preserving original order
    for (const t of filteredTasks) {
      if (handledIds.has(t.id)) continue;

      if (parentIds.has(t.id)) {
        // This is a parent (História) with children
        const children = childrenByParent.get(t.id) || [];
        items.push({ type: "story", parent: t, children });
        handledIds.add(t.id);
        children.forEach(c => handledIds.add(c.id));
      } else if (!t.parent_task_id || !taskMap.has(t.parent_task_id)) {
        // Standalone task (no parent or parent not in list)
        items.push({ type: "standalone", task: t });
        handledIds.add(t.id);
      }
    }

    return items;
  }, [filteredTasks]);

  const clearFilters = () => {
    setFilterType("all");
    setFilterPriority("all");
    setFilterClient("all");
    setFilterResponsible("all");
    setSearchQuery("");
  };

  const toggleStoryCollapse = (storyId: string) => {
    setCollapsedStories(prev => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  // Flat index for draggable — we need a continuous index
  let draggableIndex = 0;

  return (
    <div className="flex flex-col h-full" data-backlog-column="true">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Backlog
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant={filtersOpen || activeFilterCount > 0 ? "default" : "ghost"}
            size="icon"
            className="h-6 w-6 relative"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="w-3 h-3" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredTasks.length}{(activeFilterCount > 0 || hasSearch) ? `/${tasks.length}` : ''}
          </span>
        </div>
      </div>

      {/* Fixed search input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa ou cliente..."
            className="w-full h-7 pl-7 pr-7 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {hasSearch && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {uniqueTypes.map(t => (
                    <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  {uniquePriorities.map(p => (
                    <SelectItem key={p} value={p}>{priorityLabels[p] || p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos clientes</SelectItem>
                  {uniqueClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos responsáveis</SelectItem>
                  {uniqueResponsibles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full text-muted-foreground" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Droppable droppableId="backlog">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto space-y-1.5 px-3 pb-3 min-h-[200px]"
          >
            {groupedItems.map((item) => {
              if (item.type === "standalone") {
                const idx = draggableIndex++;
                return (
                  <TaskCard
                    key={item.task.id}
                    task={item.task}
                    index={idx}
                    getAgingHours={getAgingHours}
                    onClickTask={onClickTask}
                  />
                );
              }

              // Story group
              const isCollapsed = collapsedStories.has(item.parent.id);
              const parentIdx = draggableIndex++;
              const childIndices: number[] = [];
              if (!isCollapsed) {
                item.children.forEach(() => { childIndices.push(draggableIndex++); });
              }

              return (
                <div key={item.parent.id} className="space-y-0.5">
                  {/* Story header */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStoryCollapse(item.parent.id)}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    <BookOpen className="w-3 h-3 text-primary/70 flex-shrink-0" />
                    <span
                      className="text-[10px] font-semibold text-primary/80 truncate cursor-pointer hover:text-primary"
                      onClick={() => onClickTask?.(item.parent)}
                    >
                      {item.parent.title}
                    </span>
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 flex-shrink-0">
                      {item.children.length}
                    </Badge>
                  </div>

                  {/* Story parent as draggable */}
                  <TaskCard
                    task={item.parent}
                    index={parentIdx}
                    getAgingHours={getAgingHours}
                    onClickTask={onClickTask}
                    isStoryParent
                  />

                  {/* Children */}
                  {!isCollapsed && item.children.map((child, ci) => (
                    <div key={child.id} className="ml-4">
                      <TaskCard
                        task={child}
                        index={childIndices[ci]}
                        getAgingHours={getAgingHours}
                        onClickTask={onClickTask}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
            {provided.placeholder}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
                <Clock className="w-8 h-8 mb-2" />
                <p className="text-xs">{activeFilterCount > 0 ? "Nenhuma tarefa encontrada" : "Backlog vazio"}</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

/* ---- Individual Task Card ---- */
function TaskCard({
  task,
  index,
  getAgingHours,
  onClickTask,
  isStoryParent,
}: {
  task: CommandCenterTask;
  index: number;
  getAgingHours: (createdAt: string) => number;
  onClickTask?: (task: CommandCenterTask) => void;
  isStoryParent?: boolean;
}) {
  const aging = getAgingHours(task.created_at);
  const isAging = aging > 4;
  const borderColor = typeColors[task.task_type] || typeColors.default;

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={cn(
                snapshot.isDragging
                  ? "rounded-lg bg-primary/10 border border-primary/30 text-primary px-2 py-1 cursor-grabbing shadow-lg z-50 flex items-center gap-1"
                  : cn(
                      "rounded-lg bg-card border border-border px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-all duration-200 border-l-2",
                      borderColor,
                      isAging && "ring-1 ring-yellow-500/50 animate-pulse",
                      isStoryParent && "hidden",
                    )
              )}
              onClick={() => onClickTask?.(task)}
              style={{
                ...provided.draggableProps.style,
                ...(snapshot.isDragging ? { width: '180px', height: '32px' } : {}),
              }}
            >
              {snapshot.isDragging ? (
                <>
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{task.title}</span>
                  <span className="text-[10px] ml-auto opacity-60">{task.ai_estimated_minutes || 20}m</span>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p className="text-xs text-foreground font-medium truncate flex-1">{task.title}</p>
                    {task.clients && task.clients.length > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {task.clients.slice(0, 2).map((client) => (
                          <Avatar key={client.client_id} className="w-4 h-4 flex-shrink-0">
                            <AvatarImage src={client.client_avatar || undefined} alt={client.client_name} />
                            <AvatarFallback className="text-[7px] bg-muted">
                              {client.client_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.clients.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{task.clients.length - 2}</span>
                        )}
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground flex-shrink-0">{task.ai_estimated_minutes || 20}m</span>
                  </div>
                  {isAging && (
                    <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
              )}
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" className="w-72">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{task.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Prioridade: {priorityLabels[task.priority] || task.priority}</span>
                <span>Tempo: {task.ai_estimated_minutes || 20}min</span>
              </div>
              <p className="text-xs text-muted-foreground/70">Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </Draggable>
  );
}
