import { Card } from "./ui/card";
import { Info, X } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface NodeDetailsProps {
  node: any;
  onClose: () => void;
}

export const NodeDetails = ({ node, onClose }: NodeDetailsProps) => {
  if (!node) return null;

  const renderValue = (value: any): string => {
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Card className="h-full flex flex-col border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Node Details</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {Object.entries(node).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <dt className="text-sm font-medium text-accent">{key}</dt>
              <dd className="text-sm text-foreground bg-secondary/50 p-3 rounded-md font-mono whitespace-pre-wrap break-all">
                {renderValue(value)}
              </dd>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
