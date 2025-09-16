import { useEffect, useRef, useState, useCallback } from 'react';
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
  const stableContainerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Use callback ref for more reliable container access
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    stableContainerRef.current = node;
  }, []);

  useEffect(() => {
    let isActive = true;
    let currentContainer: HTMLDivElement | null = null;

    const renderDocx = async () => {
      if (!document?.file || !isActive) return;

      console.log('Starting DOCX rendering...', { fileName: document.file.name, fileSize: document.file.size });

      setIsLoading(true);
      setError(null);
      setIsRendered(false);
      setHasContent(false);

      try {
        // Get container ref immediately and store it
        currentContainer = stableContainerRef.current;
        if (!currentContainer) {
          console.log('Container not available, aborting');
          setIsLoading(false);
          return;
        }

        console.log('Container found, proceeding with rendering...');

        // Process the file and immediately check container
        const arrayBuffer = await document.file.arrayBuffer();
        console.log('ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');

        // Immediately check if we're still active and container exists
        if (!isActive) {
          console.log('Component unmounted during arrayBuffer creation, aborting');
          return;
        }

        // Check the stable container reference
        if (!stableContainerRef.current) {
          console.log('Stable container ref is null after async operation, aborting');
          return;
        }

        // Check if container is still connected to DOM
        if (!stableContainerRef.current.isConnected) {
          console.log('Container is no longer connected to DOM, aborting');
          return;
        }

        // Use the stable container reference
        currentContainer = stableContainerRef.current;
        console.log('Using stable container reference for rendering');

        // Clear previous content safely
        currentContainer.innerHTML = '';
        console.log('Container cleared');

        // Final check before rendering
        if (!isActive) {
          console.log('Component unmounted before rendering, aborting');
          return;
        }

        console.log('Starting renderAsync...');

        // Try a different configuration that forces content to be visible
        const renderOptions = {
          className: 'docx-container',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          debug: true
        };

        console.log('Render options:', renderOptions);

        try {
          await renderAsync(arrayBuffer, currentContainer, undefined, renderOptions);
          console.log('DOCX rendering completed successfully');
        } catch (renderError) {
          console.error('renderAsync failed:', renderError);
          throw renderError;
        }

        // Check if still active before updating state
        if (!isActive) {
          console.log('Component unmounted during rendering, not updating state');
          return;
        }

        console.log('Container innerHTML length:', currentContainer?.innerHTML?.length || 0);
        console.log('Container children count:', currentContainer?.children?.length || 0);
        console.log('Container HTML preview:', currentContainer?.innerHTML?.substring(0, 500));

        // Log the actual rendered content structure
        if (currentContainer) {
          console.log('Container dimensions:', {
            width: currentContainer.offsetWidth,
            height: currentContainer.offsetHeight,
            scrollWidth: currentContainer.scrollWidth,
            scrollHeight: currentContainer.scrollHeight
          });

          // Log all child elements
          Array.from(currentContainer.children).forEach((child, index) => {
            console.log(`Child ${index}:`, {
              tagName: child.tagName,
              className: child.className,
              innerHTML: child.innerHTML.substring(0, 200),
              style: (child as HTMLElement).style.cssText
            });
          });
        }

        // Check if content was actually rendered
        if (currentContainer && currentContainer.innerHTML.trim().length > 0) {
          console.log('Content successfully rendered, preserving original formatting');

          // Apply styling to preserve DOCX formatting with better width
          currentContainer.style.cssText = `
            width: 100%;
            min-width: 1200px;
            min-height: 800px;
            background: white;
            color: #000;
            padding: 40px;
            margin: 0;
            display: block;
            visibility: visible;
            opacity: 1;
            position: relative;
            z-index: 1;
            overflow: auto;
            border: 1px solid #ddd;
            box-sizing: border-box;
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
          `;

          // Apply styles to preserve DOCX formatting
          const docxElements = currentContainer.querySelectorAll('*');
          docxElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            // Only apply essential styles, don't override docx-preview's formatting
            if (htmlElement.style.color === '' || htmlElement.style.color === 'transparent') {
              htmlElement.style.color = '#000';
            }
            if (htmlElement.style.visibility === 'hidden') {
              htmlElement.style.visibility = 'visible';
            }
            if (htmlElement.style.opacity === '0') {
              htmlElement.style.opacity = '1';
            }
          });

          // Mark as rendered
          setHasContent(true);
          setIsRendered(true);
        } else {
          console.warn('No content was rendered, but renderAsync completed without error');
          console.log('Container HTML:', currentContainer?.innerHTML);

          // Still set as rendered to hide loading state
          setTimeout(() => {
            if (isActive) {
              setIsRendered(true);
            }
          }, 100);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to render DOCX');
          console.error('DOCX rendering error:', err);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    renderDocx();

    // Fallback timeout to prevent infinite loading state
    const fallbackTimeout = setTimeout(() => {
      if (isActive && !isRendered) {
        console.warn('DOCX rendering timeout, forcing render state to true');
        // Try to insert fallback content
        if (currentContainer) {
          currentContainer.innerHTML = `
            <div style="padding: 20px; color: #333;">
              <h2>DOCX Rendering Timeout</h2>
              <p>File: ${document.file.name}</p>
              <p>Size: ${document.file.size} bytes</p>
              <p>The DOCX file took too long to render. This might be due to file complexity or size.</p>
            </div>
          `;
        }
        setIsRendered(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    // Cleanup function to prevent memory leaks and race conditions
    return () => {
      isActive = false;
      clearTimeout(fallbackTimeout);
    };
  }, [document.file.name]);

  const zoomIn = () => {
    onZoomChange(Math.min(document.zoom + 0.25, 3));
  };

  const zoomOut = () => {
    onZoomChange(Math.max(document.zoom - 0.25, 0.5));
  };

  return (
    <div className="absolute inset-0 bg-muted p-6">
      <div className="h-full flex items-center justify-center">
        <div
          className="bg-white shadow-xl rounded-lg p-8 max-w-7xl max-h-full overflow-auto"
          style={{
            transform: `scale(${document.zoom})`,
            transformOrigin: 'center',
            minHeight: '800px',
            minWidth: '1200px',
          }}
        >
          <div
            key={`docx-container-${document.file.name}`}
            ref={setContainerRef}
            className="docx-content w-full"
            data-testid="docx-container"
            style={{
              minHeight: '800px',
              minWidth: '1200px',
              position: 'relative',
              zIndex: 1,
            }}
          >

          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading DOCX...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-destructive">Error loading DOCX</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

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