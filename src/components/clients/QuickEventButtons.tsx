import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_PRESETS, EventPresetKey } from "@/lib/offlineEventPresets";
import { CheckCircle, UserX, DollarSign, LucideIcon } from "lucide-react";

interface QuickEventButtonsProps {
  onEventClick: (eventKey: EventPresetKey) => void;
}

const iconMap: Record<string, LucideIcon> = {
  CheckCircle,
  UserX,
  DollarSign,
};

export const QuickEventButtons = ({ onEventClick }: QuickEventButtonsProps) => {
  const quickEvents: EventPresetKey[] = ['LEAD_QUALIFIED', 'LEAD_DISQUALIFIED', 'PURCHASE'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {quickEvents.map((eventKey) => {
        const preset = EVENT_PRESETS[eventKey];
        const Icon = iconMap[preset.icon] || CheckCircle;
        
        return (
          <Card 
            key={eventKey}
            className="cursor-pointer hover:shadow-md transition-shadow border-2"
            onClick={() => onEventClick(eventKey)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-3 rounded-full ${
                  preset.color === 'green' ? 'bg-green-100' :
                  preset.color === 'red' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    preset.color === 'green' ? 'text-green-600' :
                    preset.color === 'red' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
                <h4 className="font-semibold">{preset.displayName}</h4>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
