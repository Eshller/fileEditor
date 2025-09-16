import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Document } from '@/types/pdf';

interface XlsxViewerProps {
  document: Document;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function XlsxViewer({ document, onPageChange, onZoomChange }: XlsxViewerProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWorkbook = async () => {
      if (!document?.file || !isMounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const arrayBuffer = await document.file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer);

        if (!isMounted) return;

        setWorkbook(wb);

        // Set first sheet as default
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setCurrentSheet(firstSheet);
          const worksheet = wb.Sheets[firstSheet];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          setSheetData(data as any[][]);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load XLSX');
          console.error('XLSX loading error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWorkbook();

    // Cleanup function to prevent memory leaks and race conditions
    return () => {
      isMounted = false;
    };
  }, [document]);

  const handleSheetChange = (sheetName: string) => {
    if (!workbook || !workbook.Sheets[sheetName]) return;

    setCurrentSheet(sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    setSheetData(data as any[][]);
  };

  const zoomIn = () => {
    onZoomChange(Math.min(document.zoom + 0.25, 3));
  };

  const zoomOut = () => {
    onZoomChange(Math.max(document.zoom - 0.25, 0.5));
  };

  const headers = useMemo(() => {
    return sheetData.length > 0 ? sheetData[0] : [];
  }, [sheetData]);

  const rows = useMemo(() => {
    return sheetData.slice(1);
  }, [sheetData]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading XLSX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Error loading XLSX</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!workbook) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-muted p-6">
      <div className="h-full flex flex-col">
        {/* Sheet Selection */}
        {workbook.SheetNames.length > 1 && (
          <div className="mb-4 flex items-center space-x-4">
            <span className="text-sm font-medium">Sheet:</span>
            <Select value={currentSheet} onValueChange={handleSheetChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workbook.SheetNames.map((sheetName) => (
                  <SelectItem key={sheetName} value={sheetName}>
                    {sheetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spreadsheet Content */}
        <div
          className="flex-1 bg-white rounded-lg shadow-xl overflow-auto"
          style={{
            transform: `scale(${document.zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="min-w-full" data-testid="xlsx-container">
            {sheetData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {headers.map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200"
                        >
                          {row[colIndex] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No data in this sheet
              </div>
            )}
          </div>
        </div>
      </div>

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