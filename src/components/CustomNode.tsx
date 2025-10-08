import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const CustomNode = ({ data }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const label = data.label || data.name || 'Node';
  const description = data.description || '';
  const nodeType = data['node-type'] || data.node_type || '';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative transition-all duration-300"
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-accent" />
      
      <div 
        className={`
          bg-card border-2 border-primary rounded-xl p-4 min-w-[220px]
          transition-all duration-300 shadow-lg
          ${isHovered ? 'scale-110 shadow-2xl border-accent' : ''}
        `}
      >
        <div className="text-sm font-semibold text-foreground mb-2">
          {label}
        </div>
        
        {isHovered && (description || nodeType) && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2 animate-fade-in">
            {nodeType && (
              <div className="text-xs">
                <span className="text-muted-foreground">Type: </span>
                <span className="font-mono text-accent">{nodeType}</span>
              </div>
            )}
            {description && (
              <div className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-accent" />
    </div>
  );
};
