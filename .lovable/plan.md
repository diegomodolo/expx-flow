
# Plano: Mover Métricas para o Topo do Modal de Criativo

## Situação Atual

No modal de edição de criativo (`AdEditModal`), as métricas estão posicionadas na coluna direita, abaixo do `MediaUploader`, em uma grade 2x4 com 8 métricas:
- Investido, Impressões, CTR, Conversões
- CPC, CPA, Cliques, Alcance

Você solicitou que essas métricas sejam movidas para o **topo do modal**, em formato de **pequenos cards horizontais**.

---

## Solução Proposta

Reposicionar as métricas para ficarem logo abaixo do header, em uma linha horizontal de cards compactos, antes das duas colunas de configuração.

### Nova Estrutura Visual

```text
AdEditModal (Dialog)
├── Header (nome, badges)
├── Separator
├── ScrollArea
│   ├── Alerts (Google/Creative Changed)
│   ├── ★ MÉTRICAS EM CARDS HORIZONTAIS ★
│   │   └── Grid 4-8 colunas com cards compactos
│   └── Grid 2 colunas
│       ├── Coluna Esquerda (Nome, Status, Textos, Destino)
│       └── Coluna Direita (Tipo Criativo, MediaUploader)
└── Footer (Cancelar / Salvar)
```

---

## Mudanças no Layout

### Cards de Métricas no Topo

- Posicionados imediatamente após os Alerts
- Grid responsivo: 4 colunas em desktop, 2 em mobile
- Cards compactos com:
  - Ícone pequeno à esquerda
  - Label da métrica (texto pequeno, muted)
  - Valor em destaque (font-bold)
- Métricas incluídas: Investido, Impressões, Cliques, CTR, Conversões, CPA, CPC, Alcance

### Coluna Direita

- Remove a seção "Métricas Atuais" que está lá atualmente
- Mantém apenas: Tipo de Criativo e MediaUploader

---

## Design dos Cards

Cada card terá um estilo compacto:

```text
┌──────────────┐
│ 💰 Investido │
│   R$ 1.234   │
└──────────────┘
```

- Background: `bg-muted/50` com `rounded-lg`
- Padding reduzido: `p-2`
- Label: `text-xs text-muted-foreground`
- Valor: `text-sm font-bold`

---

## Ícones por Métrica

| Métrica | Ícone |
|---------|-------|
| Investido | DollarSign |
| Impressões | Eye |
| Cliques | MousePointerClick |
| CTR | Percent |
| Conversões | Target |
| CPA | Receipt |
| CPC | Coins |
| Alcance | Users |

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/campaign-editor/AdEditModal.tsx` | Mover seção de métricas para o topo do ScrollArea |

---

## Resumo das Alterações

1. **Adicionar imports** de ícones adicionais (DollarSign, Eye, MousePointerClick, Percent, Target, Receipt, Coins, Users)
2. **Criar seção de métricas** logo após os Alerts, antes do grid de duas colunas
3. **Remover seção de métricas** da coluna direita (linhas 602-642)
4. **Grid responsivo**: `grid-cols-4 lg:grid-cols-8` para desktop, `grid-cols-2` para mobile
5. **Cards compactos** com ícone + label + valor em cada card
