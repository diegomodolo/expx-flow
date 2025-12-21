import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAD_FIELDS } from "./LeadFieldMapper";

interface LeadImportPreviewProps {
  data: Record<string, unknown>[];
  fieldMapping: Record<string, string>;
}

export const LeadImportPreview = ({ data, fieldMapping }: LeadImportPreviewProps) => {
  const allMappedFields = Object.values(fieldMapping);
  // Show only first 4 fields to avoid horizontal scroll
  const mappedFields = allMappedFields.slice(0, 4);
  const hiddenFieldsCount = allMappedFields.length - mappedFields.length;
  
  const getFieldLabel = (key: string) => {
    return LEAD_FIELDS.find(f => f.key === key)?.label || key;
  };

  if (data.length === 0 || mappedFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado para visualizar
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Preview (5 primeiros registros)</h3>
        {hiddenFieldsCount > 0 && (
          <span className="text-xs text-muted-foreground">
            +{hiddenFieldsCount} campos adicionais
          </span>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {mappedFields.map(field => (
              <TableHead key={field}>
                {getFieldLabel(field)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {mappedFields.map(field => (
                <TableCell key={field} className="max-w-[200px] truncate">
                  {row[field] !== undefined && row[field] !== null 
                    ? String(row[field]) 
                    : <span className="text-muted-foreground">-</span>
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
