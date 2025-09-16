export interface Document {
  file: File;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx';
  pages: number;
  currentPage: number;
  zoom: number;
}

export interface PdfDocument extends Document {
  type: 'pdf';
}

export interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'drawing' | 'eraser';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  size: number;
  points?: Array<{ x: number; y: number }>;
}

export interface Tool {
  type: 'select' | 'text' | 'highlight' | 'draw' | 'eraser';
  color: string;
  size: number;
}

export interface Settings {
  defaultTool: string;
  autoSave: boolean;
  exportQuality: 'high' | 'medium' | 'low';
}
