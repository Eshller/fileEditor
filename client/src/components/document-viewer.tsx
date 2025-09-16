import { PdfViewer } from './pdf-viewer';
import { DocxViewer } from './docx-viewer';
import { XlsxViewer } from './xlsx-viewer';
import type { Document, Annotation, Tool } from '@/types/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface DocumentViewerProps {
  document: Document;
  pdfProxy?: PDFDocumentProxy | null;
  annotations?: Annotation[];
  currentTool?: Tool;
  onAddAnnotation?: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  onRemoveAnnotation?: (id: string) => void;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function DocumentViewer({
  document,
  pdfProxy,
  annotations = [],
  currentTool,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onPageChange,
  onZoomChange,
}: DocumentViewerProps) {

  switch (document.type) {
    case 'pdf':
      if (!pdfProxy) {
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        );
      }

      return (
        <PdfViewer
          document={document as import('@/types/pdf').PdfDocument}
          pdfProxy={pdfProxy}
          annotations={annotations}
          currentTool={currentTool!}
          onAddAnnotation={onAddAnnotation!}
          onUpdateAnnotation={onUpdateAnnotation!}
          onRemoveAnnotation={onRemoveAnnotation!}
          onPageChange={onPageChange}
          onZoomChange={onZoomChange}
        />
      );

    case 'docx':
      return (
        <DocxViewer
          document={document}
          onPageChange={onPageChange}
          onZoomChange={onZoomChange}
        />
      );

    case 'xlsx':
      return (
        <XlsxViewer
          document={document}
          onPageChange={onPageChange}
          onZoomChange={onZoomChange}
        />
      );

    case 'pptx':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">PowerPoint Support</h3>
            <p className="text-muted-foreground">
              PowerPoint (.pptx) viewing is coming soon!
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-destructive">Unsupported file type</h3>
            <p className="text-muted-foreground">
              This file type is not supported yet.
            </p>
          </div>
        </div>
      );
  }
}