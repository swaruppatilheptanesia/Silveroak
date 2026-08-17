import { useEffect, useId, useRef } from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveBackendAssetUrl } from '@/lib/studentModule';

const ACCEPTED_POLICY_DOCUMENT_TYPES = ['.pdf', 'application/pdf'].join(',');

function formatFileSize(size: number | null | undefined) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyDocumentUploadField({
  selectedFile,
  documentName,
  documentUrl,
  documentSize,
  disabled = false,
  onFileChange,
  onRemove,
}: {
  selectedFile: File | null;
  documentName?: string | null;
  documentUrl?: string | null;
  documentSize?: number | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleName = selectedFile?.name ?? documentName ?? '';
  const visibleSize = selectedFile ? formatFileSize(selectedFile.size) : formatFileSize(documentSize);

  useEffect(() => {
    if (!selectedFile && !documentName && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [documentName, selectedFile]);

  function handleRemove() {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove();
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor={inputId}>Policy Document</Label>
        <p className="text-sm text-muted-foreground">Optional. Upload a PDF attachment for this policy.</p>
      </div>

      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_POLICY_DOCUMENT_TYPES}
        disabled={disabled}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />

      {visibleName ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              {documentUrl && !selectedFile ? (
                <a
                  href={resolveBackendAssetUrl(documentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium text-primary hover:underline"
                >
                  {visibleName}
                </a>
              ) : (
                <span className="truncate font-medium">{visibleName}</span>
              )}
            </div>
            {visibleSize ? <p className="mt-1 text-xs text-muted-foreground">{visibleSize}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
            <X className="h-4 w-4" />
            <span className="sr-only">Remove document</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
