import { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';

export const CustomNode = ({ data }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const description = data.description || 'No description available';
  const nodeType = data['node-type'] || data.node_type || data.type || 'Unknown';

  // Extract AIGF data
  const aigf = data.metadata?.aigf;
  const riskLevel = aigf?.['risk-level'] || null;
  const riskIds = aigf?.risks || [];
  const mitigationIds = aigf?.mitigations || [];

  // Get lookup tables from parent
  const aigfLookup = data._aigfLookup || { risks: [], mitigations: [] };
  const allRisks = aigfLookup.risks || [];
  const allMitigations = aigfLookup.mitigations || [];

  // Resolve risk and mitigation details
  const risks = riskIds.map((riskId: string) => {
    const found = allRisks.find((r: any) => r.id === riskId);
    return found || riskId;
  });

  const mitigations = mitigationIds.map((mitigationId: string) => {
    const found = allMitigations.find((m: any) => m.id === mitigationId);
    return found || mitigationId;
  });

  const riskCount = risks.length;
  const mitigationCount = mitigations.length;

  // Determine border color based on risk level
  const getBorderColor = () => {
    if (!riskLevel) return "hsl(var(--primary))";
    switch (riskLevel) {
      case 'critical':
        return "hsl(0 84% 60%)"; // Red
      case 'high':
        return "hsl(25 95% 53%)"; // Orange
      case 'medium':
        return "hsl(48 96% 53%)"; // Yellow
      default:
        return "hsl(var(--primary))";
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-all duration-300 ease-in-out"
      style={{
        background: "hsl(var(--card))",
        border: `2px solid ${getBorderColor()}`,
        borderRadius: "12px",
        padding: "16px",
        minWidth: isHovered ? "300px" : "220px",
        color: "hsl(var(--foreground))",
        fontSize: "14px",
        fontWeight: "500",
        boxShadow: isHovered ? `0 10px 30px -10px ${getBorderColor()} / 0.3` : "none",
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold mb-1 flex-1">{data.label}</div>
        {(riskCount > 0 || mitigationCount > 0) && (
          <div className="flex gap-1 items-center">
            {riskCount > 0 && (
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  background: getBorderColor() + ' / 0.15',
                  color: getBorderColor()
                }}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{riskCount}</span>
              </div>
            )}
            {mitigationCount > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium">
                <Shield className="w-3 h-3" />
                <span>{mitigationCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isHovered && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground mb-1">Type:</div>
            <div className="text-xs font-medium text-accent">{nodeType}</div>
          </div>
          {riskLevel && (
            <div className="border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Risk Level:</div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" style={{ color: getBorderColor() }} />
                <span className="text-xs font-medium uppercase" style={{ color: getBorderColor() }}>
                  {riskLevel}
                </span>
              </div>
            </div>
          )}
          {riskCount > 0 && (
            <div className="border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Risks:</div>
              <div className="text-xs text-foreground">
                {risks.map((risk: any, idx: number) => (
                  <div key={idx} className="mb-1">
                    {typeof risk === 'string'
                      ? risk
                      : risk.id && risk.name
                        ? `${risk.id}: ${risk.name}`
                        : risk.id || risk.name
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
          {mitigationCount > 0 && (
            <div className="border-t border-border pt-2">
              <div className="text-xs text-muted-foreground mb-1">Mitigations:</div>
              <div className="text-xs text-foreground">
                {mitigations.map((mitigation: any, idx: number) => (
                  <div key={idx} className="mb-1">
                    {typeof mitigation === 'string'
                      ? mitigation
                      : mitigation.id && mitigation.name
                        ? `${mitigation.id}: ${mitigation.name}`
                        : mitigation.id || mitigation.name
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
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
