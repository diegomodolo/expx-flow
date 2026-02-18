import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; clientId?: string; squadId?: string; scheduledAt?: string }) => Promise<any>;
  creating: boolean;
}

export function CreateMeetingModal({ open, onClose, onSubmit, creating }: CreateMeetingModalProps) {
  const { activeCompany } = useCompany();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [squadId, setSquadId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open || !activeCompany?.company_id) return;
    
    const fetchData = async () => {
      const [clientsRes, teamsRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('company_id', activeCompany.company_id).order('name'),
        supabase.from('teams').select('id, name').eq('company_id', activeCompany.company_id).order('name'),
      ]);
      setClients(clientsRes.data || []);
      setTeams(teamsRes.data || []);
    };
    fetchData();
  }, [open, activeCompany?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const result = await onSubmit({
      title: title.trim(),
      clientId: clientId || undefined,
      squadId: squadId || undefined,
      scheduledAt: scheduledAt || undefined,
    });

    if (result) {
      setTitle("");
      setClientId("");
      setSquadId("");
      setScheduledAt("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reunião Google Meet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Squad</Label>
            <Select value={squadId} onValueChange={setSquadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar squad (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Data/Hora</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating ? "Criando..." : "Criar Reunião"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
