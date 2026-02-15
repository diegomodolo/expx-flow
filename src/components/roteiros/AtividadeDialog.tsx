import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RoteiroAtividade, AtividadeInput } from '@/hooks/useRoteiroAtividades';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';

interface AtividadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AtividadeInput) => void;
  atividade?: RoteiroAtividade | null;
  loading?: boolean;
}

const TASK_TYPES = [
  { value: 'tarefa', label: 'Tarefa' },
  { value: 'historia', label: 'História' },
  { value: 'bug', label: 'Bug' },
  { value: 'melhoria', label: 'Melhoria' },
];

export function AtividadeDialog({ open, onOpenChange, onSave, atividade, loading }: AtividadeDialogProps) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

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

  // Fetch employees for selects
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-roteiro', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('employees').select('id, name, user_id').eq('company_id', companyId).eq('status', 'active').order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch all board columns for this company, grouped by user_id
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

  // Employees that have boards (have columns)
  const employeesWithBoards = employees.filter(emp =>
    emp.user_id && allColumns.some(col => col.user_id === emp.user_id)
  );

  // Columns filtered by selected quadro (employee user_id)
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
      // Derive quadroUserId from the column
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
  }, [atividade, open, allColumns]);

  const handleSave = () => {
    if (!titulo.trim()) return;
    // Derive etapa name from selected column
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{atividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título da atividade" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início após (dias)</Label>
                <Input type="number" min={0} value={inicioAposDias} onChange={e => setInicioAposDias(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (dias)</Label>
                <Input type="number" min={1} value={duracaoDias} onChange={e => setDuracaoDias(Number(e.target.value))} />
              </div>
              <div>
                <Label>Fluxo</Label>
                <Input value={fluxo} onChange={e => setFluxo(e.target.value)} placeholder="Nome do fluxo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quadro</Label>
                <Select
                  value={quadroUserId || ''}
                  onValueChange={v => {
                    setQuadroUserId(v || null);
                    setQuadroColumnId(null); // reset etapa when board changes
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o quadro..." /></SelectTrigger>
                  <SelectContent>
                    {employeesWithBoards.map(e => (
                      <SelectItem key={e.user_id} value={e.user_id!}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Select
                  value={quadroColumnId || ''}
                  onValueChange={v => setQuadroColumnId(v || null)}
                  disabled={!quadroUserId}
                >
                  <SelectTrigger><SelectValue placeholder={quadroUserId ? "Selecione a etapa..." : "Selecione o quadro primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {filteredColumns.map(col => (
                      <SelectItem key={col.id} value={col.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                          {col.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsável</Label>
                <Select value={responsavelId || ''} onValueChange={v => setResponsavelId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Autorizador</Label>
                <Select value={autorizadorId || ''} onValueChange={v => setAutorizadorId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição detalhada" rows={3} />
            </div>
            <div>
              <Label>Checklist</Label>
              <div className="space-y-2 mt-1">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm flex-1">{item}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    placeholder="Novo item..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                    className="text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={addCheckItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
