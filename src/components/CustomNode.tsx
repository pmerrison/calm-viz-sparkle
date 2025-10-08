import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const CustomNode = ({ data }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const description = data.description || 'No description available';
  const nodeType = data['node-type'] || data.node_type || data.type || 'Unknown';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-all duration-300 ease-in-out"
      style={{
        background: "hsl(var(--card))",
        border: "2px solid hsl(var(--primary))",
        borderRadius: "12px",
        padding: "16px",
        minWidth: isHovered ? "300px" : "220px",
        color: "hsl(var(--foreground))",
        fontSize: "14px",
        fontWeight: "500",
        boxShadow: isHovered ? "0 10px 30px -10px hsl(var(--primary) / 0.3)" : "none",
      }}
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="font-semibold mb-1">{data.label}</div>
      
      {isHovered && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground mb-1">Type:</div>
            <div className="text-xs font-medium text-accent">{nodeType}</div>
          </div>
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground mb-1">Description:</div>
            <div className="text-xs text-foreground leading-relaxed">{description}</div>
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
