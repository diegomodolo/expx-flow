import { useState } from "react";
import { YouTubeCategory } from "@/hooks/useYouTubeCategories";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderOpen,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Layers,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeCategorySidebarProps {
  categories: YouTubeCategory[];
  channels: YouTubeChannel[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (name: string, description?: string, color?: string) => Promise<any>;
  onUpdateCategory: (id: string, updates: { name?: string; description?: string; color?: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onLinkChannel: (categoryId: string, channelId: string) => Promise<void>;
  onUnlinkChannel: (categoryId: string, channelId: string) => Promise<void>;
}

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export function YouTubeCategorySidebar({
  categories,
  channels,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onLinkChannel,
  onUnlinkChannel,
}: YouTubeCategorySidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [showChannelsDialog, setShowChannelsDialog] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateCategory(newName.trim(), undefined, newColor);
    setNewName("");
    setNewColor(COLORS[0]);
    setShowCreateDialog(false);
  };

  const handleEdit = async () => {
    if (!showEditDialog || !editName.trim()) return;
    await onUpdateCategory(showEditDialog, { name: editName.trim(), color: editColor });
    setShowEditDialog(null);
  };

  const openEdit = (cat: YouTubeCategory) => {
    setEditName(cat.name);
    setEditColor(cat.color);
    setShowEditDialog(cat.id);
  };

  const toggleChannelLink = async (categoryId: string, channelId: string, isLinked: boolean) => {
    if (isLinked) {
      await onUnlinkChannel(categoryId, channelId);
    } else {
      await onLinkChannel(categoryId, channelId);
    }
  };

  const managingCategory = categories.find(c => c.id === showChannelsDialog);

  return (
    <div className="w-56 border-r border-border flex flex-col bg-muted/30 shrink-0">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Categorias
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* "Todas" option */}
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
              selectedCategoryId === null
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">Todas</span>
            <span className="ml-auto text-xs opacity-60">{channels.length}</span>
          </button>

          {categories.map((cat) => (
            <div key={cat.id} className="group flex items-center">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left min-w-0",
                  selectedCategoryId === cat.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.name}</span>
                <span className="ml-auto text-xs opacity-60">{cat.channel_ids.length}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setShowChannelsDialog(cat.id)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Canais
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteCategory(cat.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="px-3 py-6 text-center">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Crie categorias para organizar seus canais
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da categoria"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Cor</span>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      newColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da categoria"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Cor</span>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      editColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!editName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Channels Dialog */}
      <Dialog open={!!showChannelsDialog} onOpenChange={() => setShowChannelsDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Canais em "{managingCategory?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum canal adicionado ainda
              </p>
            ) : (
              channels.map((ch) => {
                const isLinked = managingCategory?.channel_ids.includes(ch.id) || false;
                return (
                  <label
                    key={ch.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={isLinked}
                      onCheckedChange={() =>
                        showChannelsDialog && toggleChannelLink(showChannelsDialog, ch.id, isLinked)
                      }
                    />
                    {ch.thumbnail_url && (
                      <img
                        src={ch.thumbnail_url}
                        className="h-6 w-6 rounded-full"
                        alt=""
                      />
                    )}
                    <span className="text-sm truncate">{ch.channel_name}</span>
                  </label>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
