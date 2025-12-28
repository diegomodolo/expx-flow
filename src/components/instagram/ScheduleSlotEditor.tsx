import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Layers, Trash2, Loader2 } from 'lucide-react';
import { ScheduleSlot } from '@/hooks/useInstagramScheduleSlots';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const CAROUSEL_IMAGE_OPTIONS = [
  { value: 5, label: '5 imagens' },
  { value: 6, label: '6 imagens' },
  { value: 7, label: '7 imagens' },
  { value: 8, label: '8 imagens' },
  { value: 9, label: '9 imagens' },
  { value: 10, label: '10 imagens' },
];

interface ScheduleSlotEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ScheduleSlot | null;
  dayOfWeek: number;
  hour: number;
  onSave: (data: { post_type: 'single' | 'carousel'; carousel_images: number }) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export function ScheduleSlotEditor({
  open,
  onOpenChange,
  slot,
  dayOfWeek,
  hour,
  onSave,
  onDelete,
  isLoading
}: ScheduleSlotEditorProps) {
  const [postType, setPostType] = useState<'single' | 'carousel'>(slot?.post_type || 'single');
  const [carouselImages, setCarouselImages] = useState(slot?.carousel_images || 5);

  const dayLabel = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  const handleSave = () => {
    onSave({ post_type: postType, carousel_images: carouselImages });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {slot ? 'Editar Slot' : 'Novo Slot de Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Day and Hour Display */}
          <div className="bg-muted p-3 rounded-lg text-center">
            <p className="text-lg font-semibold">{dayLabel}</p>
            <p className="text-2xl font-bold text-primary">{hourLabel}</p>
          </div>

          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Post</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={postType === 'single' ? 'default' : 'outline'}
                onClick={() => setPostType('single')}
                className="h-20 flex-col gap-2"
              >
                <ImageIcon className="w-6 h-6" />
                <span>Imagem Única</span>
              </Button>
              <Button
                type="button"
                variant={postType === 'carousel' ? 'default' : 'outline'}
                onClick={() => setPostType('carousel')}
                className="h-20 flex-col gap-2"
              >
                <Layers className="w-6 h-6" />
                <span>Carrossel</span>
              </Button>
            </div>
          </div>

          {/* Carousel Image Count */}
          {postType === 'carousel' && (
            <div className="space-y-2">
              <Label>Quantidade de Imagens</Label>
              <Select 
                value={String(carouselImages)} 
                onValueChange={(v) => setCarouselImages(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAROUSEL_IMAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {slot && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {slot ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
