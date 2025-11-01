import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { BlockType } from "@/hooks/useFunnels";

interface BlockLibraryProps {
  blockTypes: BlockType[];
  onDragStart: (event: React.DragEvent, blockType: BlockType) => void;
}

const categoryLabels: Record<string, string> = {
  descoberta: "Descoberta/Atenção",
  nutricao: "Nutrição/Educação",
  qualificacao: "Qualificação/Diagnóstico",
  proposta: "Proposta/Avanço",
};

export function BlockLibrary({ blockTypes, onDragStart }: BlockLibraryProps) {
  const categories = ["descoberta", "nutricao", "qualificacao", "proposta"];

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Biblioteca de Blocos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para o canvas
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {categories.map((category) => {
            const blocks = blockTypes.filter((bt) => bt.category === category);
            if (blocks.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  {categoryLabels[category]}
                </h4>
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, block)}
                      className="px-3 py-2 rounded-md border bg-background cursor-grab active:cursor-grabbing hover:border-primary hover:bg-accent transition-colors"
                      style={{
                        borderLeftWidth: "3px",
                        borderLeftColor: block.color,
                      }}
                    >
                      <div className="text-sm font-medium">{block.display_name}</div>
                      {block.default_description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {block.default_description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {category !== "proposta" && <Separator className="mt-4" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
