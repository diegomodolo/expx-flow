import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WordpressAutoPostsManager } from '@/components/wordpress/WordpressAutoPostsManager';
import { useCompany } from '@/contexts/CompanyContext';

export default function AutomatizadorWordpressDetalhes() {
  const { configId } = useParams<{ configId: string }>();
  const { currentCompany } = useCompany();

  if (!configId || !currentCompany?.id) {
    return null;
  }

  return (
    <DashboardLayout>
      <WordpressAutoPostsManager configId={configId} companyId={currentCompany.id} />
    </DashboardLayout>
  );
}
