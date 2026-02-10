import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useGroupOpsScoring, DEFAULT_SCORING_RULES, type GroupOpsScoringProfile, type GroupOpsBadge } from '@/hooks/useGroupOpsScoring';
import { Trophy, Award, Star, Plus, Trash2, Edit, TrendingUp, TrendingDown, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SCORING_RULE_LABELS: Record<string, string> = {
  message: 'Mensagem enviada',
  checkin: 'Resposta a check-in',
  challenge_done: 'Desafio concluído',
  case: 'Case compartilhado',
  useful_reply: 'Resposta útil',
  streak_bonus: 'Bônus de streak',
  spam: 'Spam detectado',
  warning: 'Advertência',
};

const BADGE_ICONS = ['🏆', '🎖️', '⭐', '🔥', '💎', '🚀', '👑', '🎯', '💪', '🧠', '🌟', '🏅'];

export default function GroupOpsScoring() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pontuação & Badges</h2>
        <p className="text-sm text-muted-foreground">Configure perfis de pontuação e badges de conquista</p>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles" className="gap-2"><Star className="h-4 w-4" /> Perfis de Pontuação</TabsTrigger>
          <TabsTrigger value="badges" className="gap-2"><Award className="h-4 w-4" /> Badges</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles"><ScoringProfilesTab /></TabsContent>
        <TabsContent value="badges"><BadgesTab /></TabsContent>
        <TabsContent value="ledger"><LedgerTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== Scoring Profiles Tab ===== */
function ScoringProfilesTab() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useGroupOpsScoring();
  const [editingProfile, setEditingProfile] = useState<GroupOpsScoringProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Novo Perfil</Button>
      </div>

      {profiles.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum perfil de pontuação</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie um perfil para definir as regras de pontuação</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Criar Perfil</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const rules = (profile.rules_json ?? {}) as Record<string, number>;
            return (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {profile.name}
                        {profile.is_default && <Badge variant="default" className="text-xs">Padrão</Badge>}
                      </CardTitle>
                      {profile.description && <p className="text-xs text-muted-foreground mt-1">{profile.description}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {Object.entries(rules).map(([key, pts]) => (
                      <div key={key} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                        <span className="text-muted-foreground truncate">{SCORING_RULE_LABELS[key] ?? key}</span>
                        <span className={pts >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {pts >= 0 ? '+' : ''}{pts}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setEditingProfile(profile)}><Edit className="h-3 w-3 mr-1" /> Editar</Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setDeletingId(profile.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProfileFormModal
        open={showCreate || !!editingProfile}
        onClose={() => { setShowCreate(false); setEditingProfile(null); }}
        profile={editingProfile}
        onSave={(data) => {
          if (editingProfile) updateProfile.mutate({ id: editingProfile.id, ...data });
          else createProfile.mutate(data);
          setShowCreate(false); setEditingProfile(null);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir perfil?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deletingId) { deleteProfile.mutate(deletingId); setDeletingId(null); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Profile Form Modal ===== */
function ProfileFormModal({ open, onClose, profile, onSave }: { open: boolean; onClose: () => void; profile: GroupOpsScoringProfile | null; onSave: (data: Partial<GroupOpsScoringProfile>) => void }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [description, setDescription] = useState(profile?.description ?? '');
  const [isDefault, setIsDefault] = useState(profile?.is_default ?? false);
  const [rules, setRules] = useState<Record<string, number>>((profile?.rules_json as Record<string, number>) ?? DEFAULT_SCORING_RULES);

  React.useEffect(() => {
    if (profile) { setName(profile.name); setDescription(profile.description ?? ''); setIsDefault(profile.is_default ?? false); setRules((profile.rules_json as Record<string, number>) ?? DEFAULT_SCORING_RULES); }
    else { setName(''); setDescription(''); setIsDefault(false); setRules(DEFAULT_SCORING_RULES); }
  }, [profile, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{profile ? 'Editar Perfil' : 'Novo Perfil de Pontuação'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Padrão, Hardcore, Elite" /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="flex items-center gap-3"><Switch checked={isDefault} onCheckedChange={setIsDefault} /><Label>Perfil padrão</Label></div>
          <div className="space-y-2">
            <Label>Regras de Pontuação</Label>
            <div className="space-y-2">
              {Object.entries(rules).map(([key, pts]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm flex-1 min-w-0 truncate">{SCORING_RULE_LABELS[key] ?? key}</span>
                  <Input type="number" value={pts} onChange={(e) => setRules((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))} className="w-20 text-center" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name} onClick={() => onSave({ name, description: description || null, is_default: isDefault, rules_json: rules })}>{profile ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Badges Tab ===== */
function BadgesTab() {
  const { badges, isLoading, createBadge, updateBadge, deleteBadge } = useGroupOpsScoring();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBadge, setEditingBadge] = useState<GroupOpsBadge | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Novo Badge</Button>
      </div>

      {badges.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum badge criado</h3>
          <p className="text-sm text-muted-foreground mt-1">Badges motivam membros com conquistas visuais</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Criar Badge</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <Card key={badge.id} className="hover:shadow-md transition-shadow text-center">
              <CardContent className="py-6 space-y-2">
                <span className="text-4xl block">{badge.icon ?? '🎖️'}</span>
                <h4 className="font-semibold">{badge.name}</h4>
                {badge.description && <p className="text-xs text-muted-foreground">{badge.description}</p>}
                {badge.rule_json && (
                  <p className="text-xs text-muted-foreground italic">
                    {(badge.rule_json as any)?.condition ?? 'Regra personalizada'}
                  </p>
                )}
                <div className="flex gap-1 justify-center pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingBadge(badge)}><Edit className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingId(badge.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BadgeFormModal
        open={showCreate || !!editingBadge}
        onClose={() => { setShowCreate(false); setEditingBadge(null); }}
        badge={editingBadge}
        onSave={(data) => {
          if (editingBadge) updateBadge.mutate({ id: editingBadge.id, ...data });
          else createBadge.mutate(data);
          setShowCreate(false); setEditingBadge(null);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir badge?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deletingId) { deleteBadge.mutate(deletingId); setDeletingId(null); } }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Badge Form Modal ===== */
function BadgeFormModal({ open, onClose, badge, onSave }: { open: boolean; onClose: () => void; badge: GroupOpsBadge | null; onSave: (data: Partial<GroupOpsBadge>) => void }) {
  const [name, setName] = useState(badge?.name ?? '');
  const [description, setDescription] = useState(badge?.description ?? '');
  const [icon, setIcon] = useState(badge?.icon ?? '🏆');
  const [ruleCondition, setRuleCondition] = useState((badge?.rule_json as any)?.condition ?? '');

  React.useEffect(() => {
    if (badge) { setName(badge.name); setDescription(badge.description ?? ''); setIcon(badge.icon ?? '🏆'); setRuleCondition((badge.rule_json as any)?.condition ?? ''); }
    else { setName(''); setDescription(''); setIcon('🏆'); setRuleCondition(''); }
  }, [badge, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{badge ? 'Editar Badge' : 'Novo Badge'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {BADGE_ICONS.map((i) => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  className={`text-2xl p-1.5 rounded-lg border-2 transition-colors ${icon === i ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted'}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Streak Master" /></div>
          <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do badge" /></div>
          <div className="space-y-2">
            <Label>Condição de conquista</Label>
            <Textarea value={ruleCondition} onChange={(e) => setRuleCondition(e.target.value)} rows={2} placeholder="Ex: 7 dias consecutivos de participação" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name} onClick={() => onSave({ name, description: description || null, icon, rule_json: ruleCondition ? { condition: ruleCondition } : null })}>{badge ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Ledger Tab ===== */
function LedgerTab() {
  const { ledger, isLoading } = useGroupOpsScoring();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      {ledger.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum registro de pontuação</h3>
          <p className="text-sm text-muted-foreground mt-1">O histórico aparecerá quando o motor de pontuação estiver ativo</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {ledger.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`rounded-full p-1.5 ${entry.points >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {entry.points >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                  <span className={`text-sm font-bold ${entry.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.points >= 0 ? '+' : ''}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
