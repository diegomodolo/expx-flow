import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useMetaAudiences, MetaAudience } from '@/hooks/useMetaAudiences';

interface AudienceMultiSelectProps {
  clientId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function AudienceMultiSelect({
  clientId,
  selectedIds,
  onChange,
  placeholder = 'Selecionar públicos...',
  label,
}: AudienceMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { audiences, loading, fetchAudiences } = useMetaAudiences(clientId);

  useEffect(() => {
    if (clientId) {
      fetchAudiences();
    }
  }, [clientId, fetchAudiences]);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const toggleAudience = (audienceId: string) => {
    if (selectedIds.includes(audienceId)) {
      onChange(selectedIds.filter(id => id !== audienceId));
    } else {
      onChange([...selectedIds, audienceId]);
    }
  };

  const removeAudience = (audienceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== audienceId));
  };

  const selectedAudiences = audiences.filter(a => selectedIds.includes(a.id));

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedAudiences.length > 0 ? (
                selectedAudiences.map(audience => (
                  <Badge
                    key={audience.id}
                    variant="secondary"
                    className="mr-1"
                  >
                    {audience.name}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => removeAudience(audience.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar público..." />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Carregando públicos...' : 'Nenhum público encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {audiences.map((audience) => (
                  <CommandItem
                    key={audience.id}
                    value={audience.name}
                    onSelect={() => toggleAudience(audience.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedIds.includes(audience.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{audience.name}</span>
                      </div>
                      {audience.approximate_count > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {formatCount(audience.approximate_count)}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAudiences.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedAudiences.length} público(s) selecionado(s) • 
          ~{formatCount(selectedAudiences.reduce((sum, a) => sum + a.approximate_count, 0))} pessoas
        </p>
      )}
    </div>
  );
}
