import { useState, useCallback } from 'react';
import type { Document, PdfDocument } from '@/types/pdf';
import { PdfUtils } from '@/lib/pdf-utils';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function useDocument() {
  const [document, setDocument] = useState<Document | null>(null);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      let docType: Document['type'];
      let pages = 1;
      
      // Determine document type and load accordingly
      if (file.type.includes('pdf') || fileExtension === '.pdf') {
        docType = 'pdf';
        const pdf = await PdfUtils.loadPdf(file);
        pages = pdf.numPages;
        setPdfProxy(pdf);
      } else if (fileExtension === '.docx') {
        docType = 'docx';
        setPdfProxy(null);
      } else if (fileExtension === '.xlsx') {
        docType = 'xlsx';
        setPdfProxy(null);
      } else if (fileExtension === '.pptx') {
        docType = 'pptx';
        setPdfProxy(null);
      } else {
        throw new Error('Unsupported file type');
      }
      
      const doc: Document = {
        file,
        type: docType,
        pages,
        currentPage: 1,
        zoom: 1,
      };
      
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
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
    loadDocument,
    setCurrentPage,
    setZoom,
    nextPage,
    previousPage,
    zoomIn,
    zoomOut,
  };
}
