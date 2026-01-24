import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List, Plus, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, XCircle, Loader2, Filter, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useScheduledPosts, ScheduledPost } from '@/hooks/useScheduledPosts';
import { useFacebookPages } from '@/hooks/useFacebookPages';
import { useClients } from '@/hooks/useClients';
import { useTeams } from '@/hooks/useTeams';
import { NewPostModal } from '@/components/scheduling/NewPostModal';
import { PostCard } from '@/components/scheduling/PostCard';
import { PostPreviewModal } from '@/components/scheduling/PostPreviewModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientCombobox } from '@/components/scheduling/ClientCombobox';

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: Clock },
  scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500', icon: Clock },
  publishing: { label: 'Publicando', color: 'bg-yellow-500/10 text-yellow-500', icon: Loader2 },
  published: { label: 'Publicado', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const Agendamento = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  
  // Filters
  const [clientFilter, setClientFilter] = useState<string>('');
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from?: Date; to?: Date }>({});

  const { posts, loading, fetchPosts, deletePost, cancelPost, reschedulePost, publishNow } = useScheduledPosts();
  const { pages, instagramAccounts } = useFacebookPages();
  const { clients } = useClients();
  const { teams } = useTeams();

  // Create a map of client_id to team_id for filtering
  const clientTeamMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    clients.forEach(client => {
      map[client.id] = client.team_id || null;
    });
    return map;
  }, [clients]);

  // Filter posts based on selected filters
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Client filter
      if (clientFilter && post.client_id !== clientFilter) {
        return false;
      }
      
      // Squad filter
      if (squadFilter !== 'all' && post.client_id) {
        const postTeamId = clientTeamMap[post.client_id];
        if (postTeamId !== squadFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false;
      }

      // Date range filter (only for list view)
      if (dateRangeFilter.from || dateRangeFilter.to) {
        const postDate = new Date(post.scheduled_at);
        if (dateRangeFilter.from && postDate < dateRangeFilter.from) {
          return false;
        }
        if (dateRangeFilter.to) {
          const endOfDay = new Date(dateRangeFilter.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (postDate > endOfDay) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [posts, clientFilter, squadFilter, clientTeamMap, statusFilter, dateRangeFilter]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const postsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledPost[]> = {};
    filteredPosts.forEach(post => {
      const dateKey = format(new Date(post.scheduled_at), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(post);
    });
    return grouped;
  }, [filteredPosts]);

  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return postsByDate[dateKey] || [];
  }, [selectedDate, postsByDate]);

  const stats = useMemo(() => ({
    scheduled: filteredPosts.filter(p => p.status === 'scheduled').length,
    published: filteredPosts.filter(p => p.status === 'published').length,
    failed: filteredPosts.filter(p => p.status === 'failed').length,
    total: filteredPosts.length,
  }), [filteredPosts]);

  const handlePreviewPost = (post: ScheduledPost) => {
    setPreviewPost(post);
  };

  const handleEditPost = (post: ScheduledPost) => {
    setPreviewPost(null);
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleNewPost = (date?: Date) => {
    setSelectedPost(null);
    if (date) setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
    fetchPosts();
  };

  const clearFilters = () => {
    setClientFilter('');
    setSquadFilter('all');
    setStatusFilter('all');
    setDateRangeFilter({});
  };

  const hasActiveFilters = clientFilter || squadFilter !== 'all' || statusFilter !== 'all' || dateRangeFilter.from || dateRangeFilter.to;

  const handleStatusFilterClick = (status: string) => {
    setStatusFilter(prev => prev === status ? 'all' : status);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agendamento de Posts</h1>
            <p className="text-muted-foreground">Agende e gerencie publicações no Instagram e Facebook</p>
          </div>
          <Button onClick={() => handleNewPost()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Filtrar por Cliente
                </label>
                <ClientCombobox
                  clients={clients}
                  value={clientFilter}
                  onValueChange={setClientFilter}
                  placeholder="Todos os clientes"
                />
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Filtrar por Squad
                </label>
                <Select value={squadFilter} onValueChange={setSquadFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os squads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os squads</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats - Clickable Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              statusFilter === 'scheduled' && "ring-2 ring-primary border-primary"
            )}
            onClick={() => handleStatusFilterClick('scheduled')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{stats.scheduled}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Agendados
              </div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-green-500/50",
              statusFilter === 'published' && "ring-2 ring-green-500 border-green-500"
            )}
            onClick={() => handleStatusFilterClick('published')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">{stats.published}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Publicados
              </div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-destructive/50",
              statusFilter === 'failed' && "ring-2 ring-destructive border-destructive"
            )}
            onClick={() => handleStatusFilterClick('failed')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Falharam
              </div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              statusFilter === 'all' && "ring-2 ring-primary border-primary"
            )}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <List className="h-3 w-3" />
                Total
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayPosts = postsByDate[dateKey] || [];
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <button
                          key={dateKey}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            relative min-h-[80px] p-1 rounded-lg border transition-colors
                            ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
                            ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'}
                            ${isToday ? 'bg-primary/5' : ''}
                            hover:border-primary/50
                          `}
                        >
                          <span className={`
                            text-sm font-medium
                            ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                            ${isToday ? 'text-primary' : ''}
                          `}>
                            {format(day, 'd')}
                          </span>
                          
                          {dayPosts.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {dayPosts.slice(0, 2).map(post => {
                                const StatusIcon = statusConfig[post.status].icon;
                                return (
                                  <div
                                    key={post.id}
                                    className={`
                                      text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5
                                      ${post.platforms.includes('instagram') ? 'bg-pink-500/10 text-pink-600' : 'bg-blue-500/10 text-blue-600'}
                                    `}
                                  >
                                    <StatusIcon className="h-2 w-2 flex-shrink-0" />
                                    <span className="truncate">{format(new Date(post.scheduled_at), 'HH:mm')}</span>
                                  </div>
                                );
                              })}
                              {dayPosts.length > 2 && (
                                <div className="text-[10px] text-muted-foreground">
                                  +{dayPosts.length - 2} mais
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Selected day details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>
                      {selectedDate 
                        ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                        : 'Selecione uma data'}
                    </span>
                    {selectedDate && (
                      <Button size="sm" variant="outline" onClick={() => handleNewPost(selectedDate)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedDatePosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum post agendado</p>
                      {selectedDate && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => handleNewPost(selectedDate)}
                          className="mt-2"
                        >
                          Agendar post
                        </Button>
                      )}
                    </div>
                  ) : (
                    selectedDatePosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        compact
                        onPreview={() => handlePreviewPost(post)}
                        onEdit={() => handleEditPost(post)}
                        onDelete={() => deletePost(post.id)}
                        onCancel={() => cancelPost(post.id)}
                        onPublishNow={() => publishNow(post.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Todos os Posts</CardTitle>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {dateRangeFilter.from ? (
                          dateRangeFilter.to ? (
                            <>
                              {format(dateRangeFilter.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRangeFilter.to, "dd/MM/yy", { locale: ptBR })}
                            </>
                          ) : (
                            format(dateRangeFilter.from, "dd/MM/yyyy", { locale: ptBR })
                          )
                        ) : (
                          "Filtrar por data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Período</span>
                          {(dateRangeFilter.from || dateRangeFilter.to) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDateRangeFilter({})}
                              className="h-auto py-1 px-2 text-xs"
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                      </div>
                      <CalendarComponent
                        mode="range"
                        selected={{ from: dateRangeFilter.from, to: dateRangeFilter.to }}
                        onSelect={(range) => setDateRangeFilter({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{hasActiveFilters ? 'Nenhum post encontrado com os filtros selecionados' : 'Nenhum post agendado ainda'}</p>
                    {!hasActiveFilters && (
                      <Button variant="link" onClick={() => handleNewPost()}>
                        Criar primeiro post
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onPreview={() => handlePreviewPost(post)}
                        onEdit={() => handleEditPost(post)}
                        onDelete={() => deletePost(post.id)}
                        onCancel={() => cancelPost(post.id)}
                        onPublishNow={() => publishNow(post.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PostPreviewModal
        open={!!previewPost}
        onClose={() => setPreviewPost(null)}
        post={previewPost}
        onEdit={() => previewPost && handleEditPost(previewPost)}
      />

      <NewPostModal
        open={isModalOpen}
        onClose={handleModalClose}
        post={selectedPost}
        initialDate={selectedDate}
        pages={pages}
        instagramAccounts={instagramAccounts}
      />
    </DashboardLayout>
  );
};

export default Agendamento;
