import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Target, Users, Heart, Brain, Plus, X } from "lucide-react";
import { EditableStrategy } from "./types";

interface EditableTargetingSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
}

export function EditableTargetingSection({ strategy, onChange }: EditableTargetingSectionProps) {
  const [newInterest, setNewInterest] = useState("");
  const [newBehavior, setNewBehavior] = useState("");

  const handleAddInterest = () => {
    if (newInterest.trim() && !strategy.interests.includes(newInterest.trim())) {
      onChange({ interests: [...strategy.interests, newInterest.trim()] });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    onChange({ interests: strategy.interests.filter(i => i !== interest) });
  };

  const handleAddBehavior = () => {
    if (newBehavior.trim() && !strategy.behaviors.includes(newBehavior.trim())) {
      onChange({ behaviors: [...strategy.behaviors, newBehavior.trim()] });
      setNewBehavior("");
    }
  };

  const handleRemoveBehavior = (behavior: string) => {
    onChange({ behaviors: strategy.behaviors.filter(b => b !== behavior) });
  };

  const handleGenderChange = (values: string[]) => {
    if (values.length === 0) {
      onChange({ genders: ['all'] });
    } else {
      onChange({ genders: values as ('all' | 'male' | 'female')[] });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Segmentação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["demographics", "interests"]} className="w-full">
          {/* Demographics */}
          <AccordionItem value="demographics">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Demografia</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Age Range */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Faixa Etária</Label>
                  <span className="text-sm font-medium">
                    {strategy.ageMin} - {strategy.ageMax === 65 ? '65+' : strategy.ageMax} anos
                  </span>
                </div>
                <div className="px-2">
                  <Slider
                    value={[strategy.ageMin, strategy.ageMax]}
                    onValueChange={([min, max]) => onChange({ ageMin: min, ageMax: max })}
                    min={18}
                    max={65}
                    step={1}
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label>Gênero</Label>
                <ToggleGroup
                  type="multiple"
                  value={strategy.genders}
                  onValueChange={handleGenderChange}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all" className="px-4">
                    Todos
                  </ToggleGroupItem>
                  <ToggleGroupItem value="male" className="px-4">
                    Homens
                  </ToggleGroupItem>
                  <ToggleGroupItem value="female" className="px-4">
                    Mulheres
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Interests */}
          <AccordionItem value="interests">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span>Interesses ({strategy.interests.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {strategy.interests.map((interest) => (
                  <Badge 
                    key={interest} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Adicionar interesse..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleAddInterest}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Behaviors */}
          <AccordionItem value="behaviors">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <span>Comportamentos ({strategy.behaviors.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {strategy.behaviors.map((behavior) => (
                  <Badge 
                    key={behavior} 
                    variant="outline"
                    className="flex items-center gap-1 pr-1"
                  >
                    {behavior}
                    <button
                      onClick={() => handleRemoveBehavior(behavior)}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Adicionar comportamento..."
                  value={newBehavior}
                  onChange={(e) => setNewBehavior(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBehavior()}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleAddBehavior}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
