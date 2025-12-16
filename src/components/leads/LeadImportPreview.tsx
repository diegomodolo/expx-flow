import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LEAD_FIELDS } from "./LeadFieldMapper";

interface LeadImportPreviewProps {
  data: Record<string, unknown>[];
  fieldMapping: Record<string, string>;
}

export const LeadImportPreview = ({ data, fieldMapping }: LeadImportPreviewProps) => {
  const mappedFields = Object.values(fieldMapping);
  
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
      <h3 className="font-medium text-sm">Preview (5 primeiros registros)</h3>
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {mappedFields.map(field => (
                <TableHead key={field} className="min-w-[150px]">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
