import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentType } from "./ContentTypes";

interface ContentCardProps {
  content: ContentType;
  onClick: () => void;
}

export function ContentCard({ content, onClick }: ContentCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 group border-border/50 hover:border-primary/20"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-2xl">{content.icon}</div>
          <Badge variant="secondary" className={`text-xs ${content.color}`}>
            {content.category.split(' ')[0]}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
            {content.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {content.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}