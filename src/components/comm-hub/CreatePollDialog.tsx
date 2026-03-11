import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
}

export function CreatePollDialog({
  open,
  onOpenChange,
  channelId,
}: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const validOptions = options.filter((o) => o.trim());
  const canCreate = question.trim() && validOptions.length >= 2;

  const handleCreate = async () => {
    if (!canCreate || !channelId || !user?.id) return;

    setSending(true);
    try {
      // Create the message first
      const pollContent = `📊 **Enquete:** ${question.trim()}`;
      const { data: msgData, error: msgError } = await supabase
        .from("internal_messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: pollContent,
        })
        .select("id")
        .single();

      if (msgError) throw msgError;

      // Create the poll
      const { error: pollError } = await supabase
        .from("internal_polls")
        .insert({
          message_id: msgData.id,
          channel_id: channelId,
          question: question.trim(),
          options: validOptions.map((o) => o.trim()),
          allow_multiple: allowMultiple,
          is_anonymous: isAnonymous,
          created_by: user.id,
        });

      if (pollError) throw pollError;

      toast.success("Enquete criada!");
      queryClient.invalidateQueries({
        queryKey: ["internal-messages", channelId],
      });
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      setIsAnonymous(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating poll:", err);
      toast.error("Erro ao criar enquete");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar uma enquete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Pergunta</Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Qual é a sua pergunta?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Opções</Label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Opção ${i + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      aria-label="Fechar"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(i)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Adicionar opção
              </Button>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="allow-multiple"
                className="text-sm cursor-pointer"
              >
                Permitir múltiplas respostas
              </Label>
              <Switch
                id="allow-multiple"
                checked={allowMultiple}
                onCheckedChange={setAllowMultiple}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is-anonymous" className="text-sm cursor-pointer">
                Votação anônima
              </Label>
              <Switch
                id="is-anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Criar enquete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
