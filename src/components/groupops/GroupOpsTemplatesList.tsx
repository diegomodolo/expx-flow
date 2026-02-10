import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGroupOpsTemplates, TEMPLATE_CATEGORIES, TEMPLATE_TONES, AVAILABLE_PLACEHOLDERS, DEFAULT_TEMPLATES, type GroupOpsTemplate } from '@/hooks/useGroupOpsTemplates';
import { PROVOCACOES_AGRESSIVAS } from '@/data/groupopsProvocacoes';
import { parseWhatsAppFormatting } from '@/lib/whatsappFormatting';
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
  const [viewTab, setViewTab] = useState<'defaults' | 'custom'>('defaults');

  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, seedDefaultTemplates, seedProvocacoes } = useGroupOpsTemplates();

  // Convert DEFAULT_TEMPLATES to pseudo-GroupOpsTemplate for preview/edit
  const defaultTemplatesAsGroupOps: GroupOpsTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
    id: `default-${i}`,
    company_id: '',
    title: t.title,
    category: t.category,
    body: t.body,
    variants: null,
    placeholders: t.body.match(/\{\{[^}]+\}\}/g) ?? null,
    tone: t.tone,
    constraints_json: null,
    created_at: '',
    updated_at: '',
  }));

  // Check which default templates are already saved in the database (by title match)
  const savedTitles = new Set(templates.map(t => t.title));

  const activeList = viewTab === 'defaults' ? defaultTemplatesAsGroupOps : templates;

  const filtered = activeList.filter((t) => {
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
    };
    return emojis[cat] ?? '📄';
  };

  const handleSaveDefaultToDb = (template: GroupOpsTemplate) => {
    createTemplate.mutate({
      title: template.title,
      category: template.category,
      tone: template.tone,
      body: template.body,
      placeholders: template.placeholders,
      variants: template.variants,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">Modelos de mensagem com formatação WhatsApp e placeholders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {viewTab === 'defaults' && templates.length === 0 && (
            <Button variant="outline" onClick={() => seedDefaultTemplates.mutate()} disabled={seedDefaultTemplates.isPending}>
              <Download className="h-4 w-4 mr-2" /> Carregar Todos no Banco
            </Button>
          )}
          <Button variant="outline" onClick={() => seedProvocacoes.mutate()} disabled={seedProvocacoes.isPending}>
            <Download className="h-4 w-4 mr-2" /> {seedProvocacoes.isPending ? 'Carregando...' : `Carregar ${PROVOCACOES_AGRESSIVAS.length} Provocações`}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={viewTab === 'defaults' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewTab('defaults')}
        >
          📦 Pré-configurados ({DEFAULT_TEMPLATES.length})
        </Button>
        <Button
          variant={viewTab === 'custom' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewTab('custom')}
        >
          ✏️ Meus Templates ({templates.length})
        </Button>
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
      {isLoading && viewTab === 'custom' ? (
        <div className="text-center py-12 text-muted-foreground">Carregando templates...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {viewTab === 'custom' ? 'Crie seu primeiro template de mensagem' : 'Nenhum resultado para este filtro'}
            </p>
            {viewTab === 'custom' && (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const isDefault = template.id.startsWith('default-');
            const alreadySaved = isDefault && savedTitles.has(template.title);

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
                        {isDefault && alreadySaved && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">✓ Salvo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* WhatsApp Preview Mini */}
                  <div className="bg-[#e5ddd5] rounded-lg p-3 max-h-[100px] overflow-hidden relative">
                    <div className="bg-[#dcf8c6] rounded-lg p-2 text-sm text-[#303030] shadow-sm max-w-[90%] ml-auto">
                      {parseWhatsAppFormatting(template.body.slice(0, 120) + (template.body.length > 120 ? '...' : ''))}
                    </div>
                    {template.body.length > 120 && (
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
                    {isDefault ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={alreadySaved || createTemplate.isPending}
                        onClick={() => handleSaveDefaultToDb(template)}
                      >
                        <Download className="h-3 w-3 mr-1" /> {alreadySaved ? 'Salvo' : 'Salvar'}
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
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

  React.useEffect(() => {
    if (template) {
      setTitle(template.title);
      setCategory(template.category);
      setTone(template.tone ?? 'casual');
      setBody(template.body);
      const vb = (template.variants as any)?.b ?? '';
      setVariantB(vb);
      setShowVariantB(!!vb);
    } else {
      setTitle('');
      setCategory('DAILY_PROMPT');
      setTone('casual');
      setBody('');
      setVariantB('');
      setShowVariantB(false);
    }
  }, [template, open]);

  // Extract placeholders from body
  const extractedPlaceholders = Array.from(new Set(
    [...(body.match(/\{\{[^}]+\}\}/g) ?? []), ...(variantB.match(/\{\{[^}]+\}\}/g) ?? [])]
  ));

  const insertPlaceholder = (key: string) => {
    setBody((prev) => prev + key);
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

          {/* Body A */}
          <div className="space-y-2">
            <Label>Mensagem {showVariantB ? '(Variante A)' : ''}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
              placeholder="Use *negrito*, _itálico_, ~riscado~ e {{placeholders}}" className="font-mono text-sm" />
          </div>

          {/* Live preview A */}
          {body && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preview WhatsApp</Label>
              <div className="bg-[#e5ddd5] rounded-lg p-3">
                <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-[#303030] shadow-sm max-w-[85%] ml-auto whitespace-pre-wrap">
                  {parseWhatsAppFormatting(body)}
                </div>
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
                  <Label>Mensagem (Variante B)</Label>
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => { setShowVariantB(false); setVariantB(''); }}>
                    Remover
                  </Button>
                </div>
                <Textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} rows={4}
                  placeholder="Texto alternativo para teste A/B" className="font-mono text-sm" />
                {variantB && (
                  <div className="bg-[#e5ddd5] rounded-lg p-3">
                    <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-[#303030] shadow-sm max-w-[85%] ml-auto whitespace-pre-wrap">
                      {parseWhatsAppFormatting(variantB)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!title || !body} onClick={() => onSave({
            title,
            category,
            tone,
            body,
            placeholders: extractedPlaceholders.length > 0 ? extractedPlaceholders : null,
            variants: variantB ? { b: variantB } : null,
          })}>
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
                <div className="bg-[#005c4b] rounded-lg p-2.5 text-sm text-[#e9edef] shadow-sm max-w-[90%] ml-auto whitespace-pre-wrap">
                  {parseWhatsAppFormatting(fillPlaceholders(template.body))}
                  <p className="text-[10px] text-[#ffffff99] text-right mt-1">09:00</p>
                </div>
              </div>
              {/* Variante B */}
              {variantB && (
                <div>
                  <p className="text-[10px] text-[#8696a0] mb-1 text-right">Variante B</p>
                  <div className="bg-[#005c4b] rounded-lg p-2.5 text-sm text-[#e9edef] shadow-sm max-w-[90%] ml-auto whitespace-pre-wrap">
                    {parseWhatsAppFormatting(fillPlaceholders(variantB))}
                    <p className="text-[10px] text-[#ffffff99] text-right mt-1">09:00</p>
                  </div>
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
