import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCRMTags } from "@/hooks/useCRMTags";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TagsSettingsProps {
  workspaceId: string;
}

const COLOR_PALETTE = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Laranja", value: "#f97316" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Índigo", value: "#6366f1" },
];

export function TagsSettings({ workspaceId }: TagsSettingsProps) {
  const { toast } = useToast();
  const { tags, isLoading, createTag, deleteTag } = useCRMTags(workspaceId);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a tag.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      await createTag({ name: newTagName, color: selectedColor });
      setNewTagName("");
      setSelectedColor(COLOR_PALETTE[0].value);
      toast({
        title: "Tag criada!",
        description: "A nova tag foi criada com sucesso.",
      });
    } catch (error) {
      console.error("Error creating tag:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      toast({
        title: "Tag deletada!",
        description: "A tag foi removida com sucesso.",
      });
      setTagToDelete(null);
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Criar Nova Tag</h2>
            <p className="text-muted-foreground">
              Tags ajudam a categorizar e organizar seus leads.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome da Tag</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Digite o nome da tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTag();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      selectedColor === color.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleCreateTag} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Tag
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Tags Cadastradas</h2>
            <p className="text-muted-foreground">
              {tags.length} {tags.length === 1 ? "tag cadastrada" : "tags cadastradas"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tag cadastrada ainda.
            </div>
          ) : (
            <div className="grid gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Badge style={{ backgroundColor: tag.color }} className="text-white">
                    {tag.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTagToDelete(tag.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta tag? Esta ação não pode ser desfeita e a tag
              será removida de todos os leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => tagToDelete && handleDeleteTag(tagToDelete)}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
