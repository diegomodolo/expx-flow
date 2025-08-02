import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  isAiPowered?: boolean;
  href: string;
  iconColor: string;
  iconBg: string;
  onClick: () => void;
}

export function ReportCard({
  title,
  description,
  icon: Icon,
  category,
  isAiPowered = false,
  iconColor,
  iconBg,
  onClick
}: ReportCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border bg-card" onClick={onClick}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          {isAiPowered && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              IA
            </Badge>
          )}
        </div>
        <div>
          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}