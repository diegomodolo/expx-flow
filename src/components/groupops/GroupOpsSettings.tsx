import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bot, Bell, Shield, Zap, Globe, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

interface GroupOpsConfig {
  botMode: 'off' | 'safe' | 'full';
  defaultTimezone: string;
  defaultLanguage: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxMessagesPerMinute: number;
  notifyNewMember: boolean;
  notifyMemberLeave: boolean;
  notifyRiskAlert: boolean;
  notifyModerationAction: boolean;
  autoWelcome: boolean;
  welcomeMessage: string;
  autoFarewellMessage: string;
  enableGamification: boolean;
  enableModeration: boolean;
  defaultScoringProfile: string;
}

const DEFAULT_CONFIG: GroupOpsConfig = {
  botMode: 'safe',
  defaultTimezone: 'America/Sao_Paulo',
  defaultLanguage: 'pt-BR',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  maxMessagesPerMinute: 5,
  notifyNewMember: true,
  notifyMemberLeave: true,
  notifyRiskAlert: true,
  notifyModerationAction: true,
  autoWelcome: true,
  welcomeMessage: 'Bem-vindo(a) ao grupo, {{nome}}! 👋\n\nEstamos felizes em ter você aqui.',
  autoFarewellMessage: '',
  enableGamification: true,
  enableModeration: true,
  defaultScoringProfile: 'padrao',
};

const BOT_MODES = [
  { value: 'off', label: 'Desligado', desc: 'Bot não responde a nada', color: 'bg-muted text-muted-foreground' },
  { value: 'safe', label: 'Safe', desc: 'Apenas mensagens agendadas e comandos', color: 'bg-chart-4/20 text-chart-4' },
  { value: 'full', label: 'Full', desc: 'Ativo em conversas, responde menções', color: 'bg-primary/20 text-primary' },
];

export default function GroupOpsSettings() {
  const [config, setConfig] = useState<GroupOpsConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);

  const update = (key: keyof GroupOpsConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    // In a real implementation, this would persist to groupops_groups.config_json or a dedicated settings table
    toast.success('Configurações salvas com sucesso');
    setIsDirty(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Bot Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Modo do Bot</CardTitle>
          </div>
          <CardDescription>Defina o nível de atividade do bot nos grupos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {BOT_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => update('botMode', mode.value)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                  config.botMode === mode.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{mode.label}</span>
                    <Badge variant="secondary" className={`text-[10px] ${mode.color}`}>{mode.value.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.desc}</p>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${
                  config.botMode === mode.value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                }`} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Configurações Gerais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fuso Horário Padrão</Label>
              <Select value={config.defaultTimezone} onValueChange={v => update('defaultTimezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (AMT)</SelectItem>
                  <SelectItem value="America/Fortaleza">Fortaleza (BRT)</SelectItem>
                  <SelectItem value="America/Cuiaba">Cuiabá (AMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={config.defaultLanguage} onValueChange={v => update('defaultLanguage', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Horário Silencioso (Quiet Hours)</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="time" value={config.quietHoursStart} onChange={e => update('quietHoursStart', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input type="time" value={config.quietHoursEnd} onChange={e => update('quietHoursEnd', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rate Limit (msgs/minuto)</Label>
            <Input type="number" min={1} max={30} value={config.maxMessagesPerMinute} onChange={e => update('maxMessagesPerMinute', parseInt(e.target.value) || 5)} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Notificações</CardTitle>
          </div>
          <CardDescription>Alertas enviados para administradores do grupo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'notifyNewMember' as const, label: 'Novo membro entra no grupo' },
            { key: 'notifyMemberLeave' as const, label: 'Membro sai do grupo' },
            { key: 'notifyRiskAlert' as const, label: 'Membro classificado como risco' },
            { key: 'notifyModerationAction' as const, label: 'Ação de moderação executada' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <Label className="text-sm">{item.label}</Label>
              <Switch checked={config[item.key]} onCheckedChange={v => update(item.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auto Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mensagens Automáticas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Boas-vindas automáticas</Label>
            <Switch checked={config.autoWelcome} onCheckedChange={v => update('autoWelcome', v)} />
          </div>
          {config.autoWelcome && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mensagem de boas-vindas</Label>
              <Textarea value={config.welcomeMessage} onChange={e => update('welcomeMessage', e.target.value)} rows={3} placeholder="Use {{nome}} para o nome do membro" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Módulos</CardTitle>
          </div>
          <CardDescription>Ative ou desative funcionalidades do GroupOps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="text-sm">Gamificação & Pontuação</Label>
              <p className="text-xs text-muted-foreground">Badges, score e ranking de membros</p>
            </div>
            <Switch checked={config.enableGamification} onCheckedChange={v => update('enableGamification', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="text-sm">Moderação Automática</Label>
              <p className="text-xs text-muted-foreground">Anti-flood, anti-spam e regras customizadas</p>
            </div>
            <Switch checked={config.enableModeration} onCheckedChange={v => update('enableModeration', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} className="gap-2 shadow-lg">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
}
