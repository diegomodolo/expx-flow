import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMeetMeeting } from "@/hooks/useGoogleMeetMeetings";
import { X, Plus, UserPlus, Mail } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface Participant {
  email: string;
  name: string;
  type: "employee" | "client_contact" | "custom";
}

interface EditMeetingModalProps {
  meeting: GoogleMeetMeeting;
  open: boolean;
  onClose: () => void;
  onSubmit: (
    meetingId: string,
    data: {
      title?: string;
      clientId?: string | null;
      squadId?: string | null;
      scheduledAt?: string | null;
    },
  ) => Promise<boolean>;
}

export function EditMeetingModal({
  meeting,
  open,
  onClose,
  onSubmit,
}: EditMeetingModalProps) {
  const { activeCompany } = useCompany();
  const [title, setTitle] = useState(meeting.title);
  const [clientId, setClientId] = useState(meeting.client_id || "");
  const [squadId, setSquadId] = useState(meeting.squad_id || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(meeting.title);
    setClientId(meeting.client_id || "");
    setSquadId(meeting.squad_id || "");
    if (meeting.scheduled_at) {
      const d = new Date(meeting.scheduled_at);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      setScheduledAt(local.toISOString().slice(0, 16));
    } else {
      setScheduledAt("");
    }
  }, [open, meeting]);

  const { data: { clients = [], teams = [] } = {} } = useQuery({
    queryKey: ["meeting-modal-data", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return { clients: [], teams: [] };
      const [clientsRes, teamsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name")
          .eq("company_id", activeCompany.company_id)
          .order("name")
          .limit(100),
        supabase
          .from("teams")
          .select("id, name")
          .eq("company_id", activeCompany.company_id)
          .order("name")
          .limit(100),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (teamsRes.error) throw teamsRes.error;

      return {
        clients: clientsRes.data || [],
        teams: teamsRes.data || [],
      };
    },
    enabled: open && !!activeCompany?.company_id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const scheduledAtUTC = scheduledAt
      ? new Date(scheduledAt).toISOString()
      : null;

    const success = await onSubmit(meeting.id, {
      title: title.trim(),
      clientId: clientId || null,
      squadId: squadId || null,
      scheduledAt: scheduledAtUTC,
    });

    setSaving(false);
    if (success) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Reunião</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
                <SelectItem value="none">Nenhum</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
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
                <SelectItem value="none">Nenhum</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-scheduledAt">Data/Hora</Label>
            <Input
              id="edit-scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
