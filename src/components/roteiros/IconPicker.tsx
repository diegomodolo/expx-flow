import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const POPULAR_ICONS = [
  'BookOpen', 'FileText', 'CheckSquare', 'Users', 'Target', 'Zap', 'Star', 'Heart',
  'Rocket', 'Settings', 'Calendar', 'Clock', 'Mail', 'Phone', 'Globe', 'Shield',
  'Award', 'Flag', 'Briefcase', 'Camera', 'Code', 'Database', 'Edit', 'Eye',
  'Gift', 'Home', 'Image', 'Key', 'Layers', 'Layout', 'Link', 'List',
  'Map', 'Monitor', 'Music', 'Package', 'PieChart', 'Play', 'Printer', 'Search',
  'Send', 'Share', 'ShoppingCart', 'Smile', 'Speaker', 'Tag', 'Trash', 'Upload',
  'Video', 'Volume2', 'Wifi', 'Wrench', 'Activity', 'AlertCircle', 'Archive',
  'BarChart', 'Bell', 'Bold', 'Bookmark', 'Box', 'Clipboard', 'Cloud',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredIcons = useMemo(() => {
    const icons = search
      ? POPULAR_ICONS.filter(name => name.toLowerCase().includes(search.toLowerCase()))
      : POPULAR_ICONS;
    return icons;
  }, [search]);

  const SelectedIcon = (LucideIcons as any)[value] || LucideIcons.BookOpen;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <SelectedIcon className="w-4 h-4" />
          <span className="text-sm">{value || 'Selecionar ícone'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="h-48">
          <div className="grid grid-cols-6 gap-1">
            {filteredIcons.map(name => {
              const Icon = (LucideIcons as any)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors",
                    value === name && "bg-primary/10 ring-1 ring-primary"
                  )}
                  title={name}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
