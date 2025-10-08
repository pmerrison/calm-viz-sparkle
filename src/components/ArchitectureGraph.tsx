import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "./ui/card";
import { Network, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface ArchitectureGraphProps {
  jsonData: any;
  onNodeClick: (node: any) => void;
}

export const ArchitectureGraph = ({ jsonData, onNodeClick }: ArchitectureGraphProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const parseCALMData = useCallback((data: any) => {
    if (!data) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    try {
      // Parse nodes from CALM structure
      if (data.nodes) {
        Object.entries(data.nodes).forEach(([id, node]: [string, any], index) => {
          const x = (index % 4) * 300 + 100;
          const y = Math.floor(index / 4) * 200 + 100;
          
          newNodes.push({
            id,
            type: "default",
            position: { x, y },
            data: { 
              label: node.name || node.unique_id || id,
              ...node 
            },
            style: {
              background: "hsl(var(--card))",
              border: "2px solid hsl(var(--primary))",
              borderRadius: "12px",
              padding: "16px",
              width: 200,
              color: "hsl(var(--foreground))",
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
        });
      }

      // Parse relationships/edges
      if (data.relationships) {
        data.relationships.forEach((rel: any, index: number) => {
          newEdges.push({
            id: `edge-${index}`,
            source: rel.source || rel.from,
            target: rel.target || rel.to,
            type: "smoothstep",
            animated: true,
            style: { stroke: "hsl(var(--accent))", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(var(--accent))",
            },
            label: rel.relationship_type || rel.type || "",
          });
        });
      }

      return { nodes: newNodes, edges: newEdges };
    } catch (error) {
      console.error("Error parsing CALM data:", error);
      return { nodes: [], edges: [] };
    }
  }, []);

  useEffect(() => {
    const { nodes: parsedNodes, edges: parsedEdges } = parseCALMData(jsonData);
    setNodes(parsedNodes);
    setEdges(parsedEdges);
  }, [jsonData, parseCALMData, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick(node.data);
    },
    [onNodeClick]
  );

  const isEmpty = nodes.length === 0;

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border bg-card">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Network className="w-4 h-4 text-accent" />
        <h2 className="font-semibold">Architecture Visualization</h2>
      </div>

      <div className="flex-1 relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload or paste a valid FINOS CALM JSON file to visualize the architecture.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="hsl(var(--muted-foreground))" gap={16} />
            <Controls className="bg-card border-border" />
            <MiniMap
              className="bg-card border-border"
              nodeColor="hsl(var(--primary))"
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        )}
      </div>
    </Card>
  );
};
