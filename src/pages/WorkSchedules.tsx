import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkSchedules, WorkSchedule } from "@/hooks/useWorkSchedules";
import { useEmployees } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Plus, Edit, Trash2, Users, ArrowLeft, Coffee, Sun, Sunset } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatTime(t: string) {
  return t?.substring(0, 5) || "00:00";
}

function calcWorkHours(ws: WorkSchedule) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const totalMin = (toMin(ws.work_end) - toMin(ws.work_start)) - (toMin(ws.lunch_end) - toMin(ws.lunch_start));
  return (totalMin / 60).toFixed(1);
}

export default function WorkSchedulesPage() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, assignScheduleToEmployee, fetchSchedules } = useWorkSchedules();
  const { employees, fetchEmployees } = useEmployees();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState({ name: "", work_start: "08:00", lunch_start: "12:00", lunch_end: "13:00", work_end: "17:00" });
  const [bulkScheduleId, setBulkScheduleId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const handleBulkAssign = async () => {
    if (!bulkScheduleId) return;
    setBulkAssigning(true);
    try {
      const activeEmployees = employees.filter((e: unknown) => e.status === "active");
      for (const emp of activeEmployees) {
        await assignScheduleToEmployee(emp.id, bulkScheduleId === "none" ? null : bulkScheduleId);
      }
      await fetchEmployees();
      toast({ title: `Carga horária aplicada a ${activeEmployees.length} colaborador(es)` });
    } catch {
      toast({ title: "Erro ao aplicar em massa", variant: "destructive" });
    } finally {
      setBulkAssigning(false);
    }
  };

  const openCreate = () => {
    setEditingSchedule(null);
    setForm({ name: "", work_start: "08:00", lunch_start: "12:00", lunch_end: "13:00", work_end: "17:00" });
    setDialogOpen(true);
  };

  const openEdit = (ws: WorkSchedule) => {
    setEditingSchedule(ws);
    setForm({
      name: ws.name,
      work_start: formatTime(ws.work_start),
      lunch_start: formatTime(ws.lunch_start),
      lunch_end: formatTime(ws.lunch_end),
      work_end: formatTime(ws.work_end),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, form);
        toast({ title: "Carga horária atualizada" });
      } else {
        await createSchedule(form);
        toast({ title: "Carga horária criada" });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule(deleteTarget.id);
      toast({ title: "Carga horária excluída" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleAssign = async (employeeId: string, scheduleId: string) => {
    try {
      await assignScheduleToEmployee(employeeId, scheduleId === "none" ? null : scheduleId);
      await fetchEmployees();
      toast({ title: "Carga horária associada" });
    } catch {
      toast({ title: "Erro ao associar", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/colaboradores")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Clock className="text-primary w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cargas Horárias</h1>
              <p className="text-muted-foreground text-sm">Defina horários de trabalho e associe aos colaboradores</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Carga Horária
          </Button>
        </div>

        {/* Schedule cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map(ws => {
            const assignedEmployees = employees.filter((e: unknown) => e.work_schedule_id === ws.id);
            return (
              <Card key={ws.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{ws.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ws)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(ws)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Início: <strong className="text-foreground">{formatTime(ws.work_start)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sunset className="w-3.5 h-3.5 text-orange-500" />
                      <span>Fim: <strong className="text-foreground">{formatTime(ws.work_end)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <Coffee className="w-3.5 h-3.5 text-primary" />
                      <span>Almoço: <strong className="text-foreground">{formatTime(ws.lunch_start)} — {formatTime(ws.lunch_end)}</strong></span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{calcWorkHours(ws)}h úteis/dia</Badge>
                  {assignedEmployees.length > 0 && (
                    <div className="flex items-center gap-1 pt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{assignedEmployees.length} colaborador(es)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!loading && schedules.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma carga horária cadastrada. Crie a primeira!
            </div>
          )}
        </div>

        {/* Employee assignment */}
        {schedules.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Associar Colaboradores
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={bulkScheduleId}
                    onValueChange={setBulkScheduleId}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Selecionar carga horária..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem carga horária</SelectItem>
                      {schedules.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!bulkScheduleId || bulkAssigning}
                    onClick={handleBulkAssign}
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {bulkAssigning ? "Aplicando..." : "Aplicar a todos"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {employees.filter(e => e.status === "active").map((emp: unknown) => (
                  <div key={emp.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.profile_avatar_url || emp.avatar} />
                        <AvatarFallback className="text-xs">{emp.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                      </div>
                    </div>
                    <Select
                      value={emp.work_schedule_id || "none"}
                      onValueChange={(v) => handleAssign(emp.id, v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem carga horária</SelectItem>
                        {schedules.map(ws => (
                          <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar Carga Horária" : "Nova Carga Horária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Horário Comercial"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-500" /> Início do expediente</Label>
                <Input type="time" value={form.work_start} onChange={e => setForm(f => ({ ...f, work_start: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Sunset className="w-3.5 h-3.5 text-orange-500" /> Fim do expediente</Label>
                <Input type="time" value={form.work_end} onChange={e => setForm(f => ({ ...f, work_end: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5 text-primary" /> Início do almoço</Label>
                <Input type="time" value={form.lunch_start} onChange={e => setForm(f => ({ ...f, lunch_start: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5 text-primary" /> Fim do almoço</Label>
                <Input type="time" value={form.lunch_end} onChange={e => setForm(f => ({ ...f, lunch_end: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingSchedule ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Carga Horária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Colaboradores associados ficarão sem carga horária.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
