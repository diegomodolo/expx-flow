
# Plano: Ranking Diario de Melhores Atendentes as 17h

## Resumo

Vou criar um sistema que, todos os dias as 17h no horario de Brasilia, exibe automaticamente um modal de ranking com as 3 melhores atendentes do dia, com destaque especial para a campe, confete, musica de vitoria (tema do Senna), e duracao de 90 segundos na tela.

---

## O que sera exibido

### Layout do Modal de Ranking

```text
+----------------------------------------------------------+
|  RANKING DO DIA - Melhores Atendentes                    |
|  17:00 - Sexta, 31 de Janeiro                            |
+----------------------------------------------------------+
|                                                          |
|              [Confete caindo na tela]                    |
|                                                          |
|     +----------------------------------------+           |
|     |         1o LUGAR - CAMPE               |           |
|     |     +--------+                         |           |
|     |     | FOTO   |  Maria Silva            |           |
|     |     | GRANDE |  Nota: 9.8              |           |
|     |     +--------+                         |           |
|     |                                        |           |
|     |  "Parabens, Maria! Voce e a campe     |           |
|     |   de atendimento de hoje!"             |           |
|     |                                        |           |
|     |  32 conversas | 8.5 min tempo medio   |           |
|     |  +28 positivos | 3 neutros | 1 negativo|           |
|     +----------------------------------------+           |
|                                                          |
|   +------------------+    +------------------+           |
|   | 2o LUGAR         |    | 3o LUGAR         |           |
|   | Foto  Joana      |    | Foto  Ana        |           |
|   | Nota: 9.2        |    | Nota: 8.9        |           |
|   | 28 conversas     |    | 25 conversas     |           |
|   +------------------+    +------------------+           |
|                                                          |
|     [Fecha automaticamente em 85s]   [Fechar]           |
+----------------------------------------------------------+
```

### Elementos do Modal

1. **Campe (1o lugar)**:
   - Foto grande do atendente (avatar)
   - Nome em destaque
   - Nota media do dia
   - Mensagem de parabens personalizada
   - Estatisticas: conversas atendidas, tempo medio de resposta
   - Distribuicao de sentimento (positivo/neutro/negativo)

2. **2o e 3o lugar**:
   - Cards menores lado a lado
   - Foto, nome, nota e quantidade de conversas

3. **Efeitos visuais**:
   - Confete caindo (150 particulas coloridas)
   - Fundo com brilho dourado/gradiente
   - Estrelas flutuantes
   - Trofeu animado

4. **Audio**:
   - Tema da Vitoria do Ayrton Senna (ou musica de celebracao sintetizada via Web Audio API)
   - Duracao: ~8 segundos de fanfarra inicial

---

## Detalhes Tecnicos

### Arquivos a Criar/Modificar

#### 1. Novo Componente: `src/components/cs-tv-dashboard/CSTVDailyRankingOverlay.tsx`
- Modal fullscreen similar ao `CSTVCelebrationOverlay`
- Props:
  - `ranking`: array com top 3 atendentes
  - `isVisible`: boolean
  - `onClose`: callback
  - `rotation/zoom`: para acompanhar orientacao do dashboard
- Countdown de 90 segundos
- Confete reutilizando logica existente
- Musica sintetizada via Web Audio API (inspirada no tema da vitoria)

#### 2. Hook: `src/hooks/useCSTVDailyRanking.tsx`
- Logica para detectar quando sao 17h (Brasilia)
- Verifica a cada minuto se esta na janela 17:00-17:01
- Usa `localStorage` para evitar reexibir no mesmo dia
- Key: `cs-tv-daily-ranking-shown-{YYYY-MM-DD}`
- Dispara callback para mostrar o ranking

#### 3. Modificar: `src/pages/DashboardCSTVPublic.tsx`
- Adicionar estado `showDailyRanking`
- Integrar o hook `useCSTVDailyRanking`
- Renderizar `CSTVDailyRankingOverlay` quando ativo
- Usar dados de `attendantPerformance` ja disponiveis

#### 4. Modificar: `src/components/cs-tv-dashboard/CSTVControls.tsx`
- Adicionar botao "Testar Ranking" na secao de testes
- Novo prop: `onTestDailyRanking`
- Icone de trofeu com cor dourada

---

## Logica de Horario

### Deteccao das 17h Brasilia

```typescript
const checkIf5PMBrasilia = () => {
  const now = new Date();
  // Converter para Brasilia (UTC-3)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brasilia = new Date(utc - (3 * 60 * 60 * 1000));
  
  return brasilia.getHours() === 17 && brasilia.getMinutes() === 0;
};
```

### Persistencia (evitar reexibir)

```typescript
const todayKey = `cs-tv-ranking-${brasilia.toISOString().split('T')[0]}`;
if (localStorage.getItem(todayKey)) return; // ja mostrou hoje
localStorage.setItem(todayKey, 'shown');
```

---

## Musica de Vitoria

### Opcao A: Tema do Senna via Web Audio API
- Sequencia de notas que emula a melodia classica
- Notas: La, Do#, Mi, La (oitava acima), descendo...
- Duracao: ~6-8 segundos

### Opcao B: Fanfarra de Vitoria Generica
- Acordes maiores ascendentes
- Aplausos sintetizados (ja existe no `CSTVCelebrationOverlay`)
- Combinacao de chimes e trumpets sintetizados

```typescript
const playVictoryTheme = () => {
  const audioContext = new AudioContext();
  
  // Notas inspiradas no tema do Senna
  const notes = [
    { freq: 440, start: 0, duration: 0.3 },     // La
    { freq: 554.37, start: 0.3, duration: 0.3 }, // Do#
    { freq: 659.25, start: 0.6, duration: 0.3 }, // Mi
    { freq: 880, start: 0.9, duration: 0.5 },    // La alto
    // ... mais notas
  ];
  
  notes.forEach(note => {
    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth'; // Som de brass/trompete
    osc.frequency.value = note.freq;
    // ... envelope ADSR
  });
};
```

---

## Fluxo de Execucao

1. Dashboard CS-TV esta aberto
2. Hook `useCSTVDailyRanking` verifica horario a cada 30 segundos
3. Quando detecta 17:00 Brasilia:
   - Verifica se ja mostrou hoje (localStorage)
   - Se nao mostrou, seta `showDailyRanking = true`
   - Marca como mostrado no localStorage
4. Modal aparece com:
   - Musica tocando imediatamente
   - Confete caindo
   - Countdown de 90 segundos
5. Apos 90s ou clique em fechar:
   - Modal fecha
   - Musica para

---

## Botao de Teste

No menu de configuracoes:

```text
+---------------------------+
| Testar Modais             |
+---------------------------+
| [Alerta]  [Celebracao]    |
| [Ranking Diario]          |
+---------------------------+
```

- Botao com icone de trofeu dourado
- Ao clicar, usa os dados atuais de `attendantPerformance`
- Ignora a verificacao de localStorage (teste sempre funciona)

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/cs-tv-dashboard/CSTVDailyRankingOverlay.tsx` | Criar |
| `src/hooks/useCSTVDailyRanking.tsx` | Criar |
| `src/pages/DashboardCSTVPublic.tsx` | Modificar |
| `src/components/cs-tv-dashboard/CSTVControls.tsx` | Modificar |
