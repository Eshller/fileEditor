import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import type { Annotation } from '@/types/pdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs`;

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
    annotations: Annotation[],
    zoom: number = 1
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
        // Convert coordinates from canvas space to PDF space
        // Canvas coordinates are already in PDF space when zoom = 1
        const pdfX = annotation.x;
        const pdfY = height - annotation.y; // PDF coordinates are bottom-up

        if (annotation.type === 'text' && annotation.content) {
          const color = this.hexToRgb(annotation.color);
          page.drawText(annotation.content, {
            x: pdfX,
            y: pdfY,
            size: annotation.size * 8, // Scale up text size for PDF
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
          });
        } else if (annotation.type === 'highlight') {
          const color = this.hexToRgb(annotation.color);
          const pdfWidth = annotation.width || 100;
          const pdfHeight = annotation.height || 20;

          page.drawRectangle({
            x: pdfX,
            y: pdfY - pdfHeight,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
            opacity: 0.3,
          });
        } else if (annotation.type === 'drawing' && annotation.points) {
          // Draw freehand paths
          const color = this.hexToRgb(annotation.color);
          const strokeWidth = annotation.size || 2;

          if (annotation.points.length > 1) {
            for (let i = 1; i < annotation.points.length; i++) {
              page.drawLine({
                start: {
                  x: annotation.points[i - 1].x,
                  y: height - annotation.points[i - 1].y
                },
                end: {
                  x: annotation.points[i].x,
                  y: height - annotation.points[i].y
                },
                thickness: strokeWidth,
                color: rgb(color.r / 255, color.g / 255, color.b / 255),
              });
            }
          }
        }
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
