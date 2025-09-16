import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Download, Settings, CloudUpload } from 'lucide-react';
import { ToolSidebar } from '@/components/tool-sidebar';
import { DocumentViewer } from '@/components/document-viewer';
import { useDocument } from '@/hooks/use-pdf';
import { useAnnotations } from '@/hooks/use-annotations';
import { PdfUtils } from '@/lib/pdf-utils';
import { DocumentConverter } from '@/lib/document-converter';
import { useToast } from '@/hooks/use-toast';
import type { Settings as SettingsType } from '@/types/pdf';

export default function PdfEditor() {
  const { toast } = useToast();
  const { document, pdfProxy, loading, error, loadDocument, setCurrentPage, setZoom } = useDocument();
  const { annotations, currentTool, addAnnotation, updateAnnotation, setTool } = useAnnotations();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    defaultTool: 'select',
    autoSave: true,
    exportQuality: 'medium',
  });

  const handleFileUpload = useCallback(async (file: File) => {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    
    const supportedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a PDF, DOCX, XLSX, or PPTX file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await loadDocument(file);
      toast({
        title: 'Document uploaded successfully',
        description: `Loaded ${file.name}`,
      });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to load document',
        variant: 'destructive',
      });
    }
  }, [loadDocument, toast]);

  const handleUploadClick = useCallback(() => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDownload = useCallback(async (format: 'original' | 'pdf' = 'original') => {
    if (!document) return;

    try {
      await DocumentConverter.exportDocument(document, annotations, format);
      
      toast({
        title: 'Download complete',
        description: `Your document has been exported as ${format === 'pdf' ? 'PDF' : 'original format'}.`,
      });
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Failed to export document',
        variant: 'destructive',
      });
    }
  }, [document, annotations, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-destructive">Error loading document</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ToolSidebar currentTool={currentTool} onToolChange={setTool} />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-foreground">Document Editor</h1>
            <div className="text-sm text-muted-foreground" data-testid="file-name">
              {document?.file.name || 'No file selected'}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleUploadClick}
              className="flex items-center space-x-2"
              data-testid="upload-button"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                onClick={() => handleDownload('original')}
                disabled={!document}
                className="flex items-center space-x-2"
                data-testid="download-original-button"
              >
                <Download className="w-4 h-4" />
                <span>Download Original</span>
              </Button>
              
              {document && document.type !== 'pdf' && (
                <Button
                  variant="outline"
                  onClick={() => handleDownload('pdf')}
                  disabled={!document}
                  className="flex items-center space-x-2"
                  data-testid="download-pdf-button"
                >
                  <Download className="w-4 h-4" />
                  <span>Convert to PDF</span>
                </Button>
              )}
            </div>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowSettings(true)}
              data-testid="settings-button"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            </div>
          ) : document ? (
            <DocumentViewer
              document={document}
              pdfProxy={pdfProxy}
              annotations={annotations}
              currentTool={currentTool}
              onAddAnnotation={addAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onPageChange={setCurrentPage}
              onZoomChange={setZoom}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background to-muted border-2 border-dashed border-border transition-all duration-300 hover:border-primary hover:bg-gradient-to-br hover:from-muted hover:to-secondary"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-testid="drop-zone"
            >
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CloudUpload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Upload your document</h3>
                <p className="text-muted-foreground max-w-sm">
                  Drag and drop your document here, or click the upload button to select a file from your device.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Supports PDF, DOCX, XLSX, PPTX files up to 50MB</div>
                  <div>• All editing happens in your browser</div>
                  <div>• No files are uploaded to servers</div>
                  <div>• Export as PDF or original format</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="default-tool" className="text-sm font-medium">
                Default Tool
              </Label>
              <Select
                value={settings.defaultTool}
                onValueChange={(value) =>
                  setSettings(prev => ({ ...prev, defaultTool: value }))
                }
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select Cursor</SelectItem>
                  <SelectItem value="text">Text Tool</SelectItem>
                  <SelectItem value="highlight">Highlight Tool</SelectItem>
                  <SelectItem value="draw">Draw Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-save"
                checked={settings.autoSave}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoSave: checked === true }))
                }
              />
              <Label htmlFor="auto-save" className="text-sm">
                Save changes automatically
              </Label>
            </div>
            
            <div>
              <Label htmlFor="export-quality" className="text-sm font-medium">
                Export Quality
              </Label>
              <Select
                value={settings.exportQuality}
                onValueChange={(value: 'high' | 'medium' | 'low') =>
                  setSettings(prev => ({ ...prev, exportQuality: value }))
                }
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (Larger file)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="low">Low (Smaller file)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
