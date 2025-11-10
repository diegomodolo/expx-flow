export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export function calculateConversionRate(converted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((converted / total) * 100 * 10) / 10;
}

export function calculateAverageDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const now = new Date();
  const totalDays = dates.reduce((sum, date) => {
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return sum + diffDays;
  }, 0);
  return Math.round(totalDays / dates.length);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getTemperatureLabel(temperature: string | null): string {
  if (!temperature) return 'Não definida';
  return temperature.charAt(0).toUpperCase() + temperature.slice(1);
}

export function getTemperatureColor(temperature: string | null): string {
  switch (temperature?.toLowerCase()) {
    case 'quente':
      return '#ef4444';
    case 'morno':
      return '#f97316';
    case 'frio':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}
