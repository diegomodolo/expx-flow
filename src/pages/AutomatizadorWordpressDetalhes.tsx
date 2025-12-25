import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WordpressAutoPostsManager } from '@/components/wordpress/WordpressAutoPostsManager';
import { useCompany } from '@/contexts/CompanyContext';

export default function AutomatizadorWordpressDetalhes() {
  const { configId } = useParams<{ configId: string }>();
  const { activeCompany } = useCompany();

  if (!configId || !activeCompany?.company_id) {
    return null;
  }

  return (
    <DashboardLayout>
      <WordpressAutoPostsManager configId={configId} companyId={activeCompany.company_id} />
    </DashboardLayout>
  );
}
