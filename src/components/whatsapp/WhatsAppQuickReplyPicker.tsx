import React, { useState, useEffect, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Zap, FileText, Image, Video, Mic, File } from 'lucide-react';
import { QuickReply } from '@/hooks/useWhatsAppQuickReplies';

interface WhatsAppQuickReplyPickerProps {
  quickReplies: QuickReply[];
  isLoading: boolean;
  onSelect: (quickReply: QuickReply) => void;
  searchTerm?: string;
  showAsPopover?: boolean;
  onClose?: () => void;
}

const getTypeIcon = (type: QuickReply['type']) => {
  switch (type) {
    case 'text':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'image':
      return <Image className="h-4 w-4 text-blue-500" />;
    case 'video':
      return <Video className="h-4 w-4 text-purple-500" />;
    case 'audio':
    case 'myaudio':
    case 'ptt':
      return <Mic className="h-4 w-4 text-green-500" />;
    case 'document':
      return <File className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTypeLabel = (type: QuickReply['type']) => {
  switch (type) {
    case 'text': return 'Texto';
    case 'image': return 'Imagem';
    case 'video': return 'Vídeo';
    case 'audio': return 'Áudio';
    case 'myaudio': return 'Áudio';
    case 'ptt': return 'Áudio';
    case 'document': return 'Documento';
    default: return type;
  }
};

export const WhatsAppQuickReplyPicker: React.FC<WhatsAppQuickReplyPickerProps> = ({
  quickReplies,
  isLoading,
  onSelect,
  searchTerm = '',
  showAsPopover = true,
  onClose
}) => {
  const [open, setOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const filteredReplies = quickReplies.filter(qr => {
    const search = (searchTerm || internalSearch).toLowerCase();
    if (!search) return true;
    return (
      qr.shortCut.toLowerCase().includes(search) ||
      (qr.text && qr.text.toLowerCase().includes(search))
    );
  });

  const handleSelect = (quickReply: QuickReply) => {
    onSelect(quickReply);
    setOpen(false);
    onClose?.();
  };

  const commandContent = (
    <Command className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder="Buscar atalho..." 
        value={searchTerm || internalSearch}
        onValueChange={setInternalSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Carregando...' : 'Nenhuma resposta rápida encontrada'}
        </CommandEmpty>
        <CommandGroup heading="Respostas Rápidas">
          {filteredReplies.map((qr) => (
            <CommandItem
              key={qr.id}
              value={qr.shortCut}
              onSelect={() => handleSelect(qr)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getTypeIcon(qr.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">/{qr.shortCut}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {getTypeLabel(qr.type)}
                  </span>
                  {qr.onWhatsApp && (
                    <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                      WhatsApp
                    </span>
                  )}
                </div>
                {qr.text && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {qr.text}
                  </p>
                )}
                {qr.type !== 'text' && qr.docName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📎 {qr.docName}
                  </p>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (!showAsPopover) {
    return commandContent;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Respostas rápidas"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        {commandContent}
      </PopoverContent>
    </Popover>
  );
};
