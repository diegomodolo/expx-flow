import { AlertTriangle, Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RestrictedAccount {
  id: string;
  name: string;
  avatar: string | null;
  accountStatus: number;
  reason: string;
}

interface RadarTVRestrictedAccountsProps {
  accounts: RestrictedAccount[];
}

export function RadarTVRestrictedAccounts({ accounts }: RadarTVRestrictedAccountsProps) {
  if (!accounts || accounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">
          Contas Restritas ({accounts.length})
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {accounts.map((account) => (
          <div 
            key={account.id}
            className="flex items-center gap-2 bg-background/80 rounded-md px-3 py-2 border border-destructive/20"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={account.avatar || undefined} />
              <AvatarFallback className="bg-destructive/20 text-destructive text-xs">
                {account.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{account.name}</span>
              <span className="text-xs text-destructive flex items-center gap-1">
                <Ban className="h-3 w-3" />
                {account.reason}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
