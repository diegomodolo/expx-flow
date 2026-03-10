# Expx Flow

Plataforma SaaS de automacao de marketing e gestao de trafego pago.

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth, Realtime)
- **Deploy:** Vercel (frontend) + Supabase (backend)

## Setup Local

```sh
git clone https://github.com/bittencourtthulio/controledetrafego.git
cd controledetrafego
npm install --legacy-peer-deps
npm run dev
```

## Comandos

```sh
npm run dev        # Dev server (porta 8080)
npm run build      # Build producao
npm run lint       # ESLint
npm run preview    # Preview build
```

## Deploy

O frontend e deployado automaticamente via Vercel a cada push na branch `main`.

Edge Functions sao deployadas via `supabase functions deploy <nome-funcao>`.
