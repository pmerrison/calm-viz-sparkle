import { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { Info } from 'lucide-react';

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const description = data?.description || '';
  const protocol = data?.protocol || '';

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {description && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="nodrag nopan"
          >
            <div className="relative">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 border-2 border-accent hover:bg-accent/40 transition-all cursor-help">
                <Info className="w-3 h-3 text-accent" />
              </div>
              
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 top-8 z-[9999] animate-fade-in">
                  <div className="bg-card border-2 border-border rounded-lg shadow-lg p-3 max-w-xs">
                    <p className="text-xs font-medium text-foreground mb-1">{description}</p>
                    {protocol && (
                      <p className="text-xs text-muted-foreground">
                        Protocol: <span className="font-mono text-accent">{protocol}</span>
                      </p>
                    )}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-card border-l-2 border-t-2 border-border rotate-45" />
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
