import { Button } from '@/components/ui/button';
import { MousePointer, Type, Highlighter, Pen, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tool } from '@/types/pdf';

interface ToolSidebarProps {
  currentTool: Tool;
  onToolChange: (tool: Partial<Tool>) => void;
}

const tools = [
  { type: 'select' as const, icon: MousePointer, label: 'Select' },
  { type: 'text' as const, icon: Type, label: 'Text' },
  { type: 'highlight' as const, icon: Highlighter, label: 'Highlight' },
  { type: 'draw' as const, icon: Pen, label: 'Draw' },
  { type: 'eraser' as const, icon: Eraser, label: 'Eraser' },
];

const colors = [
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#eab308', label: 'Yellow' },
];

const sizes = [
  { value: 1, label: 'Small', height: 'h-1' },
  { value: 2, label: 'Medium', height: 'h-2' },
  { value: 4, label: 'Large', height: 'h-3' },
];

export function ToolSidebar({ currentTool, onToolChange }: ToolSidebarProps) {
  return (
    <div className="w-20 bg-card border-r border-border flex flex-col items-center py-4 space-y-4">
      {/* Logo */}
      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-primary-foreground"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      </div>

      {/* Tool Buttons */}
      <div className="space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool.type === tool.type;
          
          return (
            <Button
              key={tool.type}
              variant={isActive ? "default" : "secondary"}
              size="icon"
              className={cn(
                "w-12 h-12 transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:translate-y-[-1px] hover:shadow-md"
              )}
              onClick={() => onToolChange({ type: tool.type })}
              data-testid={`tool-${tool.type}`}
            >
              <Icon className="w-5 h-5" />
            </Button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Color Palette */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground text-center">Colors</div>
        <div className="grid grid-cols-2 gap-1">
          {colors.map((color) => (
            <button
              key={color.value}
              className={cn(
                "w-5 h-5 rounded border-2 transition-colors",
                currentTool.color === color.value
                  ? "border-ring"
                  : "border-transparent hover:border-muted-foreground"
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => onToolChange({ color: color.value })}
              data-testid={`color-${color.label.toLowerCase()}`}
            />
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground text-center">Size</div>
        <div className="space-y-1">
          {sizes.map((size) => (
            <button
              key={size.value}
              className={cn(
                "w-6 rounded cursor-pointer transition-colors",
                size.height,
                currentTool.size === size.value
                  ? "bg-primary"
                  : "bg-secondary hover:bg-accent"
              )}
              onClick={() => onToolChange({ size: size.value })}
              data-testid={`size-${size.label.toLowerCase()}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
