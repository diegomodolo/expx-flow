import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';

interface MentionUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MentionMenuProps {
  query: string;
  visible: boolean;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export function MentionMenu({ query, visible, onSelect, onClose }: MentionMenuProps) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: users = [] } = useQuery<MentionUser[]>({
    queryKey: ['mention-users', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('employees')
        .select('user_id, name, email')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('user_id', 'is', null);

      if (!data) return [];

      const userIds = data.map(e => e.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data
        .filter(e => e.user_id)
        .map(e => ({
          user_id: e.user_id!,
          full_name: profileMap.get(e.user_id!)?.full_name || e.name || e.email || 'Usuário',
          avatar_url: profileMap.get(e.user_id!)?.avatar_url || null,
        }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const filtered = useMemo(() => {
    if (!query) return users.slice(0, 8);
    const q = query.toLowerCase();
    return users.filter(u => u.full_name.toLowerCase().includes(q)).slice(0, 8);
  }, [users, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="p-1.5 max-h-48 overflow-y-auto">
        {filtered.map((user, idx) => (
          <button
            key={user.user_id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(user); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
            )}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate">{user.full_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
