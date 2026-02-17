import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  nome: string;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  onCreate?: (name: string) => Promise<Option | null | undefined>;
  placeholder?: string;
}

export function InlineSearchableSelect({ label, value, options, onChange, onCreate, placeholder = "Selecione..." }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.id === value)?.nome || placeholder;

  // Focus the input after the dropdown renders
  useEffect(() => {
    if (open) {
      // Use a small timeout to ensure the DOM is ready and bypass Radix focus trap timing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = options.filter(o => o.nome.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some(o => o.nome.toLowerCase() === search.trim().toLowerCase());

  // Stop ALL event propagation from the dropdown to prevent Dialog focus trap interference
  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Label className="text-sm font-semibold">{label}</Label>
      <Button
        variant="outline"
        role="combobox"
        className="w-full justify-between font-normal mt-1.5"
        onClick={() => setOpen(prev => !prev)}
        type="button"
      >
        {selectedLabel}
        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-[9999] bg-popover border rounded-md shadow-lg"
          onFocus={stopPropagation}
          onBlur={stopPropagation}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          onKeyPress={stopPropagation}
        >
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => {
                e.stopPropagation();
                setSearch(e.target.value);
              }}
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => {
                // Prevent the dialog from recapturing focus
                e.stopPropagation();
                e.preventDefault();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch("");
                }
              }}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            <div
              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted text-muted-foreground rounded-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange('');
                setSearch('');
                setOpen(false);
              }}
            >
              Nenhuma
            </div>
            {filtered.map(o => (
              <div
                key={o.id}
                className={cn(
                  "px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm",
                  value === o.id && "bg-primary/10 text-primary"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setSearch('');
                  setOpen(false);
                }}
              >
                {o.nome}
              </div>
            ))}
            {search.trim() && !exactMatch && onCreate && (
              <div
                className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted flex items-center gap-1.5 text-primary font-medium border-t mt-1 pt-1.5 rounded-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const name = search.trim();
                  onCreate(name).then((created) => {
                    if (created) onChange(created.id);
                    setSearch('');
                    setOpen(false);
                  });
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Criar "{search.trim()}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
