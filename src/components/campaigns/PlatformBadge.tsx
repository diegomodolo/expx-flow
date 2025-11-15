import { Badge } from "@/components/ui/badge";
import { SiGoogle } from "react-icons/si";
import { Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformBadgeProps {
  platform: 'meta' | 'google';
  className?: string;
  showIcon?: boolean;
}

export function PlatformBadge({ platform, className, showIcon = true }: PlatformBadgeProps) {
  if (platform === 'meta') {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 border-[#1877F2] text-[#1877F2]", className)}
      >
        {showIcon && <Facebook className="h-3 w-3" />}
        Meta Ads
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1 border-[#4285F4] text-[#4285F4]", className)}
    >
      {showIcon && <SiGoogle className="h-3 w-3" />}
      Google Ads
    </Badge>
  );
}
