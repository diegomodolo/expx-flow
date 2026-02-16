import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ListChecks, GitBranch, Loader2 } from 'lucide-react';
import { useCompanyUsageDefaults, USAGE_KEYS } from '@/hooks/useCompanyUsageDefaults';

export function UsageDefaultsSettings() {
  const { getSetting, updateSetting, isLoading } = useCompanyUsageDefaults();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const settings = [
    {
      category: 'Tarefas — Finalização',
      icon: ListChecks,
      items: [
        {
          key: USAGE_KEYS.BLOCK_FINISH_WITH_PENDING_SUBTASKS,
          label: 'Bloquear finalização com sub-tarefas pendentes',
          description: 'Impede que uma tarefa seja movida para "Concluído" se houver sub-tarefas não finalizadas.',
        },
        {
          key: USAGE_KEYS.BLOCK_FINISH_WITH_PENDING_CHECKLIST,
          label: 'Bloquear finalização com checklist pendente',
          description: 'Impede que uma tarefa seja concluída enquanto houver itens de checklist não marcados.',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Padrões de Uso</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as regras globais que serão aplicadas a todos os usuários da empresa.
        </p>
      </div>

      {settings.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.category}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.category}</CardTitle>
                  <CardDescription className="text-xs">
                    Regras de comportamento ao finalizar tarefas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.items.map((item, idx) => (
                <div key={item.key}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium text-foreground">{item.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <Switch
                      checked={getSetting(item.key as any)}
                      onCheckedChange={(checked) =>
                        updateSetting.mutate({ key: item.key as any, value: checked })
                      }
                      disabled={updateSetting.isPending}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
