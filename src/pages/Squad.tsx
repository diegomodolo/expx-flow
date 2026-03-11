import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeams, Team } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { SquadDialog } from "@/components/squads/SquadDialog";
import { DeleteSquadDialog } from "@/components/squads/DeleteSquadDialog";
import { SquadMembersDialog } from "@/components/squads/SquadMembersDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Search, 
  Loader2,
  Edit,
  Users,
  BarChart3,
  Briefcase,
  User,
  Megaphone,
  Palette,
  Code,
  Target,
  Lightbulb,
  HeadphonesIcon,
  Crown,
  MessageSquare,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const iconMap: { [key: string]: React.ComponentType<unknown> } = {
  Megaphone,
  Palette,
  Code,
  BarChart3,
  Users,
  Target,
  Briefcase,
  Lightbulb,
  HeadphonesIcon,
};

const Squad = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<Team | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const { teams, loading, error, createTeam, updateTeam, deleteTeam, fetchTeams } = useTeams();
  const { toast } = useToast();

  const activeTeams = teams.filter(team => team.progress > 0).length;
  const totalMembers = teams.reduce((acc, team) => acc + (team.members?.length || 0), 0);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchTerm
      ? [team.name, team.description].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    return matchesSearch;
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const getPerformanceBadge = (progress: number) => {
    if (progress >= 90) return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-xs">Alta</Badge>;
    if (progress >= 70) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-0 text-xs">Média</Badge>;
    return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 text-xs">Baixa</Badge>;
  };

  const PersonCell = ({ person }: { person?: { name: string; avatar?: string | null } | null }) => {
    if (!person) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-1.5">
        <Avatar className="h-5 w-5">
          <AvatarImage src={person.avatar || undefined} />
          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
            {person.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-foreground truncate max-w-[120px]">{person.name}</span>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando squads...</span>
          </div>
        )}
        
        {!loading && (
          <>
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="text-primary text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Squads</h1>
                  <p className="text-muted-foreground">Organize e monitore suas equipes de trabalho</p>
                </div>
              </div>
              <Button 
                className="flex items-center space-x-2"
                onClick={() => {
                  setDialogMode('create');
                  setSelectedSquad(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Squad</span>
              </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{teams.length}</div>
                      <div className="text-sm text-muted-foreground">Total de Squads</div>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="text-primary w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{activeTeams}</div>
                      <div className="text-sm text-muted-foreground">Squads Ativos</div>
                    </div>
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-green-500 w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{totalMembers}</div>
                      <div className="text-sm text-muted-foreground">Total de Membros</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <User className="text-blue-500 w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar squad..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredTeams.length} squad{filteredTeams.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <Card className="border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Squad</TableHead>
                    <TableHead>Líder</TableHead>
                    <TableHead>CS WhatsApp</TableHead>
                    <TableHead>Autorizador</TableHead>
                    <TableHead className="text-center">Membros</TableHead>
                    <TableHead className="text-center">Projetos</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Nenhum squad encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeams.map((team) => {
                      const IconComponent = iconMap[team.icon] || Code;
                      return (
                        <TableRow key={team.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: team.color ? `${team.color}20` : undefined,
                                }}
                              >
                                <IconComponent
                                  className="w-4 h-4"
                                  style={{ color: team.color || undefined }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground text-sm truncate">{team.name}</div>
                                {team.description && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{team.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><PersonCell person={team.leader} /></TableCell>
                          <TableCell><PersonCell person={team.whatsapp_responsible} /></TableCell>
                          <TableCell><PersonCell person={team.authorizer} /></TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {team.members && team.members.length > 0 ? (
                                <>
                                  <div className="flex -space-x-1.5">
                                    {team.members.slice(0, 3).map((member) => (
                                      <Tooltip key={member.id}>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-5 w-5 border border-background">
                                            <AvatarImage src={member.avatar || undefined} />
                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                              {member.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">{member.name}</TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground ml-1">{team.members.length}</span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">0</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-foreground">{team.active_tasks}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getPerformanceBadge(team.progress)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedSquad(team);
                                      setMembersDialogOpen(true);
                                    }}
                                  >
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Membros</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setDialogMode('edit');
                                      setSelectedSquad(team);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setSelectedSquad(team);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
        
        {/* Dialogs */}
        <SquadDialog
          key={`${dialogMode}-${selectedSquad?.id || 'new'}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedSquad(null);
              fetchTeams();
            }
          }}
          onSubmit={
            dialogMode === 'create' 
              ? createTeam 
              : dialogMode === 'edit' && selectedSquad
                ? (squadData) => updateTeam(selectedSquad.id, squadData)
                : () => Promise.resolve(null)
          }
          squad={dialogMode === 'create' ? undefined : selectedSquad || undefined}
          title={
            dialogMode === 'create' 
              ? "Adicionar Squad" 
              : dialogMode === 'edit' 
                ? "Editar Squad" 
                : "Visualizar Squad"
          }
          readOnly={dialogMode === 'view'}
        />
        
        <DeleteSquadDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={deleteTeam}
          squad={selectedSquad}
        />

        {selectedSquad && (
          <SquadMembersDialog
            open={membersDialogOpen}
            onOpenChange={(open) => {
              setMembersDialogOpen(open);
              if (!open) {
                setSelectedSquad(null);
              }
            }}
            squad={selectedSquad}
            onUpdate={fetchTeams}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Squad;
