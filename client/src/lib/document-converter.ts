import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { PdfUtils } from './pdf-utils';
import type { Document, Annotation } from '@/types/pdf';

export class DocumentConverter {
  static async exportDocument(
    document: Document,
    annotations: Annotation[],
    format: 'original' | 'pdf'
  ): Promise<void> {
    try {
      if (format === 'original') {
        await this.exportAsOriginalFormat(document, annotations);
      } else {
        await this.exportAsPdf(document, annotations);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  private static async exportAsOriginalFormat(
    document: Document,
    annotations: Annotation[]
  ): Promise<void> {
    switch (document.type) {
      case 'pdf':
        const pdfBytes = await PdfUtils.exportPdfWithAnnotations(document.file, annotations);
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(pdfBlob, `edited_${document.file.name}`);
        break;
        
      case 'xlsx':
        await this.exportXlsxAsOriginal(document);
        break;
        
      case 'docx':
        await this.exportDocxAsOriginal(document);
        break;
        
      case 'pptx':
        // For now, just download the original file
        saveAs(document.file, document.file.name);
        break;
    }
  }

  private static async exportAsPdf(
    document: Document,
    annotations: Annotation[]
  ): Promise<void> {
    switch (document.type) {
      case 'pdf':
        // Already PDF, export with annotations
        const pdfBytes = await PdfUtils.exportPdfWithAnnotations(document.file, annotations);
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(pdfBlob, `${this.getFileNameWithoutExt(document.file.name)}.pdf`);
        break;
        
      case 'xlsx':
        await this.convertXlsxToPdf(document);
        break;
        
      case 'docx':
        await this.convertDocxToPdf(document);
        break;
        
      case 'pptx':
        throw new Error('PowerPoint to PDF conversion is not yet supported');
    }
  }

  private static async exportXlsxAsOriginal(document: Document): Promise<void> {
    try {
      const arrayBuffer = await document.file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Create new workbook with the same data (for now, this just creates a copy)
      const newWorkbook = XLSX.utils.book_new();
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
      });
      
      // Generate blob and download
      const xlsxArrayBuffer = XLSX.write(newWorkbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      
      const blob = new Blob([xlsxArrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, `edited_${document.file.name}`);
    } catch (error) {
      console.error('XLSX export error:', error);
      throw new Error('Failed to export XLSX file');
    }
  }

  private static async exportDocxAsOriginal(document: Document): Promise<void> {
    try {
      // For now, just download the original file
      // In a full implementation, you would apply any edits here
      saveAs(document.file, `edited_${document.file.name}`);
    } catch (error) {
      console.error('DOCX export error:', error);
      throw new Error('Failed to export DOCX file');
    }
  }

  private static async convertXlsxToPdf(document: Document): Promise<void> {
    try {
      const arrayBuffer = await document.file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Convert first sheet to HTML table
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const htmlTable = XLSX.utils.sheet_to_html(worksheet);
      
      // Create a properly formatted HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${document.file.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${this.getFileNameWithoutExt(document.file.name)}</h1>
          ${htmlTable}
        </body>
        </html>
      `;
      
      // Convert HTML to PDF
      const options = {
        margin: [10, 10, 10, 10],
        filename: `${this.getFileNameWithoutExt(document.file.name)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      const element = window.document.createElement('div');
      element.innerHTML = htmlContent;
      window.document.body.appendChild(element);
      element.style.display = 'none';
      
      await html2pdf().set(options).from(element).save();
      
      // Clean up
      window.document.body.removeChild(element);
    } catch (error) {
      console.error('XLSX to PDF conversion error:', error);
      throw new Error('Failed to convert XLSX to PDF');
    }
  }

  private static async convertDocxToPdf(document: Document): Promise<void> {
    try {
      const arrayBuffer = await document.file.arrayBuffer();
      
      // Create a temporary container for rendering
      const container = window.document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 210mm;
        padding: 20mm;
        background: white;
        font-family: Arial, sans-serif;
      `;
      window.document.body.appendChild(container);
      
      // Render DOCX to HTML
      await renderAsync(arrayBuffer, container, undefined, {
        className: 'docx-content',
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
      
      // Convert to PDF
      const options = {
        margin: [10, 10, 10, 10],
        filename: `${this.getFileNameWithoutExt(document.file.name)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(options).from(container).save();
      
      // Clean up
      window.document.body.removeChild(container);
    } catch (error) {
      console.error('DOCX to PDF conversion error:', error);
      throw new Error('Failed to convert DOCX to PDF');
    }
  }

  private static getFileNameWithoutExt(fileName: string): string {
    return fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  }
}