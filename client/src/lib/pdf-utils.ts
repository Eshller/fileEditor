import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import type { Annotation } from '@/types/pdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export class PdfUtils {
  static async loadPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return await loadingTask.promise;
  }

  static async renderPage(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1
  ): Promise<void> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    
    await page.render(renderContext).promise;
  }

  static async exportPdfWithAnnotations(
    originalFile: File,
    annotations: Annotation[]
  ): Promise<Uint8Array> {
    const arrayBuffer = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Group annotations by page
    const annotationsByPage = annotations.reduce((acc, annotation) => {
      if (!acc[annotation.page]) acc[annotation.page] = [];
      acc[annotation.page].push(annotation);
      return acc;
    }, {} as Record<number, Annotation[]>);
    
    // Add annotations to each page
    for (const [pageIndex, pageAnnotations] of Object.entries(annotationsByPage)) {
      const page = pdfDoc.getPage(parseInt(pageIndex) - 1);
      const { width, height } = page.getSize();
      
      for (const annotation of pageAnnotations) {
        if (annotation.type === 'text' && annotation.content) {
          const color = this.hexToRgb(annotation.color);
          page.drawText(annotation.content, {
            x: annotation.x,
            y: height - annotation.y, // PDF coordinates are bottom-up
            size: annotation.size,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
          });
        } else if (annotation.type === 'highlight') {
          const color = this.hexToRgb(annotation.color);
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - (annotation.height || 20),
            width: annotation.width || 100,
            height: annotation.height || 20,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
            opacity: 0.3,
          });
        }
        // Note: Drawing paths would require more complex PDF-lib operations
      }
    }
    
    return await pdfDoc.save();
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }
}
