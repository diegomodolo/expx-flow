import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Tag } from "lucide-react";
import { useCRMTags, useLeadTags } from "@/hooks/useCRMTags";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CRMTagManagerProps {
  workspaceId: string;
  leadId: string;
}

export function CRMTagManager({ workspaceId, leadId }: CRMTagManagerProps) {
  const { tags } = useCRMTags(workspaceId);
  const { leadTags, attachTag, removeTag, isAttachingTag } = useLeadTags(leadId);
  const [open, setOpen] = useState(false);

  const attachedTagIds = leadTags.map(lt => lt.tag_id);
  const availableTags = tags.filter(tag => !attachedTagIds.includes(tag.id));

  const handleAttachTag = async (tagId: string) => {
    await attachTag(tagId);
    setOpen(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTag(tagId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags
        </Label>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={isAttachingTag}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar tag..." />
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleAttachTag(tag.id)}
                  >
                    <Badge
                      style={{ backgroundColor: tag.color, color: '#fff' }}
                      className="mr-2"
                    >
                      {tag.name}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2">
        {leadTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tag adicionada</p>
        ) : (
          leadTags.map((leadTag: any) => (
            <Badge
              key={leadTag.id}
              style={{ backgroundColor: leadTag.tag.color, color: '#fff' }}
              className="flex items-center gap-1"
            >
              {leadTag.tag.name}
              <button
                onClick={() => handleRemoveTag(leadTag.tag_id)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

interface CRMCreateTagDialogProps {
  workspaceId: string;
  onClose: () => void;
}

export function CRMCreateTagDialog({ workspaceId, onClose }: CRMCreateTagDialogProps) {
  const { createTag, isCreatingTag } = useCRMTags(workspaceId);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createTag({ name: name.trim(), color });
    setName('');
    setColor('#6366f1');
    onClose();
  };

  const colorOptions = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
    '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="tag-name">Nome da Tag</Label>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite o nome da tag"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex gap-2 flex-wrap">
          {colorOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${
                color === c ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isCreatingTag || !name.trim()}>
          Criar Tag
        </Button>
      </div>
    </form>
  );
}
