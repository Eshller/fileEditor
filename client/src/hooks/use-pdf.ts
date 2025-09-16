import { useState, useCallback } from 'react';
import type { PdfDocument } from '@/types/pdf';
import { PdfUtils } from '@/lib/pdf-utils';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function usePdf() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const pdf = await PdfUtils.loadPdf(file);
      const pdfDoc: PdfDocument = {
        file,
        pages: pdf.numPages,
        currentPage: 1,
        zoom: 1,
      };
      
      setDocument(pdfDoc);
      setPdfProxy(pdf);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    if (document && page >= 1 && page <= document.pages) {
      setDocument(prev => prev ? { ...prev, currentPage: page } : null);
    }
  }, [document]);

  const setZoom = useCallback((zoom: number) => {
    if (document && zoom >= 0.5 && zoom <= 3) {
      setDocument(prev => prev ? { ...prev, zoom } : null);
    }
  }, [document]);

  const nextPage = useCallback(() => {
    if (document && document.currentPage < document.pages) {
      setCurrentPage(document.currentPage + 1);
    }
  }, [document, setCurrentPage]);

  const previousPage = useCallback(() => {
    if (document && document.currentPage > 1) {
      setCurrentPage(document.currentPage - 1);
    }
  }, [document, setCurrentPage]);

  const zoomIn = useCallback(() => {
    if (document) {
      setZoom(Math.min(document.zoom + 0.25, 3));
    }
  }, [document, setZoom]);

  const zoomOut = useCallback(() => {
    if (document) {
      setZoom(Math.max(document.zoom - 0.25, 0.5));
    }
  }, [document, setZoom]);

  return {
    document,
    pdfProxy,
    loading,
    error,
    loadPdf,
    setCurrentPage,
    setZoom,
    nextPage,
    previousPage,
    zoomIn,
    zoomOut,
  };
}
