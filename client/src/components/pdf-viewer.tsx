import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { PdfUtils } from '@/lib/pdf-utils';
import { AnnotationLayer } from './annotation-layer';
import type { PdfDocument, Annotation, Tool } from '@/types/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfViewerProps {
  document: PdfDocument;
  pdfProxy: PDFDocumentProxy;
  annotations: Annotation[];
  currentTool: Tool;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function PdfViewer({
  document,
  pdfProxy,
  annotations,
  currentTool,
  onAddAnnotation,
  onUpdateAnnotation,
  onPageChange,
  onZoomChange,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });

  useEffect(() => {
    const renderCurrentPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas || !pdfProxy) return;

      try {
        await PdfUtils.renderPage(pdfProxy, document.currentPage, canvas, document.zoom);
        setCanvasSize({ width: canvas.width, height: canvas.height });
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      }
    };

    renderCurrentPage();
  }, [document.currentPage, document.zoom, pdfProxy]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= document.pages) {
      onPageChange(page);
    }
  };

  const zoomIn = () => {
    onZoomChange(Math.min(document.zoom + 0.25, 3));
  };

  const zoomOut = () => {
    onZoomChange(Math.max(document.zoom - 0.25, 0.5));
  };

  const nextPage = () => {
    if (document.currentPage < document.pages) {
      onPageChange(document.currentPage + 1);
    }
  };

  const previousPage = () => {
    if (document.currentPage > 1) {
      onPageChange(document.currentPage - 1);
    }
  };

  return (
    <div className="absolute inset-0 bg-muted p-6">
      <div className="h-full flex items-center justify-center">
        <div
          className="pdf-canvas bg-white relative shadow-xl rounded-lg"
          style={{
            width: canvasSize.width * document.zoom,
            height: canvasSize.height * document.zoom,
          }}
        >
          <canvas
            ref={canvasRef}
            className="block rounded-lg"
            data-testid="pdf-canvas"
          />
          
          <AnnotationLayer
            annotations={annotations.filter(a => a.page === document.currentPage)}
            currentTool={currentTool}
            page={document.currentPage}
            zoom={document.zoom}
            onAddAnnotation={onAddAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            width={canvasSize.width}
            height={canvasSize.height}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-control absolute bottom-6 right-6 rounded-lg shadow-lg flex items-center space-x-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-border">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={zoomOut}
          disabled={document.zoom <= 0.5}
          data-testid="zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-12 text-center" data-testid="zoom-level">
          {Math.round(document.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={zoomIn}
          disabled={document.zoom >= 3}
          data-testid="zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Page Navigator */}
      <div className="page-navigator absolute bottom-6 left-1/2 transform -translate-x-1/2 rounded-lg shadow-lg flex items-center space-x-3 px-4 py-2 bg-white/95 backdrop-blur-sm border border-border">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={previousPage}
          disabled={document.currentPage <= 1}
          data-testid="previous-page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Page</span>
          <Input
            type="number"
            value={document.currentPage}
            onChange={handlePageInputChange}
            min={1}
            max={document.pages}
            className="w-12 text-center text-sm h-7"
            data-testid="page-input"
          />
          <span className="text-sm text-muted-foreground">
            of <span data-testid="total-pages">{document.pages}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={nextPage}
          disabled={document.currentPage >= document.pages}
          data-testid="next-page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
