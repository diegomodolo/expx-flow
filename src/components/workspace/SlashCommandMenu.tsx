import { useEffect, useRef, useState } from "react";
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'divider') => void;
  position: { top: number; left: number };
  filter: string;
}

const commands = [
  { type: 'paragraph' as const, label: 'Texto', description: 'Bloco de texto simples', icon: Type, keywords: ['text', 'paragraph', 'texto'] },
  { type: 'heading1' as const, label: 'Título 1', description: 'Título grande', icon: Heading1, keywords: ['h1', 'heading', 'titulo', 'title'] },
  { type: 'heading2' as const, label: 'Título 2', description: 'Título médio', icon: Heading2, keywords: ['h2', 'heading', 'titulo', 'title'] },
  { type: 'heading3' as const, label: 'Título 3', description: 'Título pequeno', icon: Heading3, keywords: ['h3', 'heading', 'titulo', 'title'] },
  { type: 'bullet' as const, label: 'Lista', description: 'Lista com marcadores', icon: List, keywords: ['bullet', 'list', 'lista', 'ul'] },
  { type: 'numbered' as const, label: 'Lista Numerada', description: 'Lista numerada', icon: ListOrdered, keywords: ['number', 'ordered', 'list', 'ol', 'numerada'] },
  { type: 'todo' as const, label: 'Lista de Tarefas', description: 'Lista com checkboxes', icon: CheckSquare, keywords: ['todo', 'task', 'checkbox', 'tarefa', 'check'] },
  { type: 'quote' as const, label: 'Citação', description: 'Bloco de citação', icon: Quote, keywords: ['quote', 'blockquote', 'citacao'] },
  { type: 'divider' as const, label: 'Divisor', description: 'Linha divisória', icon: Minus, keywords: ['divider', 'line', 'hr', 'divisor'] },
];

export function SlashCommandMenu({ open, onClose, onSelect, position, filter }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter(cmd => {
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();
    return cmd.label.toLowerCase().includes(searchTerm) ||
           cmd.keywords.some(k => k.includes(searchTerm));
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredCommands, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (open) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-1 w-64 max-h-80 overflow-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
        Blocos básicos
      </div>
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.type}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
            index === selectedIndex ? "bg-accent" : "hover:bg-muted"
          )}
          onClick={() => onSelect(cmd.type)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="h-10 w-10 rounded-md border bg-background flex items-center justify-center">
            <cmd.icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">{cmd.label}</div>
            <div className="text-xs text-muted-foreground">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}