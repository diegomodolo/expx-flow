import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
  completed: boolean;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors",
                {
                  "bg-primary border-primary text-primary-foreground": step.number === currentStep || (step.completed && step.number < currentStep),
                  "border-muted-foreground text-muted-foreground": step.number > currentStep && !step.completed,
                }
              )}
            >
              {step.completed && step.number < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "ml-2 text-sm font-medium transition-colors",
                {
                  "text-primary": step.number === currentStep,
                  "text-foreground": step.completed,
                  "text-muted-foreground": step.number > currentStep && !step.completed,
                }
              )}
            >
              {step.title}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-4 transition-colors",
                {
                  "bg-primary": step.completed,
                  "bg-muted": !step.completed,
                }
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}