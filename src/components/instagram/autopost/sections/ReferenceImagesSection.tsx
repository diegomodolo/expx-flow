import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import { AutoPostReferenceImages } from '@/components/instagram/AutoPostReferenceImages';

interface ReferenceImagesSectionProps {
  configId: string;
  clientId?: string;
  instagramAccountId: string;
  companyId: string;
  referenceImage1: string | null;
  referenceImage2: string | null;
  referenceImage3: string | null;
  onImagesChange: (updates: any) => void;
  disabled: boolean;
}

export function ReferenceImagesSection({
  configId,
  clientId,
  instagramAccountId,
  companyId,
  referenceImage1,
  referenceImage2,
  referenceImage3,
  onImagesChange,
  disabled,
}: ReferenceImagesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Imagens de Referência para IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AutoPostReferenceImages
          configId={configId}
          clientId={clientId}
          instagramAccountId={instagramAccountId}
          companyId={companyId}
          referenceImage1={referenceImage1}
          referenceImage2={referenceImage2}
          referenceImage3={referenceImage3}
          onImagesChange={onImagesChange}
          disabled={disabled}
          isInline
        />
      </CardContent>
    </Card>
  );
}
