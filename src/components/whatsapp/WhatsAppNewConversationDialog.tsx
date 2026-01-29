import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppNewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  instanceId: string;
  onConversationCreated?: (conversationId: string) => void;
}

export function WhatsAppNewConversationDialog({
  isOpen,
  onClose,
  companyId,
  instanceId,
  onConversationCreated,
}: WhatsAppNewConversationDialogProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const formatPhoneForDisplay = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    return digits;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneForDisplay(value));
  };

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) {
      toast.error("Preencha o número e a mensagem");
      return;
    }

    // Validate phone number (at least 10 digits for Brazilian numbers)
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Número de telefone inválido. Use DDD + número (ex: 21999999999)");
      return;
    }

    setIsSending(true);

    try {
      // Format phone with country code if not present
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      // First, check if conversation already exists
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("instance_id", instanceId)
        .eq("phone", formattedPhone)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("whatsapp_conversations")
          .insert({
            company_id: companyId,
            instance_id: instanceId,
            phone: formattedPhone,
            contact_name: null,
            last_message_at: new Date().toISOString(),
            last_message_preview: message.substring(0, 100),
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Save message to database
      const now = new Date().toISOString();
      const { data: savedMessage, error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversationId,
          company_id: companyId,
          direction: "outgoing",
          content: message,
          message_type: "text",
          status: "sending",
          sent_at: now,
        })
        .select("id")
        .single();

      if (msgError) throw msgError;

      // Send via API
      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          company_id: companyId,
          recipient_phone: formattedPhone,
          message,
          notification_type: "chat",
          instance_id: instanceId,
        },
      });

      // Update message status
      const newStatus = (error || !data?.success) ? "failed" : "sent";
      await supabase
        .from("whatsapp_messages")
        .update({
          status: newStatus,
          ...(data?.message_id ? { external_id: data.message_id } : {}),
        })
        .eq("id", savedMessage.id);

      // Update conversation preview
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: now,
          last_message_preview: message.substring(0, 100),
        })
        .eq("id", conversationId);

      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao enviar mensagem");
      } else {
        toast.success("Mensagem enviada!");
        onConversationCreated?.(conversationId);
        handleClose();
      }
    } catch (err: any) {
      console.error("[WhatsAppNewConversationDialog] Error:", err);
      toast.error(err.message || "Erro ao criar conversa");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setPhone("");
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Inicie uma conversa com um novo contato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número do WhatsApp</Label>
            <Input
              id="phone"
              placeholder="21999999999"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isSending}
              maxLength={13}
            />
            <p className="text-xs text-muted-foreground">
              Digite o DDD + número (sem espaços ou caracteres especiais)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || !phone.trim() || !message.trim()}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
