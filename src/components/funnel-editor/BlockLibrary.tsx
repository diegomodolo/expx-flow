import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { BlockType } from "@/hooks/useFunnels";
import { 
  Facebook, 
  Search as SearchIcon, 
  Youtube, 
  Mail, 
  BookOpen, 
  Newspaper, 
  Video,
  Megaphone,
  FileText,
  MessageSquare,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  Podcast,
  Image,
  ListChecks,
  Brain,
  GraduationCap,
  UsersRound,
  Bell,
  Mic,
  FileBadge2,
  ClipboardList,
  Bot,
  MessageCircle,
  BarChart2,
  Calendar,
  Presentation,
  PlayCircle,
  FileCheck,
  Phone,
  CreditCard,
  Rocket,
  Star,
  LayoutDashboard,
  Gift,
  Repeat,
  Plug,
  Database,
  BotMessageSquare,
  BarChart3,
  CalendarDays,
  Cast,
  QrCode,
  Package,
  Layers,
  type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  facebook: Facebook,
  google: SearchIcon,
  youtube: Youtube,
  mail: Mail,
  'book-open': BookOpen,
  newspaper: Newspaper,
  video: Video,
  megaphone: Megaphone,
  'file-text': FileText,
  'message-square': MessageSquare,
  users: Users,
  target: Target,
  'trending-up': TrendingUp,
  'check-circle': CheckCircle,
  podcast: Podcast,
  image: Image,
  'list-checks': ListChecks,
  brain: Brain,
  'graduation-cap': GraduationCap,
  'users-round': UsersRound,
  bell: Bell,
  mic: Mic,
  'file-badge': FileBadge2,
  'clipboard-list': ClipboardList,
  bot: Bot,
  'message-circle': MessageCircle,
  'chart-bar': BarChart2,
  calendar: Calendar,
  presentation: Presentation,
  'play-circle': PlayCircle,
  'file-check': FileCheck,
  phone: Phone,
  'credit-card': CreditCard,
  rocket: Rocket,
  star: Star,
  'layout-dashboard': LayoutDashboard,
  gift: Gift,
  repeat: Repeat,
  plug: Plug,
  database: Database,
  'bot-message-square': BotMessageSquare,
  'bar-chart-3': BarChart3,
  'calendar-days': CalendarDays,
  cast: Cast,
  'qr-code': QrCode,
  'package': Package,
  'layers': Layers,
};

interface BlockLibraryProps {
  blockTypes: BlockType[];
  onDragStart: (event: React.DragEvent, blockType: BlockType) => void;
}

const categoryLabels: Record<string, string> = {
  containers: "📦 Containers/Agrupadores",
  descoberta: "🧭 Descoberta/Atenção",
  nutricao: "📚 Nutrição/Educação",
  qualificacao: "🧩 Qualificação/Diagnóstico",
  proposta: "💰 Proposta/Avanço",
  "pos-venda": "🔁 Pós-Venda/Retenção",
  automacao: "⚙️ Automação/Suporte",
  eventos: "🌐 Mídias e Eventos",
};

export function BlockLibrary({ blockTypes, onDragStart }: BlockLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar blocos com base no termo de pesquisa
  const filteredBlocks = blockTypes.filter((block) =>
    block.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.default_description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar blocos por categoria
  const groupedBlocks = filteredBlocks.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockType[]>);

  // Ordenar categorias com containers primeiro
  const categoryOrder = [
    "containers",
    "descoberta",
    "nutricao",
    "qualificacao",
    "proposta",
    "pos-venda",
    "automacao",
    "eventos",
  ];
  
  const categories = Object.keys(groupedBlocks).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Biblioteca de Blocos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste para o canvas
          </p>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar blocos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {categories.map((category) => {
            const blocks = groupedBlocks[category];
            if (blocks.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">
                  {categoryLabels[category] || category}
                </h4>
                <div className="space-y-2">
                  {blocks.map((block) => {
                    const IconComponent = block.icon ? iconMap[block.icon] : null;
                    return (
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
                        <div className="flex items-center gap-2">
                          {IconComponent && (
                            <IconComponent 
                              className="h-4 w-4 shrink-0" 
                              style={{ color: block.color }}
                            />
                          )}
                          <div className="text-sm font-medium">{block.display_name}</div>
                        </div>
                        {block.default_description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {block.default_description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {category !== "eventos" && <Separator className="mt-4" />}
              </div>
            );
          })}
          {filteredBlocks.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum bloco encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
