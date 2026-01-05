import React from 'react';
import { Trophy, Medal, Award, Users, Target } from 'lucide-react';

interface SquadRanking {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  conversions: number;
  clientsCount: number;
  totalSpend: number;
}

interface SocialTVSquadRankingProps {
  squads: SquadRanking[];
}

export function SocialTVSquadRanking({ squads }: SocialTVSquadRankingProps) {
  if (squads.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-xl h-full">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Ranking de Squads</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma squad com conversões ainda
        </p>
      </div>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
            {position}
          </span>
        );
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-500/10 border-gray-400/30';
      case 3:
        return 'bg-amber-500/10 border-amber-600/30';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const getSquadColor = (color: string | null, position: number) => {
    if (color) return color;
    switch (position) {
      case 1: return '#facc15'; // yellow
      case 2: return '#9ca3af'; // gray
      case 3: return '#d97706'; // amber
      default: return 'hsl(var(--primary))';
    }
  };

  // Get squad initials from name (first 2 characters or first letters of words)
  const getSquadInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Check if icon is an emoji (simple check for non-ASCII characters)
  const isEmoji = (str: string | null) => {
    if (!str) return false;
    // Emojis are typically non-ASCII and short
    return str.length <= 4 && /[^\x00-\x7F]/.test(str);
  };

  // Show top 3 in podium style, rest in list
  const top3 = squads.slice(0, 3);
  const rest = squads.slice(3);

  return (
    <div className="p-6 bg-card border border-border rounded-xl h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Ranking de Squads</h2>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 mb-4">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-gray-400"
                style={{ backgroundColor: getSquadColor(top3[1].color, 2) + '40' }}
              >
                {isEmoji(top3[1].icon) ? (
                  <span className="text-2xl">{top3[1].icon}</span>
                ) : (
                  <span className="text-lg font-bold text-foreground">{getSquadInitials(top3[1].name)}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-800">2</span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground text-center truncate max-w-[80px]">
              {top3[1].name}
            </p>
            <p className="text-xs text-muted-foreground">{top3[1].conversions} conv.</p>
            <div className="w-16 h-16 bg-gray-500/20 rounded-t-lg mt-2" />
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="flex flex-col items-center -mt-4">
            <div className="relative mb-2">
              <div 
                className="rounded-full flex items-center justify-center border-3 border-yellow-400 shadow-lg shadow-yellow-500/30"
                style={{ 
                  width: '72px', 
                  height: '72px',
                  backgroundColor: getSquadColor(top3[0].color, 1) + '40'
                }}
              >
                {isEmoji(top3[0].icon) ? (
                  <span className="text-3xl">{top3[0].icon}</span>
                ) : (
                  <span className="text-2xl font-bold text-foreground">{getSquadInitials(top3[0].name)}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Trophy className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
            <p className="text-sm font-bold text-foreground text-center truncate max-w-[100px]">
              {top3[0].name}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">{top3[0].conversions} conv.</p>
            <div className="w-20 h-24 bg-yellow-500/20 rounded-t-lg mt-2" />
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-amber-600"
                style={{ backgroundColor: getSquadColor(top3[2].color, 3) + '40' }}
              >
                {isEmoji(top3[2].icon) ? (
                  <span className="text-xl">{top3[2].icon}</span>
                ) : (
                  <span className="text-base font-bold text-foreground">{getSquadInitials(top3[2].name)}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">3</span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground text-center truncate max-w-[70px]">
              {top3[2].name}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{top3[2].conversions} conv.</p>
            <div className="w-14 h-12 bg-amber-600/20 rounded-t-lg mt-2" />
          </div>
        )}
      </div>

      {/* Rest of ranking */}
      {rest.length > 0 && (
        <div className="space-y-2 mt-4">
          {rest.map((squad) => (
            <div
              key={squad.id}
              className={`flex items-center gap-3 p-2 rounded-lg border ${getPositionBg(squad.position)}`}
            >
              {getPositionIcon(squad.position)}
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: getSquadColor(squad.color, squad.position) + '40' }}
              >
                {isEmoji(squad.icon) ? (
                  <span className="text-sm">{squad.icon}</span>
                ) : (
                  <span className="text-xs font-bold text-foreground">{getSquadInitials(squad.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{squad.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" />
                  <span>{squad.clientsCount} clientes</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{squad.conversions}</p>
                <p className="text-xs text-muted-foreground">conv.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
