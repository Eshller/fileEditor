import { useEffect, useRef, useCallback } from 'react';
import type { Annotation, Tool } from '@/types/pdf';

interface AnnotationLayerProps {
  annotations: Annotation[];
  currentTool: Tool;
  page: number;
  zoom: number;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  width: number;
  height: number;
}

export function AnnotationLayer({
  annotations,
  currentTool,
  page,
  zoom,
  onAddAnnotation,
  onUpdateAnnotation,
  width,
  height,
}: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([]);

  const getCanvasCoordinates = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

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
  }, [annotations, page, zoom]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (currentTool.type === 'select') return;
    
    const coords = getCanvasCoordinates(e);
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
      // For simplicity, create a fixed-size highlight
      onAddAnnotation({
        type: 'highlight',
        page,
        x: coords.x,
        y: coords.y,
        width: 100,
        height: 20,
        color: currentTool.color,
        size: currentTool.size,
      });
    }
  }, [currentTool, page, getCanvasCoordinates, onAddAnnotation]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawingRef.current || currentTool.type !== 'draw') return;
    
    const coords = getCanvasCoordinates(e);
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
  }, [currentTool, zoom, getCanvasCoordinates, redrawCanvas]);

  const handleMouseUp = useCallback(() => {
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
  }, [currentTool, page, onAddAnnotation]);

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

  return (
    <canvas
      ref={canvasRef}
      width={width * zoom}
      height={height * zoom}
      className="absolute inset-0 cursor-crosshair"
      style={{
        width: width * zoom,
        height: height * zoom,
      }}
      data-testid="annotation-canvas"
    />
  );
}
