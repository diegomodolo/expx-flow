import React, { useState, useEffect } from 'react';
import { InlineSearchableSelect } from './InlineSearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Plus, Home, CheckSquare, Trash2, Save, ZoomIn, ZoomOut, ShieldCheck, Search, Users, UsersRound, History, ListTree, ArrowUpRight, CircleDot, ChevronDown, Timer, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import { usePlannerSlots } from "@/hooks/usePlannerSlots";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTaskCategorias } from "@/hooks/useTaskCategorias";
import { CreativeTaskPanel, CreativeData } from "./CreativeTaskPanel";
import { TaskClientsTab } from "./TaskClientsTab";
import { TaskTeamTab } from "./TaskTeamTab";
import { TaskHistoryTab } from "./TaskHistoryTab";
import { TaskSubtasksTab } from "./TaskSubtasksTab";
import { useTaskHistory } from "@/hooks/useTaskHistory";
import { TaskTimeTrackingTab } from "./TaskTimeTrackingTab";
import { handleAutoTimeTracking } from "@/utils/autoTimeTracking";
import { ImportChecklistTemplateModal } from "@/components/checklist-templates/ImportChecklistTemplateModal";
import { TaskOutputPanel } from "./TaskOutputPanel";
import { TaskReviewPanel } from "./TaskReviewPanel";
import { cn } from "@/lib/utils";

export type TaskDialogMode = 'kanban' | 'roteiro';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onSave: (taskData: any) => void;
  defaultClientId?: string;
  defaultBoardUserId?: string | null;
  mode?: TaskDialogMode;
  // Roteiro-specific
  loading?: boolean;
  onDelete?: () => void;
}

type SidebarTab = 'principal' | 'clientes' | 'equipe' | 'checklist' | 'subtarefas' | 'historico' | 'timetracking';

const ZOOM_STORAGE_KEY = 'task-dialog-zoom';
const ZOOM_LEVELS = [640, 768, 896, 1024, 1152, 1280, 1408, 1536];
const MIN_SAFE_ZOOM = 768; // minimum width that guarantees controls remain visible

const TASK_TYPES = [
  { value: 'Criativo', label: 'Criativo' },
  { value: 'História', label: 'História' },
  { value: 'Negócio', label: 'Negócio' },
  { value: 'Reunião', label: 'Reunião' },
  { value: 'Tarefa', label: 'Tarefa' },
  { value: 'Ticket', label: 'Ticket' },
];

async function getStoredZoom(userId: string): Promise<number> {
  try {
    const { data } = await (supabase as any)
      .from('user_ui_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', 'task-dialog-zoom')
      .maybeSingle();
    if (data?.setting_value?.zoomWidth) return data.setting_value.zoomWidth;
  } catch {}
  return 1024;
}

async function saveZoom(userId: string, zoom: number) {
  try {
    await (supabase as any)
      .from('user_ui_settings')
      .upsert({
        user_id: userId,
        setting_key: 'task-dialog-zoom',
        setting_value: { zoomWidth: zoom },
      }, { onConflict: 'user_id,setting_key' });
  } catch {}
}

export function TaskDialog({ open, onOpenChange, task, onSave, defaultClientId, defaultBoardUserId, mode = 'kanban', loading, onDelete }: TaskDialogProps) {
  const isRoteiro = mode === 'roteiro';
  const [activeTab, setActiveTab] = useState<SidebarTab>('principal');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [zoomWidth, setZoomWidth] = useState(1024);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [outputWidth, setOutputWidth] = useState(320);
  const isDraggingRef = React.useRef(false);
  const dragStartXRef = React.useRef(0);
  const dragStartWidthRef = React.useRef(320);

  const handleDividerMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = outputWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartXRef.current - ev.clientX;
      const newWidth = Math.max(40, dragStartWidthRef.current + delta);
      setOutputWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [outputWidth]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    team_id: '',
    responsible_name: '',
    responsible_avatar: '',
    responsible_user_id: '',
    responsible_employee_id: '',
    related_client_id: defaultClientId || '',
    related_campaign_id: '',
    start_date: null as Date | null,
    start_time: '',
    due_date: null as Date | null,
    due_time: '',
    hasSpecificTime: false,
    progress: 0,
    checklist: [] as { id: string; text: string; completed: boolean }[],
    // Roteiro-specific
    tipo: 'Tarefa',
    inicio_apos_dias: 0,
    duracao_dias: 1,
    fluxo: '',
    autorizador_id: '',
    categoria_id: '',
    classificacao_id: '',
    // Board fields (both modes)
    quadro_user_id: '',
    quadro_column_id: '',
  });

  const [creativeData, setCreativeData] = useState<CreativeData>({
    post_type: 'feed',
    caption: '',
    files: [],
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [previewSlot, setPreviewSlot] = useState('');
  const [importChecklistOpen, setImportChecklistOpen] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [responsibleDropdownOpen, setResponsibleDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [classificacaoSearch, setClassificacaoSearch] = useState('');
  const [newCategoriaName, setNewCategoriaName] = useState('');
  const [newClassificacaoName, setNewClassificacaoName] = useState('');
  const [categoriaPopoverOpen, setCategoriaPopoverOpen] = useState(false);
  const [classificacaoPopoverOpen, setClassificacaoPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const statusMenuRef = React.useRef<HTMLDivElement | null>(null);
  const { teams } = useTeams();
  const { employees } = useEmployees();
  const { timeSlots } = usePlannerSlots();
  const { clients } = useClients();
  const { campaigns } = useCampaigns();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const { hasPermission, isOwner } = useEmployeePermissions();
  const { categorias, createCategoria, classificacoes, createClassificacao } = useTaskCategorias();

  // Manager check for board access
  const { data: isManager } = useQuery({
    queryKey: ['is-manager', user?.id, companyId],
    queryFn: async () => {
      if (!user || !companyId) return false;
      const { data } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();
      return ['owner', 'admin'].includes(data?.role || '');
    },
    enabled: !!user && !!companyId,
  });

  // Fetch parent task info if this is a subtask (ghosts are NOT subtasks)
  const parentTaskId = (task?.origin === 'ghost') ? null : (task?.parent_task_id || null);
  const { data: parentTaskInfo } = useQuery({
    queryKey: ['parentTaskInfo', parentTaskId],
    queryFn: async () => {
      if (!parentTaskId) return null;
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('id', parentTaskId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!parentTaskId,
  });

  const [viewingParentTask, setViewingParentTask] = useState<any>(null);

  const handleOpenParentTask = async () => {
    if (!parentTaskInfo) return;
    const { data } = await supabase.from('tasks').select('*').eq('id', parentTaskInfo.id).single();
    if (data) setViewingParentTask(data);
  };

  const canViewOthersBoards = isOwner || isManager || hasPermission('ver-quadros-outros');

  // Fetch board columns - always fetch all for the company so we can assign tasks to any employee's board
  const { data: allColumns = [] } = useQuery({
    queryKey: ['all-board-columns', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (supabase
        .from('task_board_columns' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('order_index', { ascending: true }) as any);

      return (data || []) as Array<{ id: string; user_id: string; name: string; color: string; order_index: number }>;
    },
    enabled: !!companyId,
  });

  // Employees with boards for Quadro selector
  // In roteiro mode, filter by selected responsible's user_id
  // In kanban mode, filter by selected responsible's user_id
  const selectedResponsibleUserId = (() => {
    if (isRoteiro && formData.responsible_employee_id) {
      const emp = employees?.find(e => e.id === formData.responsible_employee_id);
      return emp?.user_id || null;
    }
    if (!isRoteiro && formData.responsible_user_id) {
      return formData.responsible_user_id || null;
    }
    return null;
  })();

  const employeesWithBoards = (() => {
    // If a responsible is selected, always show them as a board option
    if (selectedResponsibleUserId) {
      const responsibleEmp = employees?.filter(emp => emp.user_id === selectedResponsibleUserId) || [];
      if (responsibleEmp.length > 0) {
        // Deduplicate by user_id
        const seen = new Set<string>();
        return responsibleEmp.filter(emp => {
          if (seen.has(emp.user_id)) return false;
          seen.add(emp.user_id);
          return true;
        });
      }
    }
    // Fallback: show all employees that have board columns
    const all = employees?.filter(emp =>
      emp.user_id && allColumns.some(col => col.user_id === emp.user_id)
    ) || [];
    // Deduplicate by user_id
    const seen = new Set<string>();
    return all.filter(emp => {
      if (seen.has(emp.user_id)) return false;
      seen.add(emp.user_id);
      return true;
    });
  })();

  const filteredColumns = formData.quadro_user_id
    ? allColumns.filter(col => col.user_id === formData.quadro_user_id)
    : [];

  // Load user zoom preference
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setAuthUserId(u.id);
        let zoom = await getStoredZoom(u.id);
        // Clamp: if stored zoom is too small for the screen, reset to safe default
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
        if (zoom > screenW - 40) zoom = Math.min(1024, screenW - 40);
        if (zoom < MIN_SAFE_ZOOM) zoom = MIN_SAFE_ZOOM;
        // Snap to nearest valid level
        const nearest = ZOOM_LEVELS.reduce((prev, curr) => Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev);
        setZoomWidth(nearest);
        if (nearest !== zoom) saveZoom(u.id, nearest);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!statusPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (statusMenuRef.current && target && !statusMenuRef.current.contains(target)) {
        setStatusPopoverOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [statusPopoverOpen]);

  const handleZoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoomWidth);
    if (idx < ZOOM_LEVELS.length - 1) {
      const newZoom = ZOOM_LEVELS[idx + 1];
      setZoomWidth(newZoom);
      if (authUserId) saveZoom(authUserId, newZoom);
    }
  };

  const handleZoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoomWidth);
    if (idx > 0) {
      const newZoom = ZOOM_LEVELS[idx - 1];
      if (newZoom < MIN_SAFE_ZOOM) return; // prevent shrinking below safe minimum
      setZoomWidth(newZoom);
      if (authUserId) saveZoom(authUserId, newZoom);
    }
  };

  const sortedFilteredClients = clients
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    ) || [];

  const currentEmployee = employees?.find(e => e.user_id === user?.id);

  // Stable references for useEffect dependencies
  const currentEmployeeId = currentEmployee?.id;
  const currentEmployeeUserId = currentEmployee?.user_id;
  const currentEmployeeTeamId = currentEmployee?.team_id;
  const currentEmployeeName = currentEmployee?.name;
  const currentEmployeeAvatar = currentEmployee?.avatar || currentEmployee?.profile_avatar_url;
  const allColumnsJson = JSON.stringify(allColumns.map(c => ({ id: c.id, user_id: c.user_id })));

  useEffect(() => {
    const parsedColumns = JSON.parse(allColumnsJson) as Array<{ id: string; user_id: string }>;
    if (task) {
      if (isRoteiro) {
        // Roteiro mode: task is a RoteiroAtividade
        const quadroColId = task.quadro_column_id || '';
        let quadroUId = '';
        if (quadroColId) {
          const col = parsedColumns.find(c => c.id === quadroColId);
          if (col) quadroUId = col.user_id;
        }
        setFormData({
          title: task.titulo || '',
          description: task.descricao || '',
          status: 'todo',
          priority: 'medium',
          team_id: '',
          responsible_name: '',
          responsible_avatar: '',
          responsible_user_id: '',
          responsible_employee_id: task.responsavel_id || '',
          related_client_id: '',
          related_campaign_id: '',
          start_date: null,
          start_time: '',
          due_date: null,
          due_time: '',
          hasSpecificTime: false,
          progress: 0,
          checklist: Array.isArray(task.checklist)
            ? task.checklist.map((c: any, i: number) => ({
                id: String(i),
                text: typeof c === 'string' ? c : c.text || '',
                completed: typeof c === 'object' ? !!c.checked : false,
              }))
            : [],
          tipo: task.tipo || 'Tarefa',
          inicio_apos_dias: task.inicio_apos_dias || 0,
          duracao_dias: task.duracao_dias || 1,
          fluxo: task.fluxo || '',
          autorizador_id: task.autorizador_id || '',
          categoria_id: task.categoria_id || '',
          classificacao_id: task.classificacao_id || '',
          quadro_user_id: quadroUId,
          quadro_column_id: quadroColId,
        });
      } else {
        // Kanban mode
        const startDate = task.start_date ? new Date(task.start_date) : null;
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const quadroColId = task.quadro_column_id || '';
        let quadroUId = '';
        if (quadroColId) {
          const col = parsedColumns.find(c => c.id === quadroColId);
          if (col) quadroUId = col.user_id;
        }
        if (!quadroUId) {
          quadroUId = task.assigned_user_id || task.user_id || '';
        }

        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          team_id: task.team_id || '',
          responsible_name: task.responsible_name || '',
          responsible_avatar: task.responsible_avatar || '',
          responsible_user_id: task.user_id || task.assigned_user_id || '',
          responsible_employee_id: '',
          related_client_id: task.related_client_id || '',
          related_campaign_id: task.related_campaign_id || '',
          start_date: startDate,
          start_time: startDate ? format(startDate, 'HH:mm') : '',
          due_date: dueDate,
          due_time: dueDate ? format(dueDate, 'HH:mm') : '',
          hasSpecificTime: !!task.start_date,
          progress: task.progress || 0,
          checklist: (() => {
            try {
              return task.checklist && typeof task.checklist === 'string' && task.checklist.trim() !== ''
                ? JSON.parse(task.checklist)
                : [];
            } catch {
              return [];
            }
          })(),
          tipo: task.task_type || 'Tarefa',
          inicio_apos_dias: 0,
          duracao_dias: 1,
          fluxo: '',
          autorizador_id: '',
          categoria_id: task.categoria_id || '',
          classificacao_id: task.classificacao_id || '',
          quadro_user_id: quadroUId,
          quadro_column_id: quadroColId,
        });
        // Load creative data
        const cd = task.creative_data as any;
        setCreativeData({
          post_type: cd?.post_type || 'feed',
          caption: cd?.caption || '',
          files: cd?.files || [],
        });
      }
    } else {
      // Determine default board for new tasks
      const defaultQuadroUserId = defaultBoardUserId || currentEmployeeUserId || '';
      const defaultQuadroColumnId = defaultQuadroUserId
        ? (parsedColumns.find(c => c.user_id === defaultQuadroUserId)?.id || '')
        : '';

      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        team_id: currentEmployeeTeamId || '',
        responsible_name: isRoteiro ? '' : (currentEmployeeName || ''),
        responsible_avatar: isRoteiro ? '' : (currentEmployeeAvatar || ''),
        responsible_user_id: isRoteiro ? '' : (currentEmployeeUserId || ''),
        responsible_employee_id: '',
        related_client_id: defaultClientId || '',
        related_campaign_id: '',
        start_date: null,
        start_time: '',
        due_date: null,
        due_time: '',
        hasSpecificTime: false,
        progress: 0,
        checklist: [],
        tipo: 'Tarefa',
        inicio_apos_dias: 0,
        duracao_dias: 1,
        fluxo: '',
        autorizador_id: '',
        categoria_id: '',
        classificacao_id: '',
        quadro_user_id: defaultQuadroUserId,
        quadro_column_id: defaultQuadroColumnId,
      });
    }
    setCreativeData({ post_type: 'feed', caption: '', files: [] });
    setActiveTab('principal');
  }, [task, defaultClientId, defaultBoardUserId, currentEmployeeId, currentEmployeeUserId, currentEmployeeTeamId, currentEmployeeName, currentEmployeeAvatar, isRoteiro, allColumnsJson]);

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    // Log automatic history for edits on existing tasks
    if (task?.id && !isRoteiro) {
      const statusLabels: Record<string, string> = {
        todo: 'Pendente', progress: 'Em Andamento', review: 'Em Revisão',
        done: 'Concluído', waiting_approval: 'Aguardando Aprovação',
        blocked: 'Bloqueado', paused: 'Pausado', cancelled: 'Cancelado',
      };
      const priorityLabels: Record<string, string> = {
        low: 'Baixa', medium: 'Média', high: 'Alta',
      };

      // Status
      if (task.status && formData.status !== task.status) {
        await logAutomatic(task.id, `Alterou o status de ${statusLabels[task.status] || task.status} para ${statusLabels[formData.status] || formData.status}`, 'status', task.status, formData.status);
      }
      // Prioridade
      if (task.priority && formData.priority !== task.priority) {
        await logAutomatic(task.id, `Alterou a prioridade de ${priorityLabels[task.priority] || task.priority} para ${priorityLabels[formData.priority] || formData.priority}`, 'priority', task.priority, formData.priority);
      }
      // Título
      if (task.title && formData.title !== task.title) {
        await logAutomatic(task.id, `Alterou o título da tarefa`, 'title', task.title, formData.title);
      }
      // Responsável
      if (formData.responsible_name !== (task.responsible_name || '')) {
        const oldName = task.responsible_name || 'Nenhum';
        const newName = formData.responsible_name || 'Nenhum';
        await logAutomatic(task.id, `Alterou o responsável de ${oldName} para ${newName}`, 'responsible_name', oldName, newName);
      }
      // Descrição
      if ((formData.description || '') !== (task.description || '')) {
        await logAutomatic(task.id, `Alterou a descrição da tarefa`, 'description', task.description || '', formData.description || '');
      }
      // Equipe
      if (formData.team_id !== (task.team_id || '')) {
        const oldTeam = teams?.find(t => t.id === task.team_id)?.name || 'Nenhuma';
        const newTeam = teams?.find(t => t.id === formData.team_id)?.name || 'Nenhuma';
        await logAutomatic(task.id, `Alterou a equipe de ${oldTeam} para ${newTeam}`, 'team_id', oldTeam, newTeam);
      }
      // Tipo
      if (formData.tipo !== (task.task_type || 'Tarefa')) {
        await logAutomatic(task.id, `Alterou o tipo de ${task.task_type || 'Tarefa'} para ${formData.tipo}`, 'task_type', task.task_type || 'Tarefa', formData.tipo);
      }
      // Quadro
      if (formData.quadro_user_id !== (task.quadro_user_id || '')) {
        const oldBoard = employeesWithBoards.find(e => e.user_id === task.quadro_user_id)?.name || 'Nenhum';
        const newBoard = employeesWithBoards.find(e => e.user_id === formData.quadro_user_id)?.name || 'Nenhum';
        if (oldBoard !== newBoard) {
          await logAutomatic(task.id, `Alterou o quadro de ${oldBoard} para ${newBoard}`, 'quadro', oldBoard, newBoard);
        }
      }
      // Etapa (coluna do quadro)
      if (formData.quadro_column_id !== (task.quadro_column_id || '')) {
        const oldCol = allColumns.find(c => c.id === task.quadro_column_id)?.name || 'Nenhuma';
        const newCol = allColumns.find(c => c.id === formData.quadro_column_id)?.name || 'Nenhuma';
        if (oldCol !== newCol) {
          await logAutomatic(task.id, `Alterou a etapa de ${oldCol} para ${newCol}`, 'etapa', oldCol, newCol);
        }
      }
      // Progresso
      if (formData.progress !== (task.progress || 0)) {
        await logAutomatic(task.id, `Alterou o progresso de ${task.progress || 0}% para ${formData.progress}%`, 'progress', String(task.progress || 0), String(formData.progress));
      }
      // Cliente
      if (formData.related_client_id !== (task.related_client_id || '')) {
        const oldClient = clients?.find(c => c.id === task.related_client_id)?.name || 'Nenhum';
        const newClient = clients?.find(c => c.id === formData.related_client_id)?.name || 'Nenhum';
        await logAutomatic(task.id, `Alterou o cliente de ${oldClient} para ${newClient}`, 'related_client_id', oldClient, newClient);
      }
      // Categoria
      if (formData.categoria_id !== (task.categoria_id || '')) {
        const oldCat = categorias.find(c => c.id === task.categoria_id)?.nome || 'Nenhuma';
        const newCat = categorias.find(c => c.id === formData.categoria_id)?.nome || 'Nenhuma';
        await logAutomatic(task.id, `Alterou a categoria de ${oldCat} para ${newCat}`, 'categoria_id', oldCat, newCat);
      }
      // Classificação
      if (formData.classificacao_id !== (task.classificacao_id || '')) {
        const oldClass = classificacoes.find(c => c.id === task.classificacao_id)?.nome || 'Nenhuma';
        const newClass = classificacoes.find(c => c.id === formData.classificacao_id)?.nome || 'Nenhuma';
        await logAutomatic(task.id, `Alterou a classificação de ${oldClass} para ${newClass}`, 'classificacao_id', oldClass, newClass);
      }
      // Auto time tracking: start when moving TO progress, stop when moving FROM progress
      if (task.status !== formData.status) {
        await handleAutoTimeTracking(task.id, task.status, formData.status, authUserId || user?.id, companyId);
        // Discord notification when moving to review
        if (formData.status === 'review' && activeCompany?.company_id) {
          const { sendDiscordTaskNotification: notify } = await import('@/hooks/useDiscordNotifications');
          notify(activeCompany.company_id, 'task_review', {
            title: formData.title,
            responsible_name: formData.responsible_name,
            priority: formData.priority,
            due_date: formData.due_date?.toISOString(),
            team_id: formData.team_id,
          });
        }
      }
    }

    if (isRoteiro) {
      const selectedCol = allColumns.find(c => c.id === formData.quadro_column_id);
      onSave({
        titulo: formData.title.trim(),
        tipo: formData.tipo,
        inicio_apos_dias: formData.inicio_apos_dias,
        duracao_dias: formData.duracao_dias,
        responsavel_id: formData.responsible_employee_id || null,
        quadro_column_id: formData.quadro_column_id || null,
        etapa: selectedCol?.name || null,
        fluxo: formData.fluxo || null,
        descricao: formData.description || null,
        autorizador_id: formData.autorizador_id || null,
        checklist: formData.checklist.filter(i => i.text).map(i => ({ text: i.text, checked: i.completed })),
      });
      return;
    }

    // Kanban mode save
    let startDateTime: Date | null = null;
    let dueDateTime: Date | null = null;

    if (formData.hasSpecificTime && formData.start_date && formData.start_time) {
      const year = formData.start_date.getFullYear();
      const month = formData.start_date.getMonth();
      const day = formData.start_date.getDate();
      const [hours, minutes] = formData.start_time.split(':').map(Number);
      startDateTime = new Date(year, month, day, hours, minutes);
    }

    if (formData.due_date && formData.due_time) {
      const year = formData.due_date.getFullYear();
      const month = formData.due_date.getMonth();
      const day = formData.due_date.getDate();
      const [hours, minutes] = formData.due_time.split(':').map(Number);
      dueDateTime = new Date(year, month, day, hours, minutes);
    } else if (formData.due_date) {
      const year = formData.due_date.getFullYear();
      const month = formData.due_date.getMonth();
      const day = formData.due_date.getDate();
      dueDateTime = new Date(year, month, day, 23, 59, 59);
    }

    if (startDateTime && dueDateTime && startDateTime >= dueDateTime) {
      alert('A data/hora de início deve ser anterior à data/hora do prazo.');
      return;
    }

    const selectedCol = allColumns.find(c => c.id === formData.quadro_column_id);
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      team_id: formData.team_id,
      responsible_name: formData.responsible_name,
      responsible_avatar: formData.responsible_avatar,
      user_id: formData.responsible_user_id,
      related_client_id: formData.related_client_id || null,
      related_campaign_id: formData.related_campaign_id || null,
      progress: formData.progress,
      checklist: JSON.stringify(formData.checklist),
      quadro_column_id: formData.quadro_column_id || null,
      etapa: selectedCol?.name || null,
      autorizador_id: formData.autorizador_id || null,
      categoria_id: formData.categoria_id || null,
      classificacao_id: formData.classificacao_id || null,
      task_type: (() => {
        const valid = ['Backlog', 'Criativo', 'História', 'Negócio', 'Reunião', 'Tarefa', 'Ticket'];
        const match = valid.find(v => v.toLowerCase() === (formData.tipo || '').toLowerCase());
        return match || 'Tarefa';
      })(),
      creative_data: formData.tipo === 'Criativo' ? {
        post_type: creativeData.post_type,
        caption: creativeData.caption,
        files: creativeData.files.map(f => ({ id: f.id, url: f.url, name: f.name, type: f.type })),
      } : null,
    };

    if (startDateTime) {
      taskData.start_date = startDateTime.toISOString();
    }

    if (dueDateTime) {
      taskData.due_date = dueDateTime.toISOString();
      taskData.deadline = dueDateTime.toISOString().split('T')[0];
    } else {
      taskData.deadline = new Date().toISOString().split('T')[0];
    }

    onSave(taskData);
    onOpenChange(false);
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [
          ...prev.checklist,
          { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }
        ]
      }));
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== id)
    }));
  };

  const toggleChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const findSlotForDateTime = (date: Date | null, time: string) => {
    if (!date || !time || !timeSlots) return null;
    const [hours, minutes] = time.split(':').map(Number);
    const timeOnly = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const exactSlot = timeSlots.find(slot => timeOnly >= slot.start_time && timeOnly <= slot.end_time);
    if (exactSlot) return { slot: exactSlot, isExact: true };
    const nextSlot = timeSlots.filter(slot => slot.start_time > timeOnly).sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    if (nextSlot) return { slot: nextSlot, isExact: false };
    const lastSlot = timeSlots.sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
    return lastSlot ? { slot: lastSlot, isExact: false } : null;
  };

  useEffect(() => {
    if (formData.hasSpecificTime && formData.start_date && formData.start_time) {
      const result = findSlotForDateTime(formData.start_date, formData.start_time);
      if (result) {
        const prefix = result.isExact ? '' : '📍 ';
        const suffix = result.isExact ? '' : ' (próximo disponível)';
        setPreviewSlot(`${prefix}${result.slot.name}${suffix}`);
      } else {
        setPreviewSlot('Nenhum slot encontrado');
      }
    } else {
      setPreviewSlot('');
    }
  }, [formData.start_date, formData.start_time, formData.hasSpecificTime, timeSlots]);

  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const statusColors: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-800',
    progress: 'bg-blue-100 text-blue-800',
    review: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
    waiting_approval: 'bg-amber-100 text-amber-800',
    blocked: 'bg-red-100 text-red-800',
    paused: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-slate-100 text-slate-800',
  };

  const { logAutomatic } = useTaskHistory(task?.id || null);

  const sidebarItems: { id: SidebarTab; label: string; icon: any }[] = [
    { id: 'principal', label: 'Principal', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'equipe', label: 'Equipe', icon: UsersRound },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    ...(task ? [{ id: 'subtarefas' as SidebarTab, label: 'Sub-Tarefas', icon: ListTree }] : []),
    ...(task ? [{ id: 'timetracking' as SidebarTab, label: 'Time Track', icon: Timer }] : []),
    ...(task ? [{ id: 'historico' as SidebarTab, label: 'Histórico', icon: History }] : []),
  ];

  const responsavelName = isRoteiro
    ? employees?.find(e => e.id === formData.responsible_employee_id)?.name
    : formData.responsible_name;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: `${zoomWidth}px` }}
      >
        <div className="flex max-h-[90vh]">
          {/* Left Sidebar */}
          <div className="w-20 border-r border-border bg-muted/30 flex flex-col items-center py-4 gap-1 shrink-0">
            {sidebarItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg w-16 transition-colors text-xs
                      ${activeTab === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="leading-tight text-center">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}

            {/* Status Dropdown in Sidebar */}
            <Separator className="my-2 w-12" />
            {(() => {
              const statusOptions = [
                { value: 'todo', label: 'Pendente', color: 'bg-gray-400' },
                { value: 'progress', label: 'Em Andamento', color: 'bg-blue-500' },
                { value: 'review', label: 'Em Revisão', color: 'bg-purple-500' },
                { value: 'waiting_approval', label: 'Aguardando', color: 'bg-amber-500' },
                { value: 'blocked', label: 'Bloqueada', color: 'bg-red-500' },
                { value: 'paused', label: 'Pausada', color: 'bg-orange-500' },
                { value: 'done', label: 'Concluída', color: 'bg-green-500' },
                { value: 'cancelled', label: 'Cancelada', color: 'bg-slate-500' },
              ];
              const current = statusOptions.find(s => s.value === formData.status) || statusOptions[0];
              return (
                <div className="relative" ref={statusMenuRef}>
                  <button
                    type="button"
                    onClick={() => setStatusPopoverOpen((prev) => !prev)}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-lg w-16 transition-colors text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-haspopup="menu"
                    aria-expanded={statusPopoverOpen}
                  >
                    <span className={`w-5 h-5 rounded-full ${current.color} shrink-0`} />
                    <span className="leading-tight text-center text-[10px]">{current.label}</span>
                  </button>

                  {statusPopoverOpen && (
                    <div
                      role="menu"
                      className="absolute left-full top-0 ml-2 w-52 p-1 rounded-md border bg-popover text-popover-foreground shadow-md z-[90]"
                    >
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Alterar Status</div>
                      {statusOptions.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, status: s.value }));
                            setStatusPopoverOpen(false);
                          }}
                          className={`w-full flex cursor-pointer items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                            formData.status === s.value
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex-1" />

            {task && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-lg w-16 text-destructive hover:bg-destructive/10 transition-colors text-xs"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="leading-tight">Excluir</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Excluir tarefa</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {formData.responsible_avatar && (
                  <AvatarImage src={formData.responsible_avatar} />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {formData.title ? formData.title.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {parentTaskInfo && (
                  <button
                    onClick={handleOpenParentTask}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mb-0.5 group"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="truncate max-w-[300px]">Subtarefa de: <span className="font-medium underline underline-offset-2 group-hover:no-underline">{parentTaskInfo.title}</span></span>
                  </button>
                )}
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {formData.title || 'Sem Título'}
                </h2>
                <p className="text-sm text-muted-foreground truncate">
                  {task ? (isRoteiro ? 'Editando atividade' : 'Editando tarefa') : (isRoteiro ? 'Nova atividade' : 'Nova tarefa')}
                  {responsavelName && ` · ${responsavelName}`}
                  {formData.related_client_id && clients?.find(c => c.id === formData.related_client_id)?.name && (
                    <span className="text-primary"> · {clients.find(c => c.id === formData.related_client_id)!.name}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {task?.task_state && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    task.task_state === 'backlog'
                      ? 'bg-muted text-muted-foreground'
                      : task.task_state === 'planejamento'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      task.task_state === 'backlog'
                        ? 'bg-muted-foreground'
                        : task.task_state === 'planejamento'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`} />
                    {task.task_state === 'backlog' ? 'Backlog' : task.task_state === 'planejamento' ? 'Planejamento' : 'Execução'}
                  </span>
                )}
                {task?.id && (() => {
                  const score = task.task_quality_score ?? 100;
                  const scoreColor = score >= 80
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : score >= 60
                    ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400';
                  const tooltipText = score >= 80
                    ? `Qualidade alta — sem rejeições ou apenas ajustes menores`
                    : score >= 60
                    ? `Qualidade média — tarefa teve rejeições significativas`
                    : `Qualidade baixa — tarefa foi rejeitada várias vezes`;
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold cursor-default ${scoreColor}`}>
                          ⭐ {Number(score).toFixed(0)}%
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-center">
                        <p className="font-semibold">Qualidade da Tarefa</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleZoomOut} disabled={ZOOM_LEVELS.indexOf(zoomWidth) <= 0}>
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Diminuir</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleZoomIn} disabled={ZOOM_LEVELS.indexOf(zoomWidth) >= ZOOM_LEVELS.length - 1}>
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Aumentar</TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onOpenChange(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-5">
                {activeTab === 'principal' && (
                  <div className="space-y-5">
                    {/* Título */}
                    <div>
                      <Label className="text-sm font-semibold">Título</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={isRoteiro ? "Título da atividade" : "Título da tarefa"}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Roteiro: Tipo / Início / Duração */}
                    {isRoteiro && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-semibold">Tipo</Label>
                          <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">Início após (dias)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.inicio_apos_dias}
                            onChange={(e) => setFormData(prev => ({ ...prev, inicio_apos_dias: Number(e.target.value) }))}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">Duração</Label>
                          <Input
                            type="number"
                            min={1}
                            value={formData.duracao_dias}
                            onChange={(e) => setFormData(prev => ({ ...prev, duracao_dias: Number(e.target.value) }))}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    )}

                     {/* Kanban: Status / Progresso */}
                    {!isRoteiro && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Tipo</Label>
                            <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}>
                              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo"><Badge className={statusColors.todo}>Pendente</Badge></SelectItem>
                                <SelectItem value="progress"><Badge className={statusColors.progress}>Em Andamento</Badge></SelectItem>
                                <SelectItem value="review"><Badge className={statusColors.review}>Em Revisão</Badge></SelectItem>
                                <SelectItem value="waiting_approval"><Badge className={statusColors.waiting_approval}>Aguardando Aprovação</Badge></SelectItem>
                                <SelectItem value="blocked"><Badge className={statusColors.blocked}>Bloqueada</Badge></SelectItem>
                                <SelectItem value="paused"><Badge className={statusColors.paused}>Pausada</Badge></SelectItem>
                                <SelectItem value="done"><Badge className={statusColors.done}>Concluída</Badge></SelectItem>
                                <SelectItem value="cancelled"><Badge className={statusColors.cancelled}>Cancelada</Badge></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Progresso (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.progress}
                              onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        {formData.progress > 0 && <Progress value={formData.progress} className="h-2" />}

                        {/* Prioridade / Categoria / Classificação */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Prioridade</Label>
                            <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low"><Badge className={priorityColors.low}>Baixa</Badge></SelectItem>
                                <SelectItem value="medium"><Badge className={priorityColors.medium}>Média</Badge></SelectItem>
                                <SelectItem value="high"><Badge className={priorityColors.high}>Alta</Badge></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <InlineSearchableSelect
                            label="Categoria"
                            value={formData.categoria_id || ''}
                            options={categorias}
                            onChange={(id) => setFormData(prev => ({ ...prev, categoria_id: id }))}
                            onCreate={(name) => createCategoria.mutateAsync(name)}
                          />
                          <InlineSearchableSelect
                            label="Classificação"
                            value={formData.classificacao_id || ''}
                            options={classificacoes}
                            onChange={(id) => setFormData(prev => ({ ...prev, classificacao_id: id }))}
                            onCreate={(name) => createClassificacao.mutateAsync(name)}
                          />
                        </div>
                      </>
                    )}

                    {/* Creative Panel - shown when tipo is Criativo */}
                    {!isRoteiro && formData.tipo === 'Criativo' && (
                      <CreativeTaskPanel
                        data={creativeData}
                        onChange={setCreativeData}
                        companyId={companyId}
                        taskId={task?.id}
                        clientName={clients?.find(c => c.id === formData.related_client_id)?.name}
                      />
                    )}

                    {/* Responsável row */}
                    {isRoteiro ? (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-semibold">Responsável</Label>
                          <Select
                            value={formData.responsible_employee_id}
                            onValueChange={(v) => {
                              const emp = employees?.find(e => e.id === v);
                              const empUserId = emp?.user_id || '';
                              setFormData(prev => ({
                                ...prev,
                                responsible_employee_id: v,
                                quadro_user_id: empUserId,
                                quadro_column_id: '',
                              }));
                            }}
                          >
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">Quadro</Label>
                          <Select
                            value={formData.quadro_user_id}
                            onValueChange={(v) => {
                              setFormData(prev => ({ ...prev, quadro_user_id: v, quadro_column_id: '' }));
                            }}
                          >
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {employeesWithBoards.map(e => (
                                <SelectItem key={e.user_id} value={e.user_id!}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">Etapa</Label>
                          <Select
                            value={formData.quadro_column_id}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, quadro_column_id: v }))}
                            disabled={!formData.quadro_user_id}
                          >
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {filteredColumns.map(col => (
                                <SelectItem key={col.id} value={col.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                                    {col.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Kanban: Equipe / Responsável */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Equipe</Label>
                            <Select value={formData.team_id} onValueChange={(value) => {
                              setFormData(prev => ({ ...prev, team_id: value }));
                              // Auto-assign authorizer from the selected squad
                              const selectedTeam = teams?.find(t => t.id === value);
                              if (selectedTeam?.authorizer_id && task?.id) {
                                // Will be handled via useEffect below
                              }
                            }}>
                              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {teams?.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Responsável</Label>
                            <div className="relative">
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal mt-1.5"
                                type="button"
                                onClick={() => setResponsibleDropdownOpen(prev => !prev)}
                              >
                                {formData.responsible_name || "Selecione..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                              {responsibleDropdownOpen && (
                                <div
                                  className="absolute left-0 right-0 top-full mt-1 z-[9999] bg-popover border rounded-md shadow-lg"
                                  onFocus={(e) => e.stopPropagation()}
                                  onBlur={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <div className="p-2 border-b">
                                    <input
                                      placeholder="Buscar responsável..."
                                      value={responsibleSearch}
                                      onChange={(e) => { e.stopPropagation(); setResponsibleSearch(e.target.value); }}
                                      onFocus={(e) => e.stopPropagation()}
                                      onBlur={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { setResponsibleDropdownOpen(false); setResponsibleSearch(''); } }}
                                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="max-h-[200px] overflow-y-auto p-1">
                                    {(employees || [])
                                      .filter(emp => {
                                        if (formData.team_id && emp.team_id !== formData.team_id) return false;
                                        if (responsibleSearch && !emp.name.toLowerCase().includes(responsibleSearch.toLowerCase())) return false;
                                        return true;
                                      })
                                      .map((employee) => (
                                        <div
                                          key={employee.id}
                                          className={cn(
                                            "px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm",
                                            formData.responsible_user_id === employee.user_id && "bg-primary/10 text-primary"
                                          )}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            const empUserId = employee.user_id || '';
                                            setFormData(prev => ({
                                              ...prev,
                                              responsible_name: employee.name,
                                              responsible_avatar: employee.avatar || employee.profile_avatar_url || '',
                                              responsible_user_id: empUserId,
                                              quadro_user_id: empUserId,
                                              quadro_column_id: '',
                                            }));
                                            setResponsibleSearch('');
                                            setResponsibleDropdownOpen(false);
                                          }}
                                        >
                                          {employee.name}
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kanban: Quadro / Etapa */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Quadro</Label>
                            <Select
                              value={formData.quadro_user_id}
                              onValueChange={(v) => {
                                setFormData(prev => ({ ...prev, quadro_user_id: v, quadro_column_id: '' }));
                              }}
                            >
                              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {employeesWithBoards.map(e => (
                                  <SelectItem key={e.user_id} value={e.user_id!}>{e.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Etapa</Label>
                            <Select
                              value={formData.quadro_column_id}
                              onValueChange={(v) => setFormData(prev => ({ ...prev, quadro_column_id: v }))}
                              disabled={!formData.quadro_user_id}
                            >
                              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {filteredColumns.map(col => (
                                  <SelectItem key={col.id} value={col.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                                      {col.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Kanban: Cliente / Campanha */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Cliente (opcional)</Label>
                            <div className="relative mt-1.5">
                              <Button
                                variant="outline"
                                role="combobox"
                                type="button"
                                className="w-full justify-between font-normal"
                                onClick={() => setClientDropdownOpen(prev => !prev)}
                              >
                                {formData.related_client_id
                                  ? clients?.find(c => c.id === formData.related_client_id)?.name || "Selecione..."
                                  : "Nenhum cliente"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                              {clientDropdownOpen && (
                                <div className="absolute z-[9999] mt-1 w-full rounded-md border bg-popover shadow-lg">
                                  <div className="p-2 border-b">
                                    <Input
                                      placeholder="Buscar cliente..."
                                      value={clientSearch}
                                      onChange={(e) => setClientSearch(e.target.value)}
                                      className="h-8"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="max-h-[200px] overflow-y-auto">
                                    <div
                                      className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setFormData(prev => ({ ...prev, related_client_id: '', related_campaign_id: '' }));
                                        setClientSearch('');
                                        setClientDropdownOpen(false);
                                      }}
                                    >
                                      Nenhum cliente
                                    </div>
                                    {sortedFilteredClients.map((client) => (
                                      <div
                                        key={client.id}
                                        className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${formData.related_client_id === client.id ? 'bg-primary/10 text-primary' : ''}`}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setFormData(prev => ({ ...prev, related_client_id: client.id, related_campaign_id: '' }));
                                          setClientSearch('');
                                          setClientDropdownOpen(false);
                                        }}
                                      >
                                        {client.name}
                                      </div>
                                    ))}
                                    {sortedFilteredClients.length === 0 && clientSearch && (
                                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">Nenhum cliente encontrado</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Campanha (opcional)</Label>
                            <Select
                              value={formData.related_campaign_id === '' ? "none" : formData.related_campaign_id || "none"}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, related_campaign_id: value === "none" ? '' : value }))}
                              disabled={!formData.related_client_id}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder={formData.related_client_id ? "Selecione..." : "Selecione um cliente primeiro"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhuma campanha</SelectItem>
                                {campaigns
                                  ?.filter(campaign => campaign.client_id === formData.related_client_id)
                                  ?.map((campaign) => (
                                    <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Roteiro: Fluxo */}
                    {isRoteiro && (
                      <div>
                        <Label className="text-sm font-semibold">Fluxo</Label>
                        <Input
                          value={formData.fluxo}
                          onChange={(e) => setFormData(prev => ({ ...prev, fluxo: e.target.value }))}
                          placeholder="Nome do fluxo"
                          className="mt-1.5"
                        />
                      </div>
                    )}

                    <Separator />

                    {/* Kanban: Datas e Horários */}
                    {!isRoteiro && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-foreground">Datas e Horários</h3>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasSpecificTime"
                              checked={formData.hasSpecificTime}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasSpecificTime: !!checked }))}
                            />
                            <Label htmlFor="hasSpecificTime">Esta tarefa tem horário específico</Label>
                          </div>

                          {formData.hasSpecificTime && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-semibold">Data de Início</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left mt-1.5">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {formData.start_date ? format(formData.start_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={formData.start_date}
                                      onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                                      initialFocus
                                      className="pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Hora de Início</Label>
                                <Input
                                  type="time"
                                  value={formData.start_time}
                                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                  className="mt-1.5"
                                />
                                {previewSlot && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Slot: <strong>{previewSlot}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-semibold">Data do Prazo</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start text-left mt-1.5">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.due_date ? format(formData.due_date, "PPP", { locale: ptBR }) : "Selecione o prazo"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formData.due_date}
                                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                                    initialFocus
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Hora do Prazo {!formData.hasSpecificTime && "(opcional)"}</Label>
                              <Input
                                type="time"
                                value={formData.due_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
                                className="mt-1.5"
                              />
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Review Panel – visible for all tasks with an ID */}
                    {!isRoteiro && task?.id && (
                      <TaskReviewPanel
                        task={{ ...task, status: formData.status, task_quality_score: task.task_quality_score }}
                        onTaskUpdated={() => {
                          // Close dialog after approve/reject to force refresh
                          onOpenChange(false);
                        }}
                      />
                    )}

                    {/* Descrição */}
                    <div>
                      <Label className="text-sm font-semibold">Descrição</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={isRoteiro ? "Descrição detalhada da atividade..." : "Descreva a tarefa..."}
                        rows={5}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'clientes' && (
                  <TaskClientsTab
                    taskId={task?.id}
                    companyId={companyId}
                    currentClientId={formData.related_client_id}
                    currentClientName={clients?.find(c => c.id === formData.related_client_id)?.name}
                  />
                )}

                {activeTab === 'equipe' && (
                  <TaskTeamTab
                    taskId={task?.id}
                    companyId={companyId}
                    fallbackResponsible={{
                      name: formData.responsible_name || employees?.find(e => e.id === formData.responsible_employee_id)?.name || '',
                      avatar: formData.responsible_avatar || employees?.find(e => e.id === formData.responsible_employee_id)?.avatar || '',
                      employeeId: formData.responsible_employee_id || employees?.find(e => e.user_id === formData.responsible_user_id)?.id || '',
                    }}
                    defaultTeamId={formData.team_id}
                    autoAssignAuthorizerId={teams?.find(t => t.id === formData.team_id)?.authorizer_id}
                  />
                )}


                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Checklist</h3>
                        <p className="text-sm text-muted-foreground">
                          Adicione itens de checklist para esta {isRoteiro ? 'atividade' : 'tarefa'}.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setImportChecklistOpen(true)} className="gap-1.5">
                        <FileDown className="w-4 h-4" />
                        Importar Template
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => toggleChecklistItem(item.id)}
                          />
                          <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeChecklistItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Novo item do checklist..."
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                      />
                      <Button variant="outline" size="icon" onClick={addChecklistItem}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'subtarefas' && (
                  <div>
                    <TaskSubtasksTab taskId={task?.id || null} onParentTypeChange={(type) => setFormData(prev => ({ ...prev, tipo: type }))} />
                  </div>
                )}

                {activeTab === 'timetracking' && (
                  <TaskTimeTrackingTab taskId={task?.id || null} taskStatus={formData.status} />
                )}

                {activeTab === 'historico' && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Histórico</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Registro de alterações e anotações desta {isRoteiro ? 'atividade' : 'tarefa'}.
                    </p>
                    <TaskHistoryTab taskId={task?.id || null} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button onClick={handleSave} disabled={!formData.title.trim() || !!loading} className="gap-2">
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : (task ? 'Atualizar' : 'Criar')} {isRoteiro ? 'Atividade' : 'Tarefa'}
              </Button>
            </div>
          </div>

          {/* Output Panel - shown for non-creative tasks when editing */}
          {!isRoteiro && formData.tipo !== 'Criativo' && task?.id && (
            <>
              {/* Draggable divider */}
              <div
                onMouseDown={handleDividerMouseDown}
                className="w-1 shrink-0 bg-border hover:bg-primary/40 cursor-col-resize transition-colors duration-150 relative group"
                title="Arraste para redimensionar"
              >
                <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
              </div>
              <div className="shrink-0 overflow-hidden" style={{ width: outputWidth }}>
                <TaskOutputPanel taskId={task.id} companyId={companyId} clientId={formData.related_client_id} expanded={outputExpanded} onToggleExpand={() => setOutputExpanded(prev => !prev)} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Stacked dialog for viewing parent task */}
    {viewingParentTask && (
      <TaskDialog
        open={!!viewingParentTask}
        onOpenChange={(open) => {
          if (!open) setViewingParentTask(null);
        }}
        task={viewingParentTask}
        onSave={async (taskData) => {
          const { id, ...updates } = taskData;
          await supabase.from('tasks').update(updates).eq('id', viewingParentTask.id);
          setViewingParentTask(null);
        }}
      />
    )}

    <ImportChecklistTemplateModal
      open={importChecklistOpen}
      onOpenChange={setImportChecklistOpen}
      onImport={(items) => {
        setFormData(prev => ({
          ...prev,
          checklist: [...prev.checklist, ...items],
        }));
      }}
    />

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Excluir Tarefa</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a tarefa <strong>{formData.title}</strong>? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={async () => {
              if (!task?.id) return;
              setDeleting(true);
              try {
                await supabase.from('tasks').delete().eq('id', task.id);
                setDeleteConfirmOpen(false);
                onOpenChange(false);
              } catch (err) {
                console.error('Error deleting task:', err);
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
