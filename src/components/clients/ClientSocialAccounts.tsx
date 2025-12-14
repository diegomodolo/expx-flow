import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, Instagram, Facebook, Edit2, Users } from "lucide-react";

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  page_category: string | null;
}

interface InstagramAccount {
  id: string;
  instagram_id: string;
  username: string;
  profile_picture_url: string | null;
  followers_count: number;
}

interface ClientSocialAccountsProps {
  facebookPage?: FacebookPage | null;
  instagramAccount?: InstagramAccount | null;
  onEdit?: () => void;
}

export function ClientSocialAccounts({ 
  facebookPage, 
  instagramAccount, 
  onEdit 
}: ClientSocialAccountsProps) {
  if (!facebookPage && !instagramAccount) {
    return null;
  }

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Redes Sociais</CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Instagram Account */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border border-pink-500/20">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  {instagramAccount?.profile_picture_url ? (
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={instagramAccount.profile_picture_url} />
                      <AvatarFallback>
                        <Instagram className="w-6 h-6 text-pink-500" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Instagram className="w-6 h-6 text-pink-500" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {instagramAccount ? (
                <>
                  <p className="font-semibold text-foreground truncate">
                    @{instagramAccount.username}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{formatFollowers(instagramAccount.followers_count)} seguidores</span>
                  </div>
                  <a 
                    href={`https://instagram.com/${instagramAccount.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 mt-1"
                  >
                    Ver perfil <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta Instagram vinculada
                </p>
              )}
            </div>
          </div>

          {/* Facebook Page */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
              <Facebook className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {facebookPage ? (
                <>
                  <p className="font-semibold text-foreground truncate">
                    {facebookPage.page_name}
                  </p>
                  {facebookPage.page_category && (
                    <p className="text-sm text-muted-foreground truncate">
                      {facebookPage.page_category}
                    </p>
                  )}
                  <a 
                    href={`https://facebook.com/${facebookPage.page_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
                  >
                    Ver página <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma página Facebook vinculada
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
