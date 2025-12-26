import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CRMTag {
  id: string;
  name: string;
  color: string;
  workspace_id: string;
}

interface CRMDealTagsProps {
  dealId: string;
  workspaceId: string;
}

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export function CRMDealTags({ dealId, workspaceId }: CRMDealTagsProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch all tags for workspace
  const { data: allTags = [] } = useQuery({
    queryKey: ["crm-tags", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return data as CRMTag[];
    },
    enabled: !!workspaceId,
  });

  // Fetch tags for this deal
  const { data: dealTags = [], refetch: refetchDealTags } = useQuery({
    queryKey: ["crm-deal-tags", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_tags")
        .select("tag_id, crm_tags(id, name, color)")
        .eq("deal_id", dealId);

      if (error) throw error;
      return data.map((dt: any) => dt.crm_tags) as CRMTag[];
    },
    enabled: !!dealId,
  });

  // Create new tag
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("crm_tags")
        .insert({ name, color, workspace_id: workspaceId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["crm-tags", workspaceId] });
      setNewTagName("");
      setIsCreating(false);
      // Auto-add to deal
      addTagToDealMutation.mutate(newTag.id);
    },
    onError: () => {
      toast.error("Erro ao criar tag");
    },
  });

  // Add tag to deal
  const addTagToDealMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("crm_deal_tags")
        .insert({ deal_id: dealId, tag_id: tagId });

      if (error) throw error;
    },
    onSuccess: () => {
      refetchDealTags();
      toast.success("Tag adicionada");
    },
    onError: () => {
      toast.error("Erro ao adicionar tag");
    },
  });

  // Remove tag from deal
  const removeTagFromDealMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("crm_deal_tags")
        .delete()
        .eq("deal_id", dealId)
        .eq("tag_id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchDealTags();
      toast.success("Tag removida");
    },
    onError: () => {
      toast.error("Erro ao remover tag");
    },
  });

  const dealTagIds = dealTags.map((t) => t.id);
  const availableTags = allTags.filter((t) => !dealTagIds.includes(t.id));

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim(), color: selectedColor });
  };

  return (
    <div className="space-y-2">
      {/* Current tags */}
      <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
        {dealTags.length === 0 && (
          <span className="text-sm text-muted-foreground">Nenhuma tag</span>
        )}
        {dealTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => removeTagFromDealMutation.mutate(tag.id)}
              className="ml-1 hover:bg-background/50 rounded p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {/* Add tag button */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
              <Plus className="w-4 h-4 mr-1" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              {/* Create new tag section */}
              {isCreating ? (
                <div className="space-y-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da tag"
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform",
                          selectedColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setIsCreating(false);
                        setNewTagName("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || createTagMutation.isPending}
                    >
                      Criar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Available tags list */}
                  {availableTags.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTagToDealMutation.mutate(tag.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm truncate">{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {availableTags.length === 0 && allTags.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Todas as tags já foram adicionadas
                    </p>
                  )}

                  {/* Create new tag button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsCreating(true)}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Criar nova tag
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
