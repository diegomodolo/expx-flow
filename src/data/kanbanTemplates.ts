export interface KanbanTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  columns: Array<{
    name: string;
    status: 'todo' | 'progress' | 'review' | 'done';
    color: string;
  }>;
}

export const KANBAN_TEMPLATES: KanbanTemplate[] = [
  {
    id: 'agency',
    name: 'Agência',
    description: 'Fluxo completo para gestão de campanhas e clientes',
    icon: '🏢',
    columns: [
      { name: 'Backlog', status: 'todo', color: '#6B7280' },
      { name: 'Briefing', status: 'todo', color: '#F59E0B' },
      { name: 'Em Produção', status: 'progress', color: '#3B82F6' },
      { name: 'Aprovação Cliente', status: 'review', color: '#8B5CF6' },
      { name: 'Ajustes', status: 'review', color: '#EC4899' },
      { name: 'Publicado', status: 'done', color: '#22C55E' },
    ]
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    description: 'Simples e direto para profissionais autônomos',
    icon: '💻',
    columns: [
      { name: 'A Fazer', status: 'todo', color: '#6B7280' },
      { name: 'Trabalhando', status: 'progress', color: '#3B82F6' },
      { name: 'Aguardando Feedback', status: 'review', color: '#F59E0B' },
      { name: 'Entregue', status: 'done', color: '#22C55E' },
    ]
  },
  {
    id: 'support',
    name: 'Suporte',
    description: 'Ideal para atendimento e resolução de tickets',
    icon: '🎧',
    columns: [
      { name: 'Novo', status: 'todo', color: '#EF4444' },
      { name: 'Em Análise', status: 'progress', color: '#F59E0B' },
      { name: 'Em Atendimento', status: 'progress', color: '#3B82F6' },
      { name: 'Aguardando Cliente', status: 'review', color: '#8B5CF6' },
      { name: 'Resolvido', status: 'done', color: '#22C55E' },
    ]
  },
  {
    id: 'content',
    name: 'Produção de Conteúdo',
    description: 'Para criadores e equipes de marketing',
    icon: '✍️',
    columns: [
      { name: 'Ideias', status: 'todo', color: '#EC4899' },
      { name: 'Roteiro', status: 'todo', color: '#F59E0B' },
      { name: 'Produzindo', status: 'progress', color: '#3B82F6' },
      { name: 'Edição', status: 'progress', color: '#8B5CF6' },
      { name: 'Aprovação', status: 'review', color: '#14B8A6' },
      { name: 'Publicado', status: 'done', color: '#22C55E' },
    ]
  },
  {
    id: 'simple',
    name: 'Básico',
    description: 'Layout padrão simples com 4 colunas',
    icon: '📋',
    columns: [
      { name: 'Pendente', status: 'todo', color: '#6B7280' },
      { name: 'Em Andamento', status: 'progress', color: '#3B82F6' },
      { name: 'Em Revisão', status: 'review', color: '#8B5CF6' },
      { name: 'Concluída', status: 'done', color: '#22C55E' },
    ]
  }
];
