import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Building2, DollarSign, Trophy, XCircle } from "lucide-react";
import { CRMDeal } from "@/hooks/useCRMDeals";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMWonLostDealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: CRMDeal[];
  type: "won" | "lost";
  stageName: string;
  onDealClick: (deal: CRMDeal) => void;
}

export function CRMWonLostDealsModal({
  isOpen,
  onClose,
  deals,
  type,
  stageName,
  onDealClick,
}: CRMWonLostDealsModalProps) {
  const isWon = type === "won";
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWon ? (
              <Trophy className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {stageName} ({deals.length} negócios)
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 border-b">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {deals.map((deal) => {
              const contact = deal.contact;
              const contactName = contact?.full_name || deal.title;

              return (
                <Card
                  key={deal.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    onDealClick(deal);
                    onClose();
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {deal.responsible?.avatar_url && (
                            <AvatarImage src={deal.responsible.avatar_url} alt={deal.responsible.full_name} />
                          )}
                          <AvatarFallback className={isWon ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                            {deal.responsible ? getInitials(deal.responsible.full_name) : getInitials(contactName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{deal.title}</p>
                          {contact && contact.full_name !== deal.title && (
                            <p className="text-xs text-muted-foreground">{contact.full_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(deal.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                      </div>

                      {deal.value && (
                        <div className={`flex items-center gap-1 text-sm font-semibold ${isWon ? 'text-emerald-600' : 'text-red-600'}`}>
                          <DollarSign className="w-4 h-4" />
                          R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    {contact && (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {contact.company_name}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {deals.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum negócio {isWon ? 'ganho' : 'perdido'} nesta coluna</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}