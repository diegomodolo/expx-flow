import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Home, ShieldCheck, CheckSquare, X, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RoteiroAtividade, AtividadeInput } from '@/hooks/useRoteiroAtividades';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { useEmployeePermissions } from '@/hooks/useEmployeePermissions';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AtividadeInput) => void;
  atividade?: RoteiroAtividade | null;
  loading?: boolean;
  onDelete?: () => void;
}

const TASK_TYPES = [
  { value: 'tarefa', label: 'Tarefa' },
  { value: 'historia', label: 'História' },
  { value: 'bug', label: 'Bug' },
  { value: 'melhoria', label: 'Melhoria' },
];

type SidebarTab = 'principal' | 'autorizador' | 'checklist';

export function AtividadeDialog({ open, onOpenChange, onSave, atividade, loading, onDelete }: AtividadeDialogProps) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const { user } = useAuth();
  const { hasPermission, isOwner } = useEmployeePermissions();

  const [activeTab, setActiveTab] = useState<SidebarTab>('principal');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<string>('tarefa');
  const [inicioAposDias, setInicioAposDias] = useState(0);
  const [duracaoDias, setDuracaoDias] = useState(1);
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [quadroUserId, setQuadroUserId] = useState<string | null>(null);
  const [quadroColumnId, setQuadroColumnId] = useState<string | null>(null);
  const [fluxo, setFluxo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [autorizadorId, setAutorizadorId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Check if user is manager (owner/admin)
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

  const canViewOthersBoards = isOwner || isManager || hasPermission('ver-quadros-outros');

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-roteiro', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('employees').select('id, name, user_id').eq('company_id', companyId).eq('status', 'active').order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch board columns
  const { data: allColumns = [] } = useQuery({
    queryKey: ['all-board-columns', companyId, canViewOthersBoards, user?.id],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('task_board_columns' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('order_index', { ascending: true });

      if (!canViewOthersBoards && user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data } = await (query as any);
      return (data || []) as Array<{ id: string; user_id: string; name: string; color: string; order_index: number }>;
    },
    enabled: !!companyId,
  });

  const employeesWithBoards = employees.filter(emp =>
    emp.user_id && allColumns.some(col => col.user_id === emp.user_id)
  );

  const filteredColumns = quadroUserId
    ? allColumns.filter(col => col.user_id === quadroUserId)
    : [];

  useEffect(() => {
    if (atividade) {
      setTitulo(atividade.titulo);
      setTipo(atividade.tipo || 'tarefa');
      setInicioAposDias(atividade.inicio_apos_dias || 0);
      setDuracaoDias(atividade.duracao_dias || 1);
      setResponsavelId(atividade.responsavel_id);
      setFluxo(atividade.fluxo || '');
      setDescricao(atividade.descricao || '');
      setAutorizadorId(atividade.autorizador_id);
      setChecklistItems(Array.isArray(atividade.checklist) ? atividade.checklist.map((c: any) => typeof c === 'string' ? c : c.text || '') : []);
      setQuadroColumnId(atividade.quadro_column_id);
      if (atividade.quadro_column_id) {
        const col = allColumns.find(c => c.id === atividade.quadro_column_id);
        if (col) setQuadroUserId(col.user_id);
      } else {
        setQuadroUserId(null);
      }
    } else {
      setTitulo(''); setTipo('tarefa'); setInicioAposDias(0); setDuracaoDias(1);
      setResponsavelId(null); setFluxo(''); setDescricao('');
      setAutorizadorId(null); setChecklistItems([]);
      setQuadroUserId(null); setQuadroColumnId(null);
    }
    setActiveTab('principal');
  }, [atividade, open, allColumns]);

  const handleSave = () => {
    if (!titulo.trim()) return;
    const selectedCol = allColumns.find(c => c.id === quadroColumnId);
    onSave({
      titulo: titulo.trim(),
      tipo,
      inicio_apos_dias: inicioAposDias,
      duracao_dias: duracaoDias,
      responsavel_id: responsavelId,
      quadro_column_id: quadroColumnId,
      etapa: selectedCol?.name || null,
      fluxo: fluxo || null,
      descricao: descricao || null,
      autorizador_id: autorizadorId,
      checklist: checklistItems.filter(Boolean).map(text => ({ text, checked: false })),
    });
  };

  const addCheckItem = () => {
    if (newCheckItem.trim()) {
      setChecklistItems([...checklistItems, newCheckItem.trim()]);
      setNewCheckItem('');
    }
  };

  const responsavelName = employees.find(e => e.id === responsavelId)?.name;

  const sidebarItems = [
    { id: 'principal' as SidebarTab, label: 'Principal', icon: Home },
    { id: 'autorizador' as SidebarTab, label: 'Autorizador', icon: ShieldCheck },
    { id: 'checklist' as SidebarTab, label: 'Checklist', icon: CheckSquare },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[80vh]">
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

            <div className="flex-1" />

            {onDelete && atividade && (
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
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {titulo ? titulo.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {titulo || 'Sem Título'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {atividade ? 'Editando atividade' : 'Nova atividade'}
                  {responsavelName && ` · ${responsavelName}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
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
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        placeholder="Título da atividade"
                        className="mt-1.5"
                      />
                    </div>

                    {/* Tipo / Início / Duração */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Tipo</Label>
                        <Select value={tipo} onValueChange={setTipo}>
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
                          value={inicioAposDias}
                          onChange={e => setInicioAposDias(Number(e.target.value))}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Duração</Label>
                        <Input
                          type="number"
                          min={1}
                          value={duracaoDias}
                          onChange={e => setDuracaoDias(Number(e.target.value))}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* Responsável / Kanban Quadro / Kanban Etapa */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Responsável</Label>
                        <Select value={responsavelId || ''} onValueChange={v => setResponsavelId(v || null)}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Kanban Quadro</Label>
                        <Select
                          value={quadroUserId || ''}
                          onValueChange={v => {
                            setQuadroUserId(v || null);
                            setQuadroColumnId(null);
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
                        <Label className="text-sm font-semibold">Kanban Etapa</Label>
                        <Select
                          value={quadroColumnId || ''}
                          onValueChange={v => setQuadroColumnId(v || null)}
                          disabled={!quadroUserId}
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

                    {/* Fluxo */}
                    <div>
                      <Label className="text-sm font-semibold">Fluxo</Label>
                      <Input value={fluxo} onChange={e => setFluxo(e.target.value)} placeholder="Nome do fluxo" className="mt-1.5" />
                    </div>

                    <Separator />

                    {/* Descrição */}
                    <div>
                      <Label className="text-sm font-semibold">Descrição</Label>
                      <Textarea
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Descrição detalhada da atividade..."
                        rows={5}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'autorizador' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Autorizador</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecione quem deve autorizar esta atividade antes de ser executada.
                      </p>
                      <Select value={autorizadorId || ''} onValueChange={v => setAutorizadorId(v || null)}>
                        <SelectTrigger><SelectValue placeholder="Selecione o autorizador..." /></SelectTrigger>
                        <SelectContent>
                          {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Checklist</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adicione itens de checklist para esta atividade.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {checklistItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                          <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1">{item}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newCheckItem}
                        onChange={e => setNewCheckItem(e.target.value)}
                        placeholder="Novo item do checklist..."
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                      />
                      <Button variant="outline" size="icon" onClick={addCheckItem}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button onClick={handleSave} disabled={!titulo.trim() || loading} className="gap-2">
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
