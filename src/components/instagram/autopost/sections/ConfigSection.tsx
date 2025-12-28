import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Edit, Loader2 } from 'lucide-react';

interface ConfigSectionProps {
  config: {
    name: string | null;
    post_briefing: string;
  };
  instagramAccount: {
    username: string;
    profile_picture_url: string | null;
  } | null;
  instagramAccountId: string;
  availableInstagramAccounts: Array<{
    id: string;
    username: string;
    profile_picture_url: string | null;
  }>;
  onUpdateConfig: (updates: { name?: string | null; post_briefing?: string; instagram_account_id?: string }) => void;
  isUpdating: boolean;
}

export function ConfigSection({
  config,
  instagramAccount,
  instagramAccountId,
  availableInstagramAccounts,
  onUpdateConfig,
  isUpdating,
}: ConfigSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBriefing, setEditBriefing] = useState('');
  const [editInstagramAccountId, setEditInstagramAccountId] = useState('');

  useEffect(() => {
    if (config) {
      setEditName(config.name || '');
      setEditBriefing(config.post_briefing);
      setEditInstagramAccountId(instagramAccountId);
    }
  }, [config, instagramAccountId]);

  const handleSave = () => {
    onUpdateConfig({
      name: editName || null,
      post_briefing: editBriefing,
      instagram_account_id: editInstagramAccountId,
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração
          </CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label>Nome da Automação</Label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Nome da automação"
              />
            </div>

            <div className="space-y-2">
              <Label>Conta do Instagram</Label>
              <Select value={editInstagramAccountId} onValueChange={setEditInstagramAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {availableInstagramAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={account.profile_picture_url || ''} />
                          <AvatarFallback className="text-xs">
                            {account.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        @{account.username}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Briefing das Postagens</Label>
              <Textarea
                value={editBriefing}
                onChange={(e) => setEditBriefing(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                O briefing é usado pela IA para gerar as imagens e legendas. Seja específico sobre o tema, estilo e tom desejado.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isUpdating || !editBriefing.trim() || !editInstagramAccountId}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-muted-foreground text-xs">Conta do Instagram</Label>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={instagramAccount?.profile_picture_url || ''} />
                  <AvatarFallback className="text-xs">
                    {instagramAccount?.username?.charAt(0).toUpperCase() || 'I'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">@{instagramAccount?.username || 'Não configurado'}</span>
              </div>
            </div>

            {config.name && (
              <div>
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <p className="text-sm font-medium">{config.name}</p>
              </div>
            )}

            <div>
              <Label className="text-muted-foreground text-xs">Briefing</Label>
              <p className="text-sm">{config.post_briefing}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
