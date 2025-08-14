import React, { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled 
              ? "Selecione um cliente para conversar..."
              : "Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
          }
          disabled={disabled}
          className="min-h-[50px] max-h-32 resize-none"
          rows={2}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className="px-3"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}