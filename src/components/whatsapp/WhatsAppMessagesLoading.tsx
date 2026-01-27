import { Skeleton } from "@/components/ui/skeleton";

export function WhatsAppMessagesLoading() {
  return (
    <div className="py-4 space-y-3 px-2">
      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[70%]">
          <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-md" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="flex flex-col gap-1 items-end max-w-[70%]">
          <Skeleton className="h-10 w-56 rounded-2xl rounded-br-md bg-primary/20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[70%]">
          <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-md" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="flex flex-col gap-1 items-end max-w-[70%]">
          <Skeleton className="h-8 w-32 rounded-2xl rounded-br-md bg-primary/20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[70%]">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-bl-md" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="flex flex-col gap-1 items-end max-w-[70%]">
          <Skeleton className="h-14 w-52 rounded-2xl rounded-br-md bg-primary/20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Loading text */}
      <div className="flex items-center justify-center pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>Carregando mensagens</span>
        </div>
      </div>
    </div>
  );
}
