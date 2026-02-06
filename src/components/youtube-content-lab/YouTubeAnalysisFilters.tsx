import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { PeriodOption } from "@/hooks/useYouTubeAnalytics";
import { DateRange } from "react-day-picker";

interface YouTubeAnalysisFiltersProps {
  channels: YouTubeChannel[];
  selectedChannelIds: string[];
  onChannelSelect: (ids: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  customDateRange: { start: Date; end: Date } | null;
  onCustomDateChange: (range: { start: Date; end: Date } | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const periodLabels: Record<PeriodOption, string> = {
  "1": "Último dia",
  "3": "Últimos 3 dias",
  "7": "Últimos 7 dias",
  "15": "Últimos 15 dias",
  "30": "Últimos 30 dias",
  "60": "Últimos 60 dias",
  "90": "Últimos 90 dias",
  custom: "Personalizado",
};

const sortOptions = [
  { value: "engagement", label: "Maior Engajamento" },
  { value: "views", label: "Mais Views" },
  { value: "likes", label: "Mais Curtidas" },
  { value: "comments", label: "Mais Comentários" },
  { value: "recent", label: "Mais Recentes" },
  { value: "oldest", label: "Mais Antigos" },
];

export function YouTubeAnalysisFilters({
  channels,
  selectedChannelIds,
  onChannelSelect,
  searchQuery,
  onSearchChange,
  period,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
  sortBy,
  onSortChange,
}: YouTubeAnalysisFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange
      ? { from: customDateRange.start, to: customDateRange.end }
      : undefined
  );

  const handleChannelToggle = (channelId: string) => {
    if (selectedChannelIds.includes(channelId)) {
      onChannelSelect(selectedChannelIds.filter((id) => id !== channelId));
    } else {
      onChannelSelect([...selectedChannelIds, channelId]);
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onCustomDateChange({ start: range.from, end: range.to });
      onPeriodChange("custom");
    }
  };

  const clearFilters = () => {
    onChannelSelect([]);
    onSearchChange("");
    onPeriodChange("30");
    onCustomDateChange(null);
    onSortChange("engagement");
    setDateRange(undefined);
  };

  const hasActiveFilters =
    selectedChannelIds.length > 0 ||
    searchQuery.length > 0 ||
    period !== "30" ||
    sortBy !== "engagement";

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Period Select */}
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
          <SelectTrigger className="w-[160px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {period === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
                  : "Selecionar datas"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Channel Filters */}
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground py-1">Canais:</span>
          {channels.map((channel) => (
            <Badge
              key={channel.id}
              variant={selectedChannelIds.includes(channel.id) ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleChannelToggle(channel.id)}
            >
              {channel.channel_name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
