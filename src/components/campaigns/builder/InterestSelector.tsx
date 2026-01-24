import { useState, useCallback } from 'react';
import { X, Search, Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect } from 'react';

export interface Interest {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
}

interface InterestSelectorProps {
  clientId: string;
  selectedInterests: Interest[];
  onChange: (interests: Interest[]) => void;
  label?: string;
  placeholder?: string;
}

export function InterestSelector({
  clientId,
  selectedInterests,
  onChange,
  label = "Interesses",
  placeholder = "Buscar interesses..."
}: InterestSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Interest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 400);

  const formatAudienceSize = (lower?: number, upper?: number) => {
    if (!lower && !upper) return '';
    const formatNum = (n: number) => {
      if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
      return n.toString();
    };
    if (lower && upper) {
      return `${formatNum(lower)} - ${formatNum(upper)}`;
    }
    return lower ? `${formatNum(lower)}+` : `até ${formatNum(upper!)}`;
  };

  const searchInterests = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-meta-interests', {
        body: { clientId, query }
      });

      if (error) throw error;

      if (data?.interests) {
        // Filter out already selected interests
        const selectedIds = new Set(selectedInterests.map(i => i.id));
        const filtered = data.interests.filter((i: Interest) => !selectedIds.has(i.id));
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching interests:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [clientId, selectedInterests]);

  useEffect(() => {
    searchInterests(debouncedQuery);
  }, [debouncedQuery, searchInterests]);

  const addInterest = (interest: Interest) => {
    if (!selectedInterests.find(i => i.id === interest.id)) {
      onChange([...selectedInterests, interest]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeInterest = (interestId: string) => {
    onChange(selectedInterests.filter(i => i.id !== interestId));
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Target className="w-4 h-4" />
        {label}
      </Label>

      {/* Selected Interests */}
      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md">
          {selectedInterests.map((interest) => (
            <Badge
              key={interest.id}
              variant="secondary"
              className="pr-1 flex items-center gap-1"
            >
              <span className="max-w-[200px] truncate">{interest.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={() => removeInterest(interest.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <ScrollArea className="h-48 border rounded-md">
          <div className="p-1">
            {searchResults.map((interest) => (
              <button
                key={interest.id}
                onClick={() => addInterest(interest)}
                className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{interest.name}</span>
                  {(interest.audience_size_lower_bound || interest.audience_size_upper_bound) && (
                    <span className="text-xs text-muted-foreground">
                      {formatAudienceSize(interest.audience_size_lower_bound, interest.audience_size_upper_bound)}
                    </span>
                  )}
                </div>
                {interest.path && interest.path.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {interest.path.join(' › ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum interesse encontrado para "{searchQuery}"
        </p>
      )}

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="text-xs text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </p>
      )}
    </div>
  );
}
