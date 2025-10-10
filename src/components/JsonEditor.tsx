import { Editor } from "@monaco-editor/react";
import { Card } from "./ui/card";
import { Upload, FileText, Download } from "lucide-react";
import { Button } from "./ui/button";
import { useRef, useEffect } from "react";
import { toast } from "sonner";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFileUpload: (content: string) => void;
  onEditorReady?: (editor: any) => void;
}

export const JsonEditor = ({ value, onChange, onFileUpload, onEditorReady }: JsonEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('JsonEditor value prop changed, length:', value?.length);
    console.log('First 200 chars:', value?.substring(0, 200));
  }, [value]);

  const handleEditorDidMount = (editor: any) => {
    console.log('Monaco editor mounted');
    if (onEditorReady) {
      onEditorReady(editor);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileUpload(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    try {
      // Validate JSON before downloading
      JSON.parse(value);

      // Create blob and download
      const blob = new Blob([value], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `calm-architecture-${timestamp}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('JSON downloaded successfully');
    } catch (error) {
      toast.error('Cannot download: Invalid JSON format');
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">JSON Editor</h2>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </Card>
  );
};
