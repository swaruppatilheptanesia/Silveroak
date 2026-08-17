import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { APPLICATION_EXPORT_FIELDS, buildApplicationExportTable, getDefaultApplicationExportFieldKeys, type ApplicationExportFieldKey } from '@/lib/applicationExport';
import { downloadExcelTable } from '@/lib/spreadsheetExport';
import type { ApiApplicationListItem } from '@/types/application';

interface ApplicationsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: ApiApplicationListItem[];
  isLoading?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  Student: 'Student Fields',
  Posting: 'Posting Fields',
  Application: 'Application Fields',
};

export function ApplicationsExportDialog({
  open,
  onOpenChange,
  applications,
  isLoading = false,
}: ApplicationsExportDialogProps) {
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<ApplicationExportFieldKey[]>(
    getDefaultApplicationExportFieldKeys(),
  );

  useEffect(() => {
    if (open) {
      setSelectedFieldKeys(getDefaultApplicationExportFieldKeys());
    }
  }, [open]);

  const selectedCount = selectedFieldKeys.length;

  const groupedFields = useMemo(() => {
    return {
      Student: APPLICATION_EXPORT_FIELDS.filter((field) => field.section === 'Student'),
      Posting: APPLICATION_EXPORT_FIELDS.filter((field) => field.section === 'Posting'),
      Application: APPLICATION_EXPORT_FIELDS.filter((field) => field.section === 'Application'),
    };
  }, []);

  function toggleField(key: ApplicationExportFieldKey) {
    setSelectedFieldKeys((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  }

  function selectAllFields() {
    setSelectedFieldKeys(getDefaultApplicationExportFieldKeys());
  }

  function clearAllFields() {
    setSelectedFieldKeys([]);
  }

  async function handleExport() {
    if (selectedFieldKeys.length === 0) {
      toast.error('Select at least one field to export.');
      return;
    }

    if (applications.length === 0) {
      toast.error('There are no applications to export.');
      return;
    }

    const { headers, rows } = buildApplicationExportTable(applications, selectedFieldKeys);
    try {
      await downloadExcelTable(headers, rows, 'applications_export');
      toast.success(`Exported ${applications.length} application(s) to Excel.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export applications.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !h-[90vh] !max-w-3xl !flex-col !overflow-hidden !p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Export Applications</DialogTitle>
          <DialogDescription>
            Choose the fields you want in the spreadsheet. The export uses the currently filtered application rows.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          <div className="space-y-5 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Download className="h-4 w-4" />
                <span>
                  {isLoading
                    ? 'Loading applications for export...'
                    : `${applications.length.toLocaleString('en-IN')} application(s) ready`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFields}>
                  Select all
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllFields}>
                  Clear all
                </Button>
              </div>
            </div>

            {(['Student', 'Posting', 'Application'] as const).map((section) => (
              <div key={section} className="space-y-3">
                <p className="text-sm font-medium text-foreground">{SECTION_LABELS[section]}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {groupedFields[section].map((field) => {
                    const checked = selectedFieldKeys.includes(field.key as ApplicationExportFieldKey);
                    return (
                      <label
                        key={field.key}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleField(field.key as ApplicationExportFieldKey)}
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <div className="flex w-full items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {selectedCount} field(s) selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isLoading || selectedCount === 0 || applications.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Export Excel
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
