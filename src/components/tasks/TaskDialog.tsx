import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Plus, Home, CheckSquare, Trash2, Save, ZoomIn, ZoomOut, ShieldCheck, Search, Users, UsersRound, History, ListTree, ArrowUpRight, CircleDot, ChevronDown, Timer } from "lucide-react";
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

export type TaskDialogMode = 'kanban' | 'roteiro';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onSave: (taskData: any) => void;
  defaultClientId?: string;
  mode?: TaskDialogMode;
  // Roteiro-specific
  loading?: boolean;
  onDelete?: () => void;
}

type SidebarTab = 'principal' | 'clientes' | 'equipe' | 'checklist' | 'subtarefas' | 'historico' | 'timetracking';

const ZOOM_STORAGE_KEY = 'task-dialog-zoom';
const ZOOM_LEVELS = [640, 768, 896, 1024, 1152, 1280];

const TASK_TYPES = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Criativo', label: 'Criativo' },
  { value: 'História', label: 'História' },
  { value: 'Negócio', label: 'Negócio' },
  { value: 'Reunião', label: 'Reunião' },
  { value: 'Tarefa', label: 'Tarefa' },
  { value: 'Ticket', label: 'Ticket' },
];

function getStoredZoom(userId: string): number {
  try {
    const stored = localStorage.getItem(`${ZOOM_STORAGE_KEY}-${userId}`);
    if (stored) return parseInt(stored, 10);
  } catch {}
  return 1024;
}

function saveZoom(userId: string, zoom: number) {
  try {
    localStorage.setItem(`${ZOOM_STORAGE_KEY}-${userId}`, String(zoom));
  } catch {}
}

export function TaskDialog({ open, onOpenChange, task, onSave, defaultClientId, mode = 'kanban', loading, onDelete }: TaskDialogProps) {
  const isRoteiro = mode === 'roteiro';
  const [activeTab, setActiveTab] = useState<SidebarTab>('principal');
  const [zoomWidth, setZoomWidth] = useState(1024);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

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
  const [clientSearch, setClientSearch] = useState('');
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [classificacaoSearch, setClassificacaoSearch] = useState('');
  const [newCategoriaName, setNewCategoriaName] = useState('');
  const [newClassificacaoName, setNewClassificacaoName] = useState('');
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

  // Fetch parent task info if this is a subtask
  const parentTaskId = task?.parent_task_id || null;
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
        setZoomWidth(getStoredZoom(u.id));
      }
    };
    loadUser();
  }, []);

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

  useEffect(() => {
    if (task) {
      if (isRoteiro) {
        // Roteiro mode: task is a RoteiroAtividade
        const quadroColId = task.quadro_column_id || '';
        let quadroUId = '';
        if (quadroColId) {
          const col = allColumns.find(c => c.id === quadroColId);
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
          const col = allColumns.find(c => c.id === quadroColId);
          if (col) quadroUId = col.user_id;
        }

        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          team_id: task.team_id || '',
          responsible_name: task.responsible_name || '',
          responsible_avatar: task.responsible_avatar || '',
          responsible_user_id: task.user_id || '',
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
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        team_id: currentEmployee?.team_id || '',
        responsible_name: isRoteiro ? '' : (currentEmployee?.name || ''),
        responsible_avatar: isRoteiro ? '' : (currentEmployee?.avatar || currentEmployee?.profile_avatar_url || ''),
        responsible_user_id: isRoteiro ? '' : (currentEmployee?.user_id || ''),
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
        quadro_user_id: '',
        quadro_column_id: '',
      });
    }
    setCreativeData({ post_type: 'feed', caption: '', files: [] });
    setActiveTab('principal');
  }, [task, defaultClientId, currentEmployee, isRoteiro, allColumns]);

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
        const movingToProgress = formData.status === 'progress' && task.status !== 'progress';
        const movingFromProgress = task.status === 'progress' && formData.status !== 'progress';

        if (movingToProgress) {
          // Start a new time tracking session
          try {
            await supabase.from('task_time_tracking').insert({
              task_id: task.id,
              user_id: authUserId || user?.id,
              company_id: companyId,
            });
          } catch (e) {
            console.error('Auto-start time tracking failed:', e);
          }
        } else if (movingFromProgress) {
          // Stop any active session for this task
          try {
            const { data: activeSessions } = await supabase
              .from('task_time_tracking')
              .select('id')
              .eq('task_id', task.id)
              .is('ended_at', null);
            if (activeSessions && activeSessions.length > 0) {
              await supabase
                .from('task_time_tracking')
                .update({ ended_at: new Date().toISOString() })
                .in('id', activeSessions.map(s => s.id));
            }
          } catch (e) {
            console.error('Auto-stop time tracking failed:', e);
          }
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex flex-col items-center gap-1 px-2 py-3 rounded-lg w-16 transition-colors text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                      <span className={`w-5 h-5 rounded-full ${current.color} shrink-0`} />
                      <span className="leading-tight text-center text-[10px]">{current.label}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-52 p-1">
                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Alterar Status</div>
                    {statusOptions.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setFormData(prev => ({ ...prev, status: s.value }))}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          formData.status === s.value
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                        {s.label}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              );
            })()}

            <div className="flex-1" />

            {isRoteiro && onDelete && task && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onDelete}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-lg w-16 text-destructive hover:bg-destructive/10 transition-colors text-xs"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="leading-tight">Excluir</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Excluir atividade</TooltipContent>
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
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} disabled={ZOOM_LEVELS.indexOf(zoomWidth) <= 0}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Diminuir</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} disabled={ZOOM_LEVELS.indexOf(zoomWidth) >= ZOOM_LEVELS.length - 1}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Aumentar</TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4" />
                </Button>
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
                          <div>
                            <Label className="text-sm font-semibold">Categoria</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1.5">
                                  {formData.categoria_id
                                    ? categorias.find(c => c.id === formData.categoria_id)?.nome || "Selecione..."
                                    : "Selecione..."}
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0" align="start">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar categoria..."
                                    value={categoriaSearch}
                                    onChange={(e) => setCategoriaSearch(e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  <div
                                    className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted text-muted-foreground"
                                    onClick={() => { setFormData(prev => ({ ...prev, categoria_id: '' })); setCategoriaSearch(''); }}
                                  >
                                    Nenhuma
                                  </div>
                                  {categorias
                                    .filter(c => c.nome.toLowerCase().includes(categoriaSearch.toLowerCase()))
                                    .map(c => (
                                      <div
                                        key={c.id}
                                        className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${formData.categoria_id === c.id ? 'bg-primary/10 text-primary' : ''}`}
                                        onClick={() => { setFormData(prev => ({ ...prev, categoria_id: c.id })); setCategoriaSearch(''); }}
                                      >
                                        {c.nome}
                                      </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t">
                                  <div className="flex gap-1">
                                    <Input
                                      placeholder="Nova categoria..."
                                      value={newCategoriaName}
                                      onChange={(e) => setNewCategoriaName(e.target.value)}
                                      className="h-8 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoriaName.trim()) {
                                          e.preventDefault();
                                          createCategoria.mutateAsync(newCategoriaName.trim()).then((created) => {
                                            if (created) setFormData(prev => ({ ...prev, categoria_id: created.id }));
                                            setNewCategoriaName('');
                                          });
                                        }
                                      }}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      disabled={!newCategoriaName.trim()}
                                      onClick={() => {
                                        createCategoria.mutateAsync(newCategoriaName.trim()).then((created) => {
                                          if (created) setFormData(prev => ({ ...prev, categoria_id: created.id }));
                                          setNewCategoriaName('');
                                        });
                                      }}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Classificação</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1.5">
                                  {formData.classificacao_id
                                    ? classificacoes.find(c => c.id === formData.classificacao_id)?.nome || "Selecione..."
                                    : "Selecione..."}
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0" align="start">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar classificação..."
                                    value={classificacaoSearch}
                                    onChange={(e) => setClassificacaoSearch(e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  <div
                                    className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted text-muted-foreground"
                                    onClick={() => { setFormData(prev => ({ ...prev, classificacao_id: '' })); setClassificacaoSearch(''); }}
                                  >
                                    Nenhuma
                                  </div>
                                  {classificacoes
                                    .filter(c => c.nome.toLowerCase().includes(classificacaoSearch.toLowerCase()))
                                    .map(c => (
                                      <div
                                        key={c.id}
                                        className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${formData.classificacao_id === c.id ? 'bg-primary/10 text-primary' : ''}`}
                                        onClick={() => { setFormData(prev => ({ ...prev, classificacao_id: c.id })); setClassificacaoSearch(''); }}
                                      >
                                        {c.nome}
                                      </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t">
                                  <div className="flex gap-1">
                                    <Input
                                      placeholder="Nova classificação..."
                                      value={newClassificacaoName}
                                      onChange={(e) => setNewClassificacaoName(e.target.value)}
                                      className="h-8 text-sm"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newClassificacaoName.trim()) {
                                          e.preventDefault();
                                          createClassificacao.mutateAsync(newClassificacaoName.trim()).then((created) => {
                                            if (created) setFormData(prev => ({ ...prev, classificacao_id: created.id }));
                                            setNewClassificacaoName('');
                                          });
                                        }
                                      }}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      disabled={!newClassificacaoName.trim()}
                                      onClick={() => {
                                        createClassificacao.mutateAsync(newClassificacaoName.trim()).then((created) => {
                                          if (created) setFormData(prev => ({ ...prev, classificacao_id: created.id }));
                                          setNewClassificacaoName('');
                                        });
                                      }}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
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
                            <Select
                              value={formData.responsible_name}
                              onValueChange={(value) => {
                                const employee = employees?.find(e => e.name === value);
                                const empUserId = employee?.user_id || '';
                                setFormData(prev => ({
                                  ...prev,
                                  responsible_name: value,
                                  responsible_avatar: employee?.avatar || employee?.profile_avatar_url || '',
                                  responsible_user_id: empUserId,
                                  quadro_user_id: empUserId,
                                  quadro_column_id: '',
                                }));
                              }}
                            >
                              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {employees?.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.name}>{employee.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1.5">
                                  {formData.related_client_id
                                    ? clients?.find(c => c.id === formData.related_client_id)?.name || "Selecione..."
                                    : "Nenhum cliente"}
                                  <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <div className="p-2 border-b">
                                  <Input
                                    placeholder="Buscar cliente..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                  <div
                                    className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, related_client_id: '', related_campaign_id: '' }));
                                      setClientSearch('');
                                    }}
                                  >
                                    Nenhum cliente
                                  </div>
                                  {sortedFilteredClients.map((client) => (
                                    <div
                                      key={client.id}
                                      className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${formData.related_client_id === client.id ? 'bg-primary/10 text-primary' : ''}`}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, related_client_id: client.id, related_campaign_id: '' }));
                                        setClientSearch('');
                                      }}
                                    >
                                      {client.name}
                                    </div>
                                  ))}
                                  {sortedFilteredClients.length === 0 && clientSearch && (
                                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">Nenhum cliente encontrado</div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
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
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Checklist</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adicione itens de checklist para esta {isRoteiro ? 'atividade' : 'tarefa'}.
                      </p>
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
                    <TaskSubtasksTab taskId={task?.id || null} />
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
    </>
  );
}
