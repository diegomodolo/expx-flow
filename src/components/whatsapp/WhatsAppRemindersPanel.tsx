import { useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWhatsAppReminders, WhatsAppReminder } from "@/hooks/useWhatsAppReminders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  CalendarDays, 
  Loader2, 
  Bell, 
  User, 
  MessageCircle,
  Phone,
  Check,
  CalendarClock,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppRemindersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToChat?: (conversationId: string, instanceId: string) => void;
}

export function WhatsAppRemindersPanel({
  open,
  onOpenChange,
  onNavigateToChat,
}: WhatsAppRemindersPanelProps) {
  const { 
    todayReminders, 
    futureReminders, 
    isLoading,
    completeReminder,
    rescheduleReminder,
  } = useWhatsAppReminders();
  
  const [activeTab, setActiveTab] = useState("today");
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  const [rescheduleReminderId, setRescheduleReminderId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);

  const formatReminderDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Hoje às ${format(date, "HH:mm")}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã às ${format(date, "HH:mm")}`;
    }
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  const formatPhoneNumber = (jid: string | null) => {
    if (!jid) return null;
    // Remove @s.whatsapp.net or @c.us
    const phone = jid.replace(/@.*$/, "");
    // Format as phone number
    if (phone.startsWith("55") && phone.length >= 12) {
      const ddd = phone.slice(2, 4);
      const rest = phone.slice(4);
      if (rest.length === 9) {
        return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      } else if (rest.length === 8) {
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
    }
    return phone;
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavigateToChat = (reminder: WhatsAppReminder) => {
    if (reminder.conversationId && reminder.instanceId && onNavigateToChat) {
      onNavigateToChat(reminder.conversationId, reminder.instanceId);
      onOpenChange(false);
    }
  };

  const handleCompleteReminder = () => {
    if (confirmCompleteId) {
      completeReminder.mutate(confirmCompleteId);
      setConfirmCompleteId(null);
    }
  };

  const handleReschedule = () => {
    if (rescheduleReminderId && rescheduleDate) {
      // Set time to 9:00 AM by default
      const newDate = new Date(rescheduleDate);
      newDate.setHours(9, 0, 0, 0);
      rescheduleReminder.mutate({ 
        reminderId: rescheduleReminderId, 
        newDate: newDate.toISOString() 
      });
      setRescheduleReminderId(null);
      setRescheduleDate(undefined);
    }
  };

  const ReminderCard = ({ reminder }: { reminder: WhatsAppReminder }) => (
    <div
      className={cn(
        "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
        isToday(new Date(reminder.nextActionDate)) && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          {reminder.clientAvatar && (
            <AvatarImage src={reminder.clientAvatar} alt={reminder.clientName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(reminder.clientName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{reminder.clientName}</span>
          </div>
          
          {/* Chat info */}
          {reminder.chatJid && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{formatPhoneNumber(reminder.chatJid)}</span>
              {reminder.chatName && reminder.chatName !== reminder.clientName && (
                <span className="truncate">• {reminder.chatName}</span>
              )}
            </div>
          )}
          
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {reminder.summary}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatReminderDate(reminder.nextActionDate)}
            </span>
            {reminder.createdByName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {reminder.createdByName}
              </span>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {reminder.conversationId && (
              <>
                <DropdownMenuItem onClick={() => handleNavigateToChat(reminder)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ir para o chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setConfirmCompleteId(reminder.id)}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como concluído
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setRescheduleReminderId(reminder.id);
              setRescheduleDate(new Date(reminder.nextActionDate));
            }}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Remarcar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[400px] sm:w-[450px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <SheetTitle>Lembretes</SheetTitle>
            </div>
            <SheetDescription>
              Lembretes de follow-up com clientes
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-3 border-b">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="today" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Hoje
                  {todayReminders.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {todayReminders.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="future" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Próximos
                  {futureReminders.length > 0 && (
                    <Badge variant="outline" className="ml-1 h-5 px-1.5">
                      {futureReminders.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="today" className="m-0 h-[calc(100vh-180px)]">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {todayReminders.length === 0 ? (
                        <EmptyState message="Nenhum lembrete para hoje" />
                      ) : (
                        todayReminders.map((reminder) => (
                          <ReminderCard key={reminder.id} reminder={reminder} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="future" className="m-0 h-[calc(100vh-180px)]">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {futureReminders.length === 0 ? (
                        <EmptyState message="Nenhum lembrete futuro" />
                      ) : (
                        futureReminders.map((reminder) => (
                          <ReminderCard key={reminder.id} reminder={reminder} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Confirm Complete Dialog */}
      <AlertDialog open={!!confirmCompleteId} onOpenChange={() => setConfirmCompleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Este lembrete será removido da lista. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteReminder}>
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Popover */}
      <AlertDialog open={!!rescheduleReminderId} onOpenChange={() => {
        setRescheduleReminderId(null);
        setRescheduleDate(undefined);
      }}>
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remarcar lembrete</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma nova data para este lembrete
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={rescheduleDate}
              onSelect={setRescheduleDate}
              disabled={(date) => date < new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReschedule}
              disabled={!rescheduleDate}
            >
              Remarcar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
