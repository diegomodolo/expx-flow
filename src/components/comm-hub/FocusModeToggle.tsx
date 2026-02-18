import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusModeToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function FocusModeToggle({ active, onToggle }: FocusModeToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? 'default' : 'ghost'}
            size="icon"
            className={cn('h-8 w-8', active && 'bg-primary/80')}
            onClick={onToggle}
          >
            {active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {active ? 'Sair do Modo Foco' : 'Modo Foco — silencia o chat'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
