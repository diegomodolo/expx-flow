import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SiGoogle } from "react-icons/si";
import { Facebook } from "lucide-react";
import { Platform } from "@/hooks/useUnifiedCampaigns";

interface PlatformFilterProps {
  value: Platform;
  onChange: (platform: Platform) => void;
  metaCount?: number;
  googleCount?: number;
  className?: string;
}

export function PlatformFilter({ 
  value, 
  onChange, 
  metaCount, 
  googleCount,
  className 
}: PlatformFilterProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
      <div className="flex gap-1">
        <Button
          variant={value === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('all')}
          className="gap-2"
        >
          Todas
          {(metaCount !== undefined || googleCount !== undefined) && (
            <Badge variant={value === 'all' ? 'secondary' : 'outline'} className="ml-1">
              {(metaCount || 0) + (googleCount || 0)}
            </Badge>
          )}
        </Button>
        <Button
          variant={value === 'meta' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('meta')}
          className="gap-2"
        >
          <Facebook className="h-4 w-4" style={{ color: value === 'meta' ? 'inherit' : '#1877F2' }} />
          Meta
          {metaCount !== undefined && (
            <Badge variant={value === 'meta' ? 'secondary' : 'outline'} className="ml-1">
              {metaCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={value === 'google' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange('google')}
          className="gap-2"
        >
          <SiGoogle className="h-4 w-4" style={{ color: value === 'google' ? 'inherit' : '#4285F4' }} />
          Google
          {googleCount !== undefined && (
            <Badge variant={value === 'google' ? 'secondary' : 'outline'} className="ml-1">
              {googleCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
