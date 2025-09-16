import { useState, useCallback } from 'react';
import type { Annotation, Tool } from '@/types/pdf';
import { nanoid } from 'nanoid';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>({
    type: 'select',
    color: '#ef4444',
    size: 2,
  });

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: nanoid(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    return newAnnotation.id;
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev =>
      prev.map(annotation =>
        annotation.id === id ? { ...annotation, ...updates } : annotation
      )
    );
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  }, []);

  const getAnnotationsForPage = useCallback((page: number) => {
    return annotations.filter(annotation => annotation.page === page);
  }, [annotations]);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const setTool = useCallback((tool: Partial<Tool>) => {
    setCurrentTool(prev => ({ ...prev, ...tool }));
  }, []);

  return {
    annotations,
    currentTool,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    getAnnotationsForPage,
    clearAnnotations,
    setTool,
  };
}
