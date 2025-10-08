import { NodeProps } from 'reactflow';

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
      }}
    >
      <div 
        className="absolute top-3 left-4 px-3 py-1 rounded-md font-semibold text-xs"
        style={{
          background: "hsl(var(--muted))",
          color: "hsl(var(--muted-foreground))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {data.label}
      </div>
    </div>
  );
};
