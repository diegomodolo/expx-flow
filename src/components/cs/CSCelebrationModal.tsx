import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { PartyPopper, MessageCircle, Mail, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ClientMilestone } from "@/hooks/useClientMilestones";

interface CSCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: ClientMilestone;
  onSend: (method: 'whatsapp' | 'email' | 'both') => void;
}

const celebrationTemplates: Record<string, string> = {
  onboarding: `🎉 Parabéns! O onboarding foi concluído com sucesso!

Estamos muito felizes em ter você como parceiro. Agora é hora de colher os resultados!

Próximos passos:
✅ Monitorar as primeiras campanhas
✅ Acompanhar métricas semanalmente
✅ Agendar nossa primeira QBR

Qualquer dúvida, estamos à disposição! 🚀`,

  first_campaign: `🚀 Primeira campanha no ar!

Sua primeira campanha já está rodando! Este é um marco importante na nossa parceria.

Fique de olho:
📊 Vamos monitorar os resultados nas próximas 48h
📈 Otimizações serão feitas conforme necessário
📞 Entraremos em contato com os primeiros resultados

Bora escalar! 💪`,

  first_lead: `🎯 Primeiro lead conquistado!

Celebramos junto com você: o primeiro lead já chegou!

Isso significa que:
✅ As campanhas estão funcionando
✅ O público está engajando
✅ Os resultados virão em escala

Continue acompanhando pelo dashboard. Vamos juntos! 🏆`,

  monthly_goal: `🏆 Meta mensal atingida!

Parabéns! Você bateu a meta do mês!

Resultados do período:
📈 Meta atingida
💰 ROI positivo
🎯 Campanhas otimizadas

Vamos celebrar e planejar o próximo mês ainda maior! 🚀`,

  quarterly_goal: `🏅 Meta trimestral conquistada!

Que trimestre incrível! Você atingiu todas as metas!

Destaques:
🎯 Todas as metas batidas
📊 Crescimento consistente
🤝 Parceria fortalecida

Já está na hora de pensar em expansão? Vamos conversar! 💼`,

  custom: `🎉 Conquista desbloqueada!

Mais um marco importante na nossa jornada juntos!

Parabéns por essa conquista. Continue assim que os resultados só vão crescer!

Estamos aqui para apoiar no que precisar. 🚀`,
};

export function CSCelebrationModal({ open, onOpenChange, milestone, onSend }: CSCelebrationModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  const [message, setMessage] = useState(
    celebrationTemplates[milestone.milestoneType] || celebrationTemplates.custom
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSend(channel);
    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            Celebrar Conquista
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem de celebração para o cliente comemorando a conquista: <strong>{milestone.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label>Canal de envio</Label>
            <RadioGroup
              value={channel}
              onValueChange={(value) => setChannel(value as 'whatsapp' | 'email' | 'both')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="flex items-center gap-1 cursor-pointer">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  WhatsApp
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="cursor-pointer">
                  Ambos
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Message Preview */}
          <div className="space-y-3">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none font-mono text-sm"
            />
          </div>

          {/* Preview Card */}
          <Card className="p-4 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Preview da mensagem:</p>
            <div className="whitespace-pre-wrap text-sm">
              {message}
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>Enviando...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Celebração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
