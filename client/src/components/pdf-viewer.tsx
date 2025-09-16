import { useEffect, useRef, useState, useCallback } from 'react';
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
  onRemoveAnnotation: (id: string) => void;
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
  onRemoveAnnotation,
  onPageChange,
  onZoomChange,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // Check if we're zoomed in enough to need panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const zoomedIn = canvasSize.width > containerRect.width || canvasSize.height > containerRect.height;
    console.log('Zoom check - canvasSize:', canvasSize, 'containerRect:', containerRect, 'zoomedIn:', zoomedIn);
    setIsZoomedIn(zoomedIn);

    // Reset pan offset when not zoomed in
    if (!zoomedIn) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [canvasSize, document.zoom]);

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

  // Panning event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('Mouse down - isZoomedIn:', isZoomedIn, 'currentTool:', currentTool.type);
    if (!isZoomedIn) return;

    // Allow panning with any tool when zoomed in
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    console.log('Started panning');
  }, [isZoomedIn, panOffset, currentTool.type]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !isZoomedIn) return;

    e.preventDefault();
    e.stopPropagation();
    const newOffset = {
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    };

    // Constrain panning to keep content visible
    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const maxX = Math.max(0, canvasSize.width - containerRect.width);
      const maxY = Math.max(0, canvasSize.height - containerRect.height);

      newOffset.x = Math.max(-maxX, Math.min(0, newOffset.x));
      newOffset.y = Math.max(-maxY, Math.min(0, newOffset.y));
    }

    setPanOffset(newOffset);
  }, [isPanning, isZoomedIn, panStart, canvasSize]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div className="absolute inset-0 bg-muted p-6">
      <div className="h-full flex items-center justify-center">
        <div
          ref={containerRef}
          className="pdf-container relative overflow-hidden shadow-xl rounded-lg bg-white"
          style={{
            width: isZoomedIn ? '100%' : 'auto',
            height: isZoomedIn ? '100%' : 'auto',
            maxWidth: isZoomedIn ? '100%' : 'none',
            maxHeight: isZoomedIn ? '100%' : 'none',
            cursor: isZoomedIn ? (isPanning ? 'grabbing' : 'grab') : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="pdf-canvas bg-white relative"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: isZoomedIn ? `translate(${panOffset.x}px, ${panOffset.y}px)` : 'none',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
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
              panOffset={panOffset}
              onAddAnnotation={onAddAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onRemoveAnnotation={onRemoveAnnotation}
              width={canvasSize.width}
              height={canvasSize.height}
            />
          </div>
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
