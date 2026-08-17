import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import type { ExportRecord } from './ExportCandidatesDialog';

interface ExchangeLogTabProps {
  records: ExportRecord[];
}

export function ExchangeLogTab({ records }: ExchangeLogTabProps) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No data exchanges yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Export candidate data to see the exchange history here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Data Exchange History
        </CardTitle>
        <CardDescription className="text-xs">
          Audit trail of all candidate data exports for this posting
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Export ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Exported By</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-center">Records</TableHead>
                <TableHead>Fields Shared</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs">{record.id}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(record.exportedAt), 'dd MMM yyyy, hh:mm a')}
                  </TableCell>
                  <TableCell className="text-sm">{record.exportedBy}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {record.format === 'excel' ? (
                        <FileSpreadsheet className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {record.format.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{record.recordCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {record.fieldsIncluded.slice(0, 4).map(f => (
                        <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                      {record.fieldsIncluded.length > 4 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{record.fieldsIncluded.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
