import { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { Info, Shield, AlertCircle } from 'lucide-react';

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

  // Extract AIGF data
  const aigf = data?.metadata?.aigf;
  const controlsApplied = aigf?.['controls-applied'] || [];
  const mitigations = aigf?.mitigations || [];
  const risks = aigf?.risks || [];
  const hasAIGF = controlsApplied.length > 0 || mitigations.length > 0 || risks.length > 0;

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
              zIndex: 1000,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="nodrag nopan"
          >
            <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all cursor-help ${
              hasAIGF
                ? 'bg-green-500/20 border-green-500 hover:bg-green-500/40'
                : 'bg-accent/20 border-accent hover:bg-accent/40'
            }`}>
              {hasAIGF ? (
                <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <Info className="w-3 h-3 text-accent" />
              )}
            </div>
          </div>

          {isHovered && (
            <div
              style={{
                position: 'fixed',
                left: labelX,
                top: labelY + 40,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 10000,
              }}
              className="animate-fade-in"
            >
              <div className="bg-card border-2 border-border rounded-lg shadow-lg p-3 max-w-sm">
                <p className="text-xs font-medium text-foreground mb-2">{description}</p>
                {protocol && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Protocol: <span className="font-mono text-accent">{protocol}</span>
                  </p>
                )}

                {/* Controls Applied */}
                {controlsApplied.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-1 mb-2">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-foreground">Controls Applied:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {controlsApplied.map((control: string, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 font-mono">
                          {control}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mitigations */}
                {mitigations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-1 mb-2">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-foreground">Mitigations:</span>
                    </div>
                    <div className="space-y-1">
                      {mitigations.map((mitigation: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          {typeof mitigation === 'string' ? (
                            <span className="font-mono text-green-600 dark:text-green-400">{mitigation}</span>
                          ) : (
                            <div>
                              <span className="font-mono text-green-600 dark:text-green-400">{mitigation.id}</span>
                              {mitigation.name && <span className="text-foreground/80"> - {mitigation.name}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {risks.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-1 mb-2">
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      <span className="text-xs font-medium text-foreground">Risks:</span>
                    </div>
                    <div className="space-y-1">
                      {risks.map((risk: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          {typeof risk === 'string' ? (
                            <span className="font-mono text-orange-600 dark:text-orange-400">{risk}</span>
                          ) : (
                            <div>
                              <span className="font-mono text-orange-600 dark:text-orange-400">{risk.id}</span>
                              {risk.name && <span className="text-foreground/80"> - {risk.name}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-card border-l-2 border-t-2 border-border rotate-45" />
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
};
