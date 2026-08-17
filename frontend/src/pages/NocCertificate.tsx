import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMyNocs } from '@/hooks/use-noc-api';
import { resolveNocCertificatePreview } from '@/lib/nocTemplateModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { NocTemplatePreview } from '@/components/noc/NocTemplatePreview';

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function NocCertificatePage() {
  const { nocId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestsQuery = useMyNocs();
  const downloadRequestedRef = useRef(false);

  const request = useMemo(() => {
    if (!nocId) return null;
    return requestsQuery.data?.find((item) => item.id === nocId) ?? null;
  }, [nocId, requestsQuery.data]);

  const preview = useMemo(() => {
    if (!request) return null;
    return resolveNocCertificatePreview(request);
  }, [request]);

  const certificateUrl = request?.certificate_url ? resolveBackendAssetUrl(request.certificate_url) : null;
  const certificateFileName = `${request?.noc_number || preview?.values.reference_number || 'noc-certificate'}.pdf`;
  const downloadRequested = searchParams.get('download') === '1';

  useEffect(() => {
    if (!preview?.values.reference_number) return;

    const previousTitle = document.title;
    document.title = preview.values.reference_number;
    return () => {
      document.title = previousTitle;
    };
  }, [preview?.values.reference_number]);

  useEffect(() => {
    if (!downloadRequested || !certificateUrl || downloadRequestedRef.current) return;

    downloadRequestedRef.current = true;
    const timer = window.setTimeout(() => {
      triggerDownload(certificateUrl, certificateFileName);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [certificateFileName, certificateUrl, downloadRequested]);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-0 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="outline" onClick={() => navigate('/noc')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to NOC
          </Button>
          {certificateUrl ? (
            <Button
              onClick={() => triggerDownload(certificateUrl, certificateFileName)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          ) : null}
        </div>

        {requestsQuery.isLoading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading certificate...
            </CardContent>
          </Card>
        ) : certificateUrl ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
              <iframe
                title={`NOC Certificate ${request?.noc_number || ''}`}
                src={certificateUrl}
                className="h-[calc(100vh-150px)] w-full bg-white"
              />
            </div>
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open certificate in a new tab
            </a>
          </div>
        ) : preview ? (
          <div className="flex justify-center">
            <NocTemplatePreview subject={preview.subject} bodyHtml={preview.bodyHtml} values={preview.values} />
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Certificate data could not be found. Return to the NOC page and try again.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
