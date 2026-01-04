import React from 'react';
import { Crown, TrendingUp, DollarSign, Target, Play } from 'lucide-react';

interface ChampionCreative {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string;
  clientName: string;
  clientAvatar: string | null;
  gestorName: string;
  gestorAvatar: string | null;
  ctr: number;
  roas: number;
  spend: number;
  conversions: number;
  platform: 'Meta' | 'Google';
}

interface SocialTVChampionCreativeProps {
  creative: ChampionCreative | null;
}

export function SocialTVChampionCreative({ creative }: SocialTVChampionCreativeProps) {
  if (!creative) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-purple-900/50 to-black/50">
        <Crown className="w-16 h-16 text-yellow-500/30 mb-4" />
        <p className="text-lg text-purple-200/50 text-center">
          Nenhum criativo campeão no momento
        </p>
        <p className="text-sm text-purple-300/30 mt-2">
          Os anúncios ativos aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Background creative */}
      <div className="absolute inset-0">
        {creative.type === 'video' ? (
          <video
            src={creative.url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={creative.url}
            alt={creative.title}
            className="w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Champion badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 rounded-full shadow-lg shadow-yellow-500/30">
          <Crown className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">
            Criativo Campeão
          </span>
        </div>
      </div>

      {/* Video indicator */}
      {creative.type === 'video' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-full">
            <Play className="w-4 h-4 text-white fill-white" />
            <span className="text-xs text-white font-medium">Vídeo</span>
          </div>
        </div>
      )}

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        {/* Client & Gestor info */}
        <div className="flex items-center gap-3 mb-4">
          {creative.clientAvatar ? (
            <img
              src={creative.clientAvatar}
              alt={creative.clientName}
              className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/30">
              <span className="text-lg font-bold text-white">
                {creative.clientName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">{creative.clientName}</h3>
            <div className="flex items-center gap-2">
              {creative.gestorAvatar ? (
                <img
                  src={creative.gestorAvatar}
                  alt={creative.gestorName}
                  className="w-5 h-5 rounded-full"
                />
              ) : null}
              <span className="text-sm text-purple-200/80">
                Gestor: {creative.gestorName}
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-4 line-clamp-2">
          {creative.title}
        </h2>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{creative.ctr.toFixed(2)}%</p>
            <p className="text-xs text-purple-200/60">CTR</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{creative.conversions}</p>
            <p className="text-xs text-purple-200/60">Conversões</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <DollarSign className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">
              R$ {creative.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-purple-200/60">Investido</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="w-5 h-5 mx-auto mb-1 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">M</span>
            </div>
            <p className="text-lg font-bold text-white">{creative.platform}</p>
            <p className="text-xs text-purple-200/60">Plataforma</p>
          </div>
        </div>
      </div>
    </div>
  );
}
