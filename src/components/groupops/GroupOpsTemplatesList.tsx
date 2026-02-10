import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGroupOpsTemplates, TEMPLATE_CATEGORIES, TEMPLATE_TONES, AVAILABLE_PLACEHOLDERS, type GroupOpsTemplate } from '@/hooks/useGroupOpsTemplates';
import { parseWhatsAppFormatting } from '@/lib/whatsappFormatting';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  FileText,
  Copy,
  Eye,
  Tag,
  Filter,
  Download,
  BarChart3,
  X,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function GroupOpsTemplatesList() {
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GroupOpsTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<GroupOpsTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useGroupOpsTemplates();

  const filtered = templates.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCategoryLabel = (cat: string) => TEMPLATE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  const getToneLabel = (tone: string | null) => TEMPLATE_TONES.find((t) => t.value === tone)?.label ?? tone;

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'DAILY_PROMPT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'CHECKIN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'CHALLENGE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'CASE_STUDY': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'RANKING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'WELCOME': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'REACTIVATION': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'CUSTOM': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'POLL': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return colors[cat] ?? '';
  };

  const getCategoryEmoji = (cat: string) => {
    const emojis: Record<string, string> = {
      'DAILY_PROMPT': '🔥',
      'CHECKIN': '📊',
      'CHALLENGE': '⏱️',
      'CASE_STUDY': '📉',
      'RANKING': '🏆',
      'WELCOME': '👋',
      'REACTIVATION': '🔄',
      'CUSTOM': '✏️',
      'POLL': '📊',
    };
    return emojis[cat] ?? '📄';
  };




  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">Modelos de mensagem com formatação WhatsApp e placeholders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando templates...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro template de mensagem</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((template) => {
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.title}</CardTitle>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                          {getCategoryEmoji(template.category)} {getCategoryLabel(template.category)}
                        </Badge>
                        {template.tone && <Badge variant="secondary" className="text-xs">{getToneLabel(template.tone)}</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* WhatsApp Preview Mini */}
                  <div className="bg-[#e5ddd5] rounded-lg p-3 max-h-[100px] overflow-hidden relative">
                    <div className="bg-[#dcf8c6] rounded-lg p-2 text-sm text-[#303030] shadow-sm max-w-[90%] ml-auto">
                      {template.category === 'POLL' ? (
                        <div>
                          <p className="font-medium text-xs mb-1">📊 {template.body.slice(0, 60)}{template.body.length > 60 ? '...' : ''}</p>
                          {(template.constraints_json as any)?.poll_options?.slice(0, 3).map((opt: string, i: number) => (
                            <div key={i} className="bg-white/40 rounded px-2 py-0.5 text-xs mt-0.5">{opt}</div>
                          ))}
                        </div>
                      ) : (
                        parseWhatsAppFormatting(template.body.slice(0, 120) + (template.body.length > 120 ? '...' : ''))
                      )}
                    </div>
                    {template.body.length > 120 && template.category !== 'POLL' && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#e5ddd5] to-transparent" />
                    )}
                  </div>

                  {/* Placeholders */}
                  {template.placeholders && template.placeholders.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.placeholders.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs gap-1">
                          <Tag className="h-3 w-3" />{p}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Variant indicator */}
                  {template.variants && (
                    <Badge variant="secondary" className="text-xs">Variante A/B</Badge>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate(template)}>
                      <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(template.body);
                      toast.success('Texto copiado');
                    }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setDeletingId(template.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Create/Edit Modal */}
      <TemplateFormModal
        open={showCreateModal || !!editingTemplate}
        onClose={() => { setShowCreateModal(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={(data) => {
          if (editingTemplate) {
            updateTemplate.mutate({ id: editingTemplate.id, ...data });
          } else {
            createTemplate.mutate(data);
          }
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
      />

      {/* Preview Modal */}
      <WhatsAppPreviewModal
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) { deleteTemplate.mutate(deletingId); setDeletingId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Template Form Modal ===== */
interface FormModalProps {
  open: boolean;
  onClose: () => void;
  template: GroupOpsTemplate | null;
  onSave: (data: Partial<GroupOpsTemplate>) => void;
}

function TemplateFormModal({ open, onClose, template, onSave }: FormModalProps) {
  const [title, setTitle] = useState(template?.title ?? '');
  const [category, setCategory] = useState(template?.category ?? 'DAILY_PROMPT');
  const [tone, setTone] = useState(template?.tone ?? 'casual');
  const [body, setBody] = useState(template?.body ?? '');
  const [variantB, setVariantB] = useState<string>((template?.variants as any)?.b ?? '');
  const [showVariantB, setShowVariantB] = useState(!!((template?.variants as any)?.b));

  // Poll-specific state
  const constraints = template?.constraints_json as any;
  const [pollOptions, setPollOptions] = useState<string[]>(constraints?.poll_options ?? ['', '']);
  const [multipleChoice, setMultipleChoice] = useState<boolean>((constraints?.selectable_count ?? 1) > 1);
  const [pollOptionsB, setPollOptionsB] = useState<string[]>(constraints?.poll_options_b ?? ['', '']);

  const isPoll = category === 'POLL';

  React.useEffect(() => {
    if (template) {
      setTitle(template.title);
      setCategory(template.category);
      setTone(template.tone ?? 'casual');
      setBody(template.body);
      const vb = (template.variants as any)?.b ?? '';
      setVariantB(vb);
      setShowVariantB(!!vb);
      const c = template.constraints_json as any;
      setPollOptions(c?.poll_options ?? ['', '']);
      setMultipleChoice((c?.selectable_count ?? 1) > 1);
      setPollOptionsB(c?.poll_options_b ?? ['', '']);
    } else {
      setTitle('');
      setCategory('DAILY_PROMPT');
      setTone('casual');
      setBody('');
      setVariantB('');
      setShowVariantB(false);
      setPollOptions(['', '']);
      setMultipleChoice(false);
      setPollOptionsB(['', '']);
    }
  }, [template, open]);

  const extractedPlaceholders = Array.from(new Set(
    [...(body.match(/\{\{[^}]+\}\}/g) ?? []), ...(variantB.match(/\{\{[^}]+\}\}/g) ?? [])]
  ));

  const insertPlaceholder = (key: string) => {
    setBody((prev) => prev + key);
  };

  const updatePollOption = (index: number, value: string, isB = false) => {
    const setter = isB ? setPollOptionsB : setPollOptions;
    setter(prev => { const copy = [...prev]; copy[index] = value; return copy; });
  };
  const addPollOption = (isB = false) => {
    const setter = isB ? setPollOptionsB : setPollOptions;
    const current = isB ? pollOptionsB : pollOptions;
    if (current.length < 12) setter(prev => [...prev, '']);
  };
  const removePollOption = (index: number, isB = false) => {
    const setter = isB ? setPollOptionsB : setPollOptions;
    const current = isB ? pollOptionsB : pollOptions;
    if (current.length > 2) setter(prev => prev.filter((_, i) => i !== index));
  };

  const validPollOptions = pollOptions.filter(o => o.trim());
  const canSave = title && body && (!isPoll || validPollOptions.length >= 2);

  const handleSave = () => {
    const data: Partial<GroupOpsTemplate> = {
      title,
      category,
      tone,
      body,
      placeholders: extractedPlaceholders.length > 0 ? extractedPlaceholders : null,
      variants: variantB ? { b: variantB } : null,
    };
    if (isPoll) {
      const pollConstraints: any = {
        poll_options: validPollOptions,
        selectable_count: multipleChoice ? validPollOptions.length : 1,
      };
      if (showVariantB) {
        const validB = pollOptionsB.filter(o => o.trim());
        if (validB.length >= 2) pollConstraints.poll_options_b = validB;
      }
      data.constraints_json = pollConstraints;
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do template" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tom</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Placeholders bar */}
          <div className="space-y-2">
            <Label>Placeholders disponíveis</Label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <Button key={p.key} size="sm" variant="outline" className="text-xs h-7" onClick={() => insertPlaceholder(p.key)} title={p.description}>
                  {p.key}
                </Button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>{isPoll ? 'Pergunta da Enquete' : `Mensagem ${showVariantB ? '(Variante A)' : ''}`}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={isPoll ? 3 : 5}
              placeholder={isPoll ? 'Ex: Qual é o maior desafio da sua empresa hoje?' : 'Use *negrito*, _itálico_, ~riscado~ e {{placeholders}}'} className="font-mono text-sm" />
          </div>

          {/* Poll Options */}
          {isPoll && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Opções da Enquete {showVariantB ? '(Variante A)' : ''}</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Múltipla escolha</Label>
                  <Switch checked={multipleChoice} onCheckedChange={setMultipleChoice} />
                </div>
              </div>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <Input value={opt} onChange={e => updatePollOption(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`} className="flex-1 h-8 text-sm" />
                    {pollOptions.length > 2 && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removePollOption(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 12 && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => addPollOption()}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                </Button>
              )}
            </div>
          )}

          {/* Live preview */}
          {body && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preview WhatsApp</Label>
              <div className="bg-[#e5ddd5] rounded-lg p-3">
                {isPoll ? (
                  <PollPreviewBubble question={body} options={validPollOptions} multipleChoice={multipleChoice} />
                ) : (
                  <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-[#303030] shadow-sm max-w-[85%] ml-auto whitespace-pre-wrap">
                    {parseWhatsAppFormatting(body)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Variant B toggle */}
          <div>
            {!showVariantB ? (
              <Button size="sm" variant="outline" onClick={() => setShowVariantB(true)}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar Variante B (Teste A/B)
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{isPoll ? 'Pergunta (Variante B)' : 'Mensagem (Variante B)'}</Label>
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => { setShowVariantB(false); setVariantB(''); setPollOptionsB(['', '']); }}>
                    Remover
                  </Button>
                </div>
                <Textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} rows={isPoll ? 3 : 4}
                  placeholder="Texto alternativo para teste A/B" className="font-mono text-sm" />
                {isPoll && (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium">Opções (Variante B)</Label>
                    {pollOptionsB.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <Input value={opt} onChange={e => updatePollOption(i, e.target.value, true)}
                          placeholder={`Opção ${i + 1}`} className="flex-1 h-8 text-sm" />
                        {pollOptionsB.length > 2 && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removePollOption(i, true)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {pollOptionsB.length < 12 && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => addPollOption(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                      </Button>
                    )}
                  </div>
                )}
                {variantB && !isPoll && (
                  <div className="bg-[#e5ddd5] rounded-lg p-3">
                    <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-[#303030] shadow-sm max-w-[85%] ml-auto whitespace-pre-wrap">
                      {parseWhatsAppFormatting(variantB)}
                    </div>
                  </div>
                )}
                {variantB && isPoll && (
                  <div className="bg-[#e5ddd5] rounded-lg p-3">
                    <PollPreviewBubble question={variantB} options={pollOptionsB.filter(o => o.trim())} multipleChoice={multipleChoice} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {template ? 'Salvar' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== WhatsApp Preview Modal ===== */
function WhatsAppPreviewModal({ open, onClose, template }: { open: boolean; onClose: () => void; template: GroupOpsTemplate | null }) {
  if (!template) return null;

  const sampleData: Record<string, string> = {
    '{{nome}}': 'João Silva',
    '{{grupo}}': 'Grupo Elite',
    '{{empresa}}': 'Tech Corp',
    '{{streak}}': '7',
    '{{pontos}}': '142',
    '{{ranking}}': '3º',
    '{{dia_semana}}': 'segunda-feira',
    '{{top1_nome}}': 'Carlos Mendes',
    '{{top1_score}}': '48',
    '{{top2_nome}}': 'Ana Souza',
    '{{top2_score}}': '35',
    '{{top3_nome}}': 'João Silva',
    '{{top3_score}}': '29',
    '{{dor_principal}}': 'churn alto',
  };

  const fillPlaceholders = (text: string) => {
    let filled = text;
    Object.entries(sampleData).forEach(([key, value]) => {
      filled = filled.split(key).join(value);
    });
    return filled;
  };

  const variantB = (template.variants as any)?.b;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preview: {template.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Phone mockup */}
          <div className="bg-[#0b141a] rounded-2xl p-2 mx-auto max-w-[320px]">
            {/* Chat header */}
            <div className="bg-[#202c33] rounded-t-xl px-3 py-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-xs text-[#aebac1]">GP</div>
              <div>
                <p className="text-sm font-medium text-[#e9edef]">Grupo Elite</p>
                <p className="text-[10px] text-[#8696a0]">Bot do grupo</p>
              </div>
            </div>
            {/* Chat body */}
            <div className="bg-[#0b141a] min-h-[200px] p-3 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'300\' height=\'300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'2\'/%3E%3Ccircle cx=\'150\' cy=\'100\' r=\'2\'/%3E%3Ccircle cx=\'250\' cy=\'50\' r=\'2\'/%3E%3C/g%3E%3C/svg%3E")' }}>
              {/* Variante A */}
              <div>
                {variantB && <p className="text-[10px] text-[#8696a0] mb-1 text-right">Variante A</p>}
                {template.category === 'POLL' ? (
                  <PollPreviewBubbleDark
                    question={fillPlaceholders(template.body)}
                    options={(template.constraints_json as any)?.poll_options ?? []}
                    multipleChoice={((template.constraints_json as any)?.selectable_count ?? 1) > 1}
                  />
                ) : (
                  <div className="bg-[#005c4b] rounded-lg p-2.5 text-sm text-[#e9edef] shadow-sm max-w-[90%] ml-auto whitespace-pre-wrap">
                    {parseWhatsAppFormatting(fillPlaceholders(template.body))}
                    <p className="text-[10px] text-[#ffffff99] text-right mt-1">09:00</p>
                  </div>
                )}
              </div>
              {/* Variante B */}
              {variantB && (
                <div>
                  <p className="text-[10px] text-[#8696a0] mb-1 text-right">Variante B</p>
                  {template.category === 'POLL' ? (
                    <PollPreviewBubbleDark
                      question={fillPlaceholders(variantB)}
                      options={(template.constraints_json as any)?.poll_options_b ?? (template.constraints_json as any)?.poll_options ?? []}
                      multipleChoice={((template.constraints_json as any)?.selectable_count ?? 1) > 1}
                    />
                  ) : (
                    <div className="bg-[#005c4b] rounded-lg p-2.5 text-sm text-[#e9edef] shadow-sm max-w-[90%] ml-auto whitespace-pre-wrap">
                      {parseWhatsAppFormatting(fillPlaceholders(variantB))}
                      <p className="text-[10px] text-[#ffffff99] text-right mt-1">09:00</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Sample data info */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Dados de exemplo usados:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(sampleData).map(([k, v]) => (
                <span key={k}><code className="bg-muted px-1 rounded">{k}</code> → {v}</span>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Poll Preview Bubble (Light - form preview) ===== */
function PollPreviewBubble({ question, options, multipleChoice }: { question: string; options: string[]; multipleChoice: boolean }) {
  return (
    <div className="bg-[#dcf8c6] rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
      <p className="text-sm text-[#303030] font-medium whitespace-pre-wrap mb-2">{parseWhatsAppFormatting(question)}</p>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/60 rounded-md px-3 py-1.5">
            <div className={`w-4 h-4 border-2 border-[#25D366] flex-shrink-0 flex items-center justify-center ${multipleChoice ? 'rounded' : 'rounded-full'}`} />
            <span className="text-sm text-[#303030]">{opt}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#00000066] mt-2">{multipleChoice ? 'Múltipla escolha' : 'Seleção única'} · {options.length} opções</p>
    </div>
  );
}

/* ===== Poll Preview Bubble (Dark - modal preview) ===== */
function PollPreviewBubbleDark({ question, options, multipleChoice }: { question: string; options: string[]; multipleChoice: boolean }) {
  return (
    <div className="bg-[#005c4b] rounded-lg p-2.5 shadow-sm max-w-[90%] ml-auto">
      <p className="text-sm text-[#e9edef] font-medium whitespace-pre-wrap mb-2">{parseWhatsAppFormatting(question)}</p>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#ffffff15] rounded-md px-3 py-1.5">
            <div className={`w-4 h-4 border-2 border-[#25D366] flex-shrink-0 ${multipleChoice ? 'rounded' : 'rounded-full'}`} />
            <span className="text-sm text-[#e9edef]">{opt}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#ffffff66] mt-2">{multipleChoice ? 'Múltipla escolha' : 'Seleção única'} · {options.length} opções</p>
      <p className="text-[10px] text-[#ffffff99] text-right mt-1">09:00</p>
    </div>
  );
}
