import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { PROVOCACOES_AGRESSIVAS } from '@/data/groupopsProvocacoes';

export interface GroupOpsTemplate {
  id: string;
  company_id: string;
  title: string;
  category: string;
  body: string;
  variants: any;
  placeholders: string[] | null;
  tone: string | null;
  constraints_json: any;
  created_at: string;
  updated_at: string;
}

export const TEMPLATE_CATEGORIES = [
  { value: 'DAILY_PROMPT', label: 'Provocação Diária' },
  { value: 'CHECKIN', label: 'Check-in' },
  { value: 'CHALLENGE', label: 'Desafio' },
  { value: 'CASE_STUDY', label: 'Case Anônimo' },
  { value: 'RANKING', label: 'Ranking' },
  { value: 'WELCOME', label: 'Boas-vindas' },
  { value: 'REACTIVATION', label: 'Reativação' },
  { value: 'CUSTOM', label: 'Personalizada' },
];

export const TEMPLATE_TONES = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Profissional' },
  { value: 'motivational', label: 'Motivacional' },
  { value: 'provocative', label: 'Provocativo' },
  { value: 'educational', label: 'Educativo' },
];

export const AVAILABLE_PLACEHOLDERS = [
  { key: '{{nome}}', description: 'Nome do membro' },
  { key: '{{grupo}}', description: 'Nome do grupo' },
  { key: '{{empresa}}', description: 'Empresa do membro' },
  { key: '{{streak}}', description: 'Dias de streak' },
  { key: '{{pontos}}', description: 'Pontuação atual' },
  { key: '{{ranking}}', description: 'Posição no ranking' },
  { key: '{{dia_semana}}', description: 'Dia da semana' },
  { key: '{{top1_nome}}', description: '1º lugar - nome' },
  { key: '{{top1_score}}', description: '1º lugar - pontos' },
  { key: '{{top2_nome}}', description: '2º lugar - nome' },
  { key: '{{top2_score}}', description: '2º lugar - pontos' },
  { key: '{{top3_nome}}', description: '3º lugar - nome' },
  { key: '{{top3_score}}', description: '3º lugar - pontos' },
  { key: '{{dor_principal}}', description: 'Dor principal do membro' },
];

function extractPlaceholders(body: string): string[] | null {
  const matches = body.match(/\{\{[^}]+\}\}/g);
  if (!matches || matches.length === 0) return null;
  return Array.from(new Set(matches));
}

export const DEFAULT_TEMPLATES: Array<{ title: string; category: string; tone: string; body: string }> = [
  // 🔥 PROVOCAÇÃO DIÁRIA (10)
  { title: 'P1 – Verdade desconfortável', category: 'DAILY_PROMPT', tone: 'provocative', body: '❌ Verdade desconfortável:\n\nSe sua software house depende de indicação, você não tem crescimento.\n\nConcorda ou discorda? Por quê?' },
  { title: 'P2 – Licença mensal', category: 'DAILY_PROMPT', tone: 'provocative', body: '🚨 Polêmico, mas real:\n\nLicença mensal não gera previsibilidade.\n\nQuem ainda defende isso?' },
  { title: 'P3 – Emprego ou empresa', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Se o seu time para, sua empresa para?\n\nSe sim, você construiu um emprego, não uma empresa.\n\nO que você acha disso?' },
  { title: 'P4 – Churn acima de 3%', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Churn acima de 3% ao mês não é "normal".\n\nÉ falta de gestão.\n\nVocê concorda?' },
  { title: 'P5 – Estrutura vs Venda', category: 'DAILY_PROMPT', tone: 'provocative', body: 'A maioria das software houses quebra com faturamento crescente.\n\nO problema não é venda.\n\nÉ estrutura.\n\nConcorda ou discorda?' },
  { title: 'P6 – Ponto de equilíbrio', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Pergunta sincera:\n\nVocê sabe exatamente quanto precisa vender todo mês para não ter prejuízo?' },
  { title: 'P7 – Software é meio', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Software não é produto.\n\nÉ meio.\n\nResultado é o produto.\n\nO que você pensa sobre isso?' },
  { title: 'P8 – Comercial real', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Seu comercial vende ou apenas tira pedido?\n\nSeja honesto.' },
  { title: 'P9 – Crescer sem processo', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Crescer sem processo é acelerar o caos.\n\nJá viveu isso?' },
  { title: 'P10 – Teste de sobrevivência', category: 'DAILY_PROMPT', tone: 'provocative', body: 'Se hoje você perdesse seus 3 maiores clientes, sua empresa sobreviveria?\n\nSim ou não?' },

  // 📊 CHECK-IN (5)
  { title: 'C1 – Check-in de CEO', category: 'CHECKIN', tone: 'professional', body: '🔎 Check-in de CEO\n\nDe 0 a 10, quão previsível está o faturamento da sua software house hoje?' },
  { title: 'C2 – Controle de operação', category: 'CHECKIN', tone: 'professional', body: '📉 Check-in rápido\n\nQual é o nível de controle que você tem sobre sua operação hoje?\n\nResponda de 0 a 10.' },
  { title: 'C3 – Gargalo estratégico', category: 'CHECKIN', tone: 'professional', body: '🎯 Check-in estratégico\n\nHoje, o maior gargalo da sua empresa está em qual área?\n\nResponda com: VENDAS / CHURN / PROCESSOS / TIME / FINANCEIRO' },
  { title: 'C4 – Consistência', category: 'CHECKIN', tone: 'professional', body: '🔁 Check-in de consistência\n\nVocê sabe exatamente o que precisa fazer esta semana para melhorar seus números?\n\n0 = não faço ideia | 10 = totalmente claro' },
  { title: 'C5 – Maturidade', category: 'CHECKIN', tone: 'professional', body: '📌 Check-in de maturidade\n\nSua empresa depende mais de você ou de processos?\n\n0 = totalmente de mim | 10 = totalmente de processos' },

  // ⏱️ DESAFIO 48H (5)
  { title: 'D1 – CEO Operacional', category: 'CHALLENGE', tone: 'provocative', body: '🎯 Desafio 48h – CEO Operacional\n\nEm 48 horas, responda aqui:\n\n👉 Qual é hoje o gargalo nº1 da sua operação?' },
  { title: 'D2 – Documente um processo', category: 'CHALLENGE', tone: 'provocative', body: '⚙️ Desafio 48h\n\nDocumente UM processo crítico da sua empresa.\n\nMesmo que seja simples.\n\nDepois volte aqui e diga: "feito".' },
  { title: 'D3 – CAC e Ticket', category: 'CHALLENGE', tone: 'provocative', body: '📊 Desafio 48h – Gestão real\n\nDescubra hoje:\n👉 seu CAC\n👉 seu ticket médio\n\nQuem fizer, comenta "feito".' },
  { title: 'D4 – Feedback do cliente', category: 'CHALLENGE', tone: 'provocative', body: '🔥 Desafio 48h\n\nConverse com um cliente ativo e pergunte:\n\n"O que faria você sair da nossa empresa?"\n\nDepois compartilhe o aprendizado.' },
  { title: 'D5 – Delegação', category: 'CHALLENGE', tone: 'provocative', body: '🧠 Desafio 48h\n\nListe 3 coisas que só você faz hoje na empresa.\n\nAgora marque qual delas deveria ser delegada.' },

  // 📉 CASE ANÔNIMO (4)
  { title: 'CA1 – Lucro desapareceu', category: 'CASE_STUDY', tone: 'professional', body: '📉 Case real de software house (anônimo):\n\n"Crescemos o faturamento, mas o lucro desapareceu."\n\nO que você analisaria primeiro?' },
  { title: 'CA2 – Implantação gargalo', category: 'CASE_STUDY', tone: 'professional', body: '⚠️ Case anônimo:\n\n"Vendemos bem, mas a implantação virou gargalo e o churn aumentou."\n\nComo você resolveria?' },
  { title: 'CA3 – Dependência do fundador', category: 'CASE_STUDY', tone: 'professional', body: '🚨 Case real:\n\n"Dependíamos totalmente do fundador para vender."\n\nQual o primeiro passo para sair disso?' },
  { title: 'CA4 – Falta de previsibilidade', category: 'CASE_STUDY', tone: 'professional', body: '📊 Case anônimo:\n\n"Temos muitos clientes, mas pouca previsibilidade."\n\nOnde está o erro?' },

  // 🏆 RANKING SEMANAL (3)
  { title: 'R1 – Ranking Top 3', category: 'RANKING', tone: 'motivational', body: '🏆 Ranking dos CEOs mais ativos da semana\n\n🥇 {{top1_nome}} – {{top1_score}} pts\n🥈 {{top2_nome}} – {{top2_score}} pts\n🥉 {{top3_nome}} – {{top3_score}} pts\n\nEngajamento aqui não é vaidade.\nÉ acesso.' },
  { title: 'R2 – Top 10', category: 'RANKING', tone: 'motivational', body: '📊 Top 10 da semana\n\nQuem participa, cresce mais rápido.\n\nQuem fica fora, fica invisível.' },
  { title: 'R3 – Acesso prioritário', category: 'RANKING', tone: 'motivational', body: '🔥 Ranking fechado\n\nOs mais ativos da semana receberão acesso prioritário aos próximos conteúdos.' },

  // 👋 BOAS-VINDAS / REATIVAÇÃO (3)
  { title: 'B1 – Boas-vindas', category: 'WELCOME', tone: 'casual', body: '👋 Bem-vindo(a), {{nome}}!\n\nEsse grupo é para empresários de software que querem crescimento com previsibilidade.\n\nSe apresente rapidamente:\n👉 empresa\n👉 nicho\n👉 maior desafio hoje' },
  { title: 'B2 – Reativação', category: 'REACTIVATION', tone: 'casual', body: '👀 {{nome}}, você anda silencioso por aqui.\n\nQual o maior desafio que você está enfrentando hoje na empresa?' },
  { title: 'B3 – Personalizada', category: 'REACTIVATION', tone: 'casual', body: '{{nome}}, pelo que você comentou sobre {{dor_principal}}, esse tema pode te ajudar bastante.\n\nO que você está travando hoje nisso?' },
];

export function useGroupOpsTemplates() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const templatesQuery = useQuery({
    queryKey: ['groupops-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GroupOpsTemplate[];
    },
    enabled: !!companyId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<GroupOpsTemplate>) => {
      const { id, created_at, updated_at, company_id, ...rest } = template;
      const { data, error } = await supabase
        .from('groupops_templates')
        .insert({ ...rest, company_id: companyId!, title: rest.title ?? 'Novo Template', body: rest.body ?? '' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('groupops_templates')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template atualizado');
    },
    onError: () => toast.error('Erro ao atualizar template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groupops_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template excluído');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  const seedAllTemplates = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Sem company_id');
      const allTemplates = [...DEFAULT_TEMPLATES, ...PROVOCACOES_AGRESSIVAS];
      const rows = allTemplates.map((t) => ({
        company_id: companyId,
        title: t.title,
        category: t.category,
        tone: t.tone,
        body: t.body,
        placeholders: extractPlaceholders(t.body),
      }));
      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase
          .from('groupops_templates')
          .insert(batch as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Todos os templates carregados!');
    },
    onError: () => toast.error('Erro ao carregar templates'),
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedAllTemplates,
  };
}
