import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { EditableStrategy, BID_STRATEGIES } from "./types";

interface EditableBiddingSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
}

export function EditableBiddingSection({ strategy, onChange }: EditableBiddingSectionProps) {
  const selectedStrategy = BID_STRATEGIES.find(s => s.value === strategy.bidStrategy);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Estratégia de Lance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bid Strategy Select */}
        <div className="space-y-2">
          <Label>Estratégia</Label>
          <Select
            value={strategy.bidStrategy}
            onValueChange={(value) => onChange({ 
              bidStrategy: value as EditableStrategy['bidStrategy'],
              // Reset targets when changing strategy
              targetCPA: value === 'COST_CAP' ? strategy.targetCPA : undefined,
              targetROAS: value === 'BID_CAP' ? strategy.targetROAS : undefined,
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BID_STRATEGIES.map((bidStrategy) => (
                <SelectItem key={bidStrategy.value} value={bidStrategy.value}>
                  <div className="flex flex-col">
                    <span>{bidStrategy.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStrategy && (
            <p className="text-xs text-muted-foreground">{selectedStrategy.description}</p>
          )}
        </div>

        {/* Target CPA (for COST_CAP) */}
        {strategy.bidStrategy === 'COST_CAP' && (
          <div className="space-y-2">
            <Label>CPA Alvo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                type="number"
                value={strategy.targetCPA || ''}
                onChange={(e) => onChange({ targetCPA: Number(e.target.value) || undefined })}
                className="pl-10"
                placeholder="0,00"
                min={0}
                step={0.01}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Custo máximo por resultado que você deseja pagar
            </p>
          </div>
        )}

        {/* Target ROAS (for BID_CAP) */}
        {strategy.bidStrategy === 'BID_CAP' && (
          <div className="space-y-2">
            <Label>Lance Máximo</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                type="number"
                value={strategy.targetROAS || ''}
                onChange={(e) => onChange({ targetROAS: Number(e.target.value) || undefined })}
                className="pl-10"
                placeholder="0,00"
                min={0}
                step={0.01}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Valor máximo do lance nos leilões de anúncios
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estratégia Atual</span>
            <span className="font-medium">{selectedStrategy?.label}</span>
          </div>
          {strategy.targetCPA && strategy.bidStrategy === 'COST_CAP' && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">CPA Alvo</span>
              <span className="font-medium">R$ {strategy.targetCPA.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
