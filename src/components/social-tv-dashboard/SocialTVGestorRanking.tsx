import React from 'react';
import { Trophy, Medal, Award, Users, Target } from 'lucide-react';

interface GestorRanking {
  id: string;
  name: string;
  avatar: string | null;
  position: number;
  conversions: number;
  clientsCount: number;
  totalSpend: number;
}

interface SocialTVGestorRankingProps {
  gestores: GestorRanking[];
}

export function SocialTVGestorRanking({ gestores }: SocialTVGestorRankingProps) {
  if (gestores.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-b from-purple-900/30 to-black/30">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-white">Ranking de Gestores</h2>
        </div>
        <p className="text-sm text-purple-200/50 text-center py-4">
          Nenhum gestor com conversões ainda
        </p>
      </div>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-purple-800/50 flex items-center justify-center text-sm font-bold text-purple-200">
            {position}
          </span>
        );
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  // Show top 3 in podium style, rest in list
  const top3 = gestores.slice(0, 3);
  const rest = gestores.slice(3);

  return (
    <div className="p-6 bg-gradient-to-b from-purple-900/30 to-black/30">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold text-white">Ranking de Gestores</h2>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 mb-4">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              {top3[1].avatar ? (
                <img
                  src={top3[1].avatar}
                  alt={top3[1].name}
                  className="w-14 h-14 rounded-full border-2 border-gray-300 object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center border-2 border-gray-300">
                  <span className="text-lg font-bold text-white">
                    {top3[1].name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-800">2</span>
              </div>
            </div>
            <p className="text-sm font-medium text-white text-center truncate max-w-[80px]">
              {top3[1].name.split(' ')[0]}
            </p>
            <p className="text-xs text-gray-300">{top3[1].conversions} conv.</p>
            <div className="w-16 h-16 bg-gradient-to-t from-gray-500/30 to-gray-400/20 rounded-t-lg mt-2" />
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="flex flex-col items-center -mt-4">
            <div className="relative mb-2">
              {top3[0].avatar ? (
                <img
                  src={top3[0].avatar}
                  alt={top3[0].name}
                  className="w-18 h-18 rounded-full border-3 border-yellow-400 object-cover shadow-lg shadow-yellow-500/30"
                  style={{ width: '72px', height: '72px' }}
                />
              ) : (
                <div 
                  className="rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-3 border-yellow-400 shadow-lg shadow-yellow-500/30"
                  style={{ width: '72px', height: '72px' }}
                >
                  <span className="text-2xl font-bold text-white">
                    {top3[0].name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Trophy className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
            <p className="text-sm font-bold text-white text-center truncate max-w-[100px]">
              {top3[0].name.split(' ')[0]}
            </p>
            <p className="text-xs text-yellow-300">{top3[0].conversions} conv.</p>
            <div className="w-20 h-24 bg-gradient-to-t from-yellow-500/30 to-yellow-400/20 rounded-t-lg mt-2" />
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              {top3[2].avatar ? (
                <img
                  src={top3[2].avatar}
                  alt={top3[2].name}
                  className="w-12 h-12 rounded-full border-2 border-amber-600 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center border-2 border-amber-600">
                  <span className="text-lg font-bold text-white">
                    {top3[2].name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">3</span>
              </div>
            </div>
            <p className="text-sm font-medium text-white text-center truncate max-w-[70px]">
              {top3[2].name.split(' ')[0]}
            </p>
            <p className="text-xs text-amber-300">{top3[2].conversions} conv.</p>
            <div className="w-14 h-12 bg-gradient-to-t from-amber-600/30 to-amber-500/20 rounded-t-lg mt-2" />
          </div>
        )}
      </div>

      {/* Rest of ranking */}
      {rest.length > 0 && (
        <div className="space-y-2 mt-4">
          {rest.map((gestor) => (
            <div
              key={gestor.id}
              className={`flex items-center gap-3 p-2 rounded-lg border ${getPositionBg(gestor.position)}`}
            >
              {getPositionIcon(gestor.position)}
              {gestor.avatar ? (
                <img
                  src={gestor.avatar}
                  alt={gestor.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {gestor.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{gestor.name}</p>
                <div className="flex items-center gap-2 text-xs text-purple-200/60">
                  <Users className="w-3 h-3" />
                  <span>{gestor.clientsCount} clientes</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-400">{gestor.conversions}</p>
                <p className="text-xs text-purple-200/60">conv.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
