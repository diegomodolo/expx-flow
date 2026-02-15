import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeployStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: DeployStep[];
  finished: boolean;
  error?: string | null;
}

export function SkillDeployModal({ open, onOpenChange, steps, finished, error }: Props) {
  const icon = (status: DeployStep["status"]) => {
    switch (status) {
      case "pending": return <Circle className="h-4 w-4 text-muted-foreground" />;
      case "running": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={finished || error ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (!finished && !error) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>
            {error ? "Erro no Deploy" : finished ? "Deploy Concluído!" : "Publicando Skill..."}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5">{icon(step.status)}</div>
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "error" && "text-destructive"
                )}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          ))}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-2">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
