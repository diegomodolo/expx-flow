import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { DollarSign, Calendar, Users } from "lucide-react";
import { EditableStrategy } from "./types";

interface EditableBudgetSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
}

export function EditableBudgetSection({ strategy, onChange }: EditableBudgetSectionProps) {
  const handleDailyBudgetChange = (value: number) => {
    onChange({
      dailyBudget: value,
      totalBudget: value * strategy.duration,
    });
  };

  const handleDurationChange = (value: number) => {
    onChange({
      duration: value,
      totalBudget: strategy.dailyBudget * value,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Orçamento e Duração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Budget */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Orçamento Diário</Label>
            <span className="text-sm font-semibold text-primary">R$ {strategy.dailyBudget}</span>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[strategy.dailyBudget]}
              onValueChange={([value]) => handleDailyBudgetChange(value)}
              min={10}
              max={2000}
              step={10}
              className="flex-1"
            />
            <Input
              type="number"
              value={strategy.dailyBudget}
              onChange={(e) => handleDailyBudgetChange(Number(e.target.value))}
              className="w-24"
              min={10}
              max={50000}
            />
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Duração
            </Label>
            <span className="text-sm font-semibold">{strategy.duration} dias</span>
          </div>
          <Slider
            value={[strategy.duration]}
            onValueChange={([value]) => handleDurationChange(value)}
            min={7}
            max={90}
            step={1}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-primary">
              R$ {strategy.totalBudget.toLocaleString('pt-BR')}
            </div>
            <div className="text-xs text-muted-foreground">Orçamento Total</div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold">{strategy.estimatedReach}</div>
            <div className="text-xs text-muted-foreground">Alcance Estimado</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
