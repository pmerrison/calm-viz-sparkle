import { NodeProps, Handle, Position } from 'reactflow';

export const SystemGroupNode = ({ data }: NodeProps) => {
  return (
    <div
      className="transition-all duration-300 ease-in-out"
      style={{
        background: "hsl(var(--card) / 0.05)",
        border: "2px dashed hsl(var(--muted-foreground))",
        borderRadius: "12px",
        padding: "24px",
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allow clicks to pass through to child nodes
      }}
    >
      {/* Add handles on all four sides for floating edges */}
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0, pointerEvents: 'all' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0, pointerEvents: 'all' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0, pointerEvents: 'all' }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0, pointerEvents: 'all' }} />
      <div
        className="absolute top-3 left-4 px-3 py-1 rounded-md font-semibold text-xs"
        style={{
          background: "hsl(var(--muted))",
          color: "hsl(var(--muted-foreground))",
          border: "1px solid hsl(var(--border))",
          pointerEvents: "auto", // Re-enable pointer events for the label so it's clickable
        }}
      >
        {data.label}
      </div>
    </div>
  );
};
