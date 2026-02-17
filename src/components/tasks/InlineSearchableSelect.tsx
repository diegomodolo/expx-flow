import { useState, useRef, useEffect } from "react";
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

  const selectedLabel = options.find(o => o.id === value)?.nome || placeholder;

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
        <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-popover border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            <div
              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted text-muted-foreground rounded-sm"
              onClick={() => { onChange(''); setSearch(''); setOpen(false); }}
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
                onClick={() => { onChange(o.id); setSearch(''); setOpen(false); }}
              >
                {o.nome}
              </div>
            ))}
            {search.trim() && !exactMatch && onCreate && (
              <div
                className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted flex items-center gap-1.5 text-primary font-medium border-t mt-1 pt-1.5 rounded-sm"
                onClick={() => {
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
