import { useState, useEffect, useRef } from 'react';
import { ClipboardList, BarChart3, MessageSquarePlus, Paperclip, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const COMMANDS: SlashCommand[] = [
  { id: 'tarefa', label: '/tarefa', description: 'Criar uma nova tarefa a partir do chat', icon: ClipboardList },
  { id: 'enquete', label: '/enquete', description: 'Criar uma enquete no canal', icon: BarChart3 },
  { id: 'topico', label: '/tópico', description: 'Iniciar um novo tópico de discussão', icon: MessageSquarePlus },
  { id: 'arquivo', label: '/arquivo', description: 'Enviar um arquivo', icon: Paperclip },
  { id: 'mao', label: '/mão', description: 'Levantar a mão para pedir atenção', icon: Hand },
];

interface SlashCommandMenuProps {
  query: string; // text after "/"
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  visible: boolean;
}

export function SlashCommandMenu({ query, onSelect, onClose, visible }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(cmd =>
    cmd.id.includes(query.toLowerCase()) || cmd.label.includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-1 w-72 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">Comandos</span>
      </div>
      <div className="py-1">
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cmd.label}</p>
                <p className="text-xs text-muted-foreground">{cmd.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
