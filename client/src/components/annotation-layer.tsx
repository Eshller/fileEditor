import { useEffect, useRef, useCallback, useState } from 'react';
import type { Annotation, Tool } from '@/types/pdf';

interface AnnotationLayerProps {
  annotations: Annotation[];
  currentTool: Tool;
  page: number;
  zoom: number;
  panOffset?: { x: number; y: number };
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onRemoveAnnotation: (id: string) => void;
  width: number;
  height: number;
}

export function AnnotationLayer({
  annotations,
  currentTool,
  page,
  zoom,
  panOffset = { x: 0, y: 0 },
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  width,
  height,
}: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [originalPosition, setOriginalPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const getCanvasCoordinates = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  // Helper function to check if a point is within a text annotation
  const isPointInTextAnnotation = useCallback((point: { x: number; y: number }, annotation: Annotation) => {
    if (annotation.type !== 'text' || !annotation.content) return false;

    // Estimate text bounds based on content length and font size
    const textWidth = annotation.content.length * (annotation.size * 6); // Rough estimation
    const textHeight = annotation.size * 12;

    return (
      point.x >= annotation.x &&
      point.x <= annotation.x + textWidth &&
      point.y >= annotation.y - textHeight &&
      point.y <= annotation.y
    );
  }, []);

  // Helper function to find annotation at a point
  const findAnnotationAtPoint = useCallback((point: { x: number; y: number }) => {
    console.log('Finding annotation at point:', point, 'page:', page, 'annotations:', annotations.length);

    // Check text annotations first (they're most likely to be clicked)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      if (annotation.page === page && annotation.type === 'text' && isPointInTextAnnotation(point, annotation)) {
        console.log('Found text annotation:', annotation);
        return annotation;
      }
    }

    // Check other annotation types
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      if (annotation.page !== page) continue;

      if (annotation.type === 'highlight') {
        const width = annotation.width || 100;
        const height = annotation.height || 20;
        if (
          point.x >= annotation.x &&
          point.x <= annotation.x + width &&
          point.y >= annotation.y &&
          point.y <= annotation.y + height
        ) {
          console.log('Found highlight annotation:', annotation);
          return annotation;
        }
      }
    }

    console.log('No annotation found');
    return null;
  }, [annotations, page, isPointInTextAnnotation]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotations.forEach(annotation => {
      if (annotation.page !== page) return;

      ctx.save();
      ctx.globalAlpha = annotation.type === 'highlight' ? 0.3 : 1;

      switch (annotation.type) {
        case 'text':
          if (annotation.content) {
            ctx.fillStyle = annotation.color;
            ctx.font = `${annotation.size * 8}px Inter`;
            ctx.fillText(annotation.content, annotation.x * zoom, annotation.y * zoom);

            // Draw selection indicator for selected text
            if (selectedAnnotation === annotation.id) {
              ctx.strokeStyle = '#007bff';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);

              const textWidth = annotation.content.length * (annotation.size * 6);
              const textHeight = annotation.size * 12;

              ctx.strokeRect(
                annotation.x * zoom - 2,
                (annotation.y - textHeight) * zoom - 2,
                textWidth + 4,
                textHeight + 4
              );
              ctx.setLineDash([]);
            }
          }
          break;

        case 'highlight':
          ctx.fillStyle = annotation.color;
          ctx.fillRect(
            annotation.x * zoom,
            annotation.y * zoom,
            (annotation.width || 100) * zoom,
            (annotation.height || 20) * zoom
          );

          // Draw selection indicator for selected highlight
          if (selectedAnnotation === annotation.id) {
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
              annotation.x * zoom,
              annotation.y * zoom,
              (annotation.width || 100) * zoom,
              (annotation.height || 20) * zoom
            );
            ctx.setLineDash([]);
          }
          break;

        case 'drawing':
          if (annotation.points && annotation.points.length > 1) {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.size * zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x * zoom, annotation.points[0].y * zoom);
            for (let i = 1; i < annotation.points.length; i++) {
              ctx.lineTo(annotation.points[i].x * zoom, annotation.points[i].y * zoom);
            }
            ctx.stroke();
          }
          break;
      }

      ctx.restore();
    });

    // Draw current highlight being created
    if (isHighlighting && currentHighlight) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = currentTool.color;
      ctx.fillRect(
        currentHighlight.x * zoom,
        currentHighlight.y * zoom,
        currentHighlight.width * zoom,
        currentHighlight.height * zoom
      );
      ctx.restore();
    }
  }, [annotations, page, zoom, selectedAnnotation, isHighlighting, currentHighlight, currentTool.color]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoordinates(e);

    if (currentTool.type === 'select') {
      // Handle selection and dragging
      const clickedAnnotation = findAnnotationAtPoint(coords);

      if (clickedAnnotation) {
        setSelectedAnnotation(clickedAnnotation.id);
        setIsDragging(true);
        setDragStart(coords);
        setOriginalPosition({ x: clickedAnnotation.x, y: clickedAnnotation.y });
      } else {
        setSelectedAnnotation(null);
      }
      return;
    }

    if (currentTool.type === 'eraser') {
      // Handle eraser - find and remove annotation at click point
      console.log('Eraser clicked at:', coords);
      const clickedAnnotation = findAnnotationAtPoint(coords);
      console.log('Found annotation:', clickedAnnotation);

      if (clickedAnnotation) {
        console.log('Removing annotation:', clickedAnnotation.id);
        onRemoveAnnotation(clickedAnnotation.id);
        setSelectedAnnotation(null); // Clear selection if erasing selected annotation
      } else {
        console.log('No annotation found at click point');
      }
      return;
    }

    // Handle other tools
    isDrawingRef.current = true;

    if (currentTool.type === 'draw') {
      currentPathRef.current = [coords];
    } else if (currentTool.type === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        onAddAnnotation({
          type: 'text',
          page,
          x: coords.x,
          y: coords.y,
          content: text,
          color: currentTool.color,
          size: currentTool.size,
        });
      }
    } else if (currentTool.type === 'highlight') {
      // Start highlight selection
      setIsHighlighting(true);
      setHighlightStart(coords);
      setCurrentHighlight({
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
      });
    }
  }, [currentTool, page, getCanvasCoordinates, onAddAnnotation, findAnnotationAtPoint]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoordinates(e);

    // Handle dragging selected annotations
    if (isDragging && selectedAnnotation && dragStart && originalPosition) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      const newX = originalPosition.x + deltaX;
      const newY = originalPosition.y + deltaY;

      // Update the annotation position
      onUpdateAnnotation(selectedAnnotation, { x: newX, y: newY });
      return;
    }

    // Handle highlighting
    if (isHighlighting && highlightStart) {
      const width = coords.x - highlightStart.x;
      const height = coords.y - highlightStart.y;

      setCurrentHighlight({
        x: Math.min(highlightStart.x, coords.x),
        y: Math.min(highlightStart.y, coords.y),
        width: Math.abs(width),
        height: Math.abs(height),
      });
      return;
    }

    // Handle drawing
    if (!isDrawingRef.current || currentTool.type !== 'draw') return;

    currentPathRef.current.push(coords);

    // Redraw with current path
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    redrawCanvas();

    // Draw current path
    if (currentPathRef.current.length > 1) {
      ctx.strokeStyle = currentTool.color;
      ctx.lineWidth = currentTool.size * zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x * zoom, currentPathRef.current[0].y * zoom);
      for (let i = 1; i < currentPathRef.current.length; i++) {
        ctx.lineTo(currentPathRef.current[i].x * zoom, currentPathRef.current[i].y * zoom);
      }
      ctx.stroke();
    }
  }, [currentTool, zoom, getCanvasCoordinates, redrawCanvas, isDragging, selectedAnnotation, dragStart, originalPosition, onUpdateAnnotation]);

  const handleMouseUp = useCallback(() => {
    // Handle highlight completion
    if (isHighlighting && currentHighlight && currentHighlight.width > 5 && currentHighlight.height > 5) {
      onAddAnnotation({
        type: 'highlight',
        page,
        x: currentHighlight.x,
        y: currentHighlight.y,
        width: currentHighlight.width,
        height: currentHighlight.height,
        color: currentTool.color,
        size: currentTool.size,
      });
    }

    // Reset highlighting state
    setIsHighlighting(false);
    setHighlightStart(null);
    setCurrentHighlight(null);

    // Handle drag completion
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setOriginalPosition(null);
      return;
    }

    // Handle drawing completion
    if (!isDrawingRef.current) return;

    if (currentTool.type === 'draw' && currentPathRef.current.length > 1) {
      onAddAnnotation({
        type: 'drawing',
        page,
        x: currentPathRef.current[0].x,
        y: currentPathRef.current[0].y,
        points: [...currentPathRef.current],
        color: currentTool.color,
        size: currentTool.size,
      });
    }

    isDrawingRef.current = false;
    currentPathRef.current = [];
  }, [currentTool, page, onAddAnnotation, isDragging, isHighlighting, currentHighlight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  const getCursorStyle = () => {
    if (currentTool.type === 'select') {
      return isDragging ? 'grabbing' : 'grab';
    }
    if (currentTool.type === 'eraser') {
      return 'crosshair';
    }
    if (currentTool.type === 'highlight') {
      return 'crosshair';
    }
    return 'crosshair';
  };

  return (
    <canvas
      ref={canvasRef}
      width={width * zoom}
      height={height * zoom}
      className="absolute inset-0"
      style={{
        width: width * zoom,
        height: height * zoom,
        cursor: getCursorStyle(),
      }}
      data-testid="annotation-canvas"
    />
  );
}
