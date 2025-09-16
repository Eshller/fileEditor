import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Document } from '@/types/pdf';

interface DocxViewerProps {
  document: Document;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function DocxViewer({ document, onPageChange, onZoomChange }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDocx = async () => {
      if (!containerRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const arrayBuffer = await document.file.arrayBuffer();
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-container',
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          debug: false
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render DOCX');
        console.error('DOCX rendering error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    renderDocx();
  }, [document]);

  const zoomIn = () => {
    onZoomChange(Math.min(document.zoom + 0.25, 3));
  };

  const zoomOut = () => {
    onZoomChange(Math.max(document.zoom - 0.25, 0.5));
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading DOCX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Error loading DOCX</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-muted p-6">
      <div className="h-full flex items-center justify-center">
        <div 
          className="bg-white shadow-xl rounded-lg p-8 max-w-4xl max-h-full overflow-auto"
          style={{
            transform: `scale(${document.zoom})`,
            transformOrigin: 'center',
          }}
        >
          <div
            ref={containerRef}
            className="docx-content"
            data-testid="docx-container"
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
    </div>
  );
}