import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MetaAudience } from "@/hooks/useMetaAudiences";
import { Loader2, Users, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateLookalikeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originAudience: MetaAudience | null;
  onSubmit: (
    originAudienceId: string,
    name: string,
    country: string,
    ratio: number,
    lookalikeType?: 'similarity' | 'reach'
  ) => Promise<void>;
  loading?: boolean;
}

const COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
  { value: "CO", label: "Colômbia" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Peru" },
  { value: "ES", label: "Espanha" },
  { value: "GB", label: "Reino Unido" },
];

export function CreateLookalikeModal({
  open,
  onOpenChange,
  originAudience,
  onSubmit,
  loading = false,
}: CreateLookalikeModalProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BR");
  const [ratio, setRatio] = useState([1]);
  const [lookalikeType, setLookalikeType] = useState<'similarity' | 'reach' | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originAudience || !name.trim()) return;

    await onSubmit(originAudience.id, name.trim(), country, ratio[0], lookalikeType);
    
    // Reset form
    setName("");
    setCountry("BR");
    setRatio([1]);
    setLookalikeType(undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setName("");
        setCountry("BR");
        setRatio([1]);
        setLookalikeType(undefined);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Criar Público Semelhante
            </DialogTitle>
            <DialogDescription>
              Crie um público lookalike baseado em "{originAudience?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O público semelhante pode levar de 1 a 6 horas para ser populado pelo Meta. 
                O público de origem precisa ter pelo menos 100 pessoas.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do público</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: LAL - Compradores 1% BR"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País de destino</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tamanho do público</Label>
                <span className="text-sm font-medium text-primary">{ratio[0]}%</span>
              </div>
              <Slider
                value={ratio}
                onValueChange={setRatio}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                1% = mais similar ao público de origem. 10% = maior alcance, menos similar.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Otimização (opcional)</Label>
              <Select 
                value={lookalikeType || "auto"} 
                onValueChange={(v) => setLookalikeType(v === "auto" ? undefined : v as 'similarity' | 'reach')}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Automático" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático (recomendado)</SelectItem>
                  <SelectItem value="similarity">Similaridade</SelectItem>
                  <SelectItem value="reach">Alcance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lookalike
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
