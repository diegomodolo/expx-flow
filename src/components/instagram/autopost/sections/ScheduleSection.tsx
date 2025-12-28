import { ScheduleGrid } from '@/components/instagram/ScheduleGrid';

interface ScheduleSectionProps {
  configId: string;
}

export function ScheduleSection({ configId }: ScheduleSectionProps) {
  return (
    <ScheduleGrid configId={configId} isCollapsible={false} />
  );
}
