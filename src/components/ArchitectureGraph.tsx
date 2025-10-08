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
import dagre from "dagre";
import "reactflow/dist/style.css";
import { Card } from "./ui/card";
import { Network, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { CustomEdge } from "./CustomEdge";

interface ArchitectureGraphProps {
  jsonData: any;
  onNodeClick: (node: any) => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 250;
  const nodeHeight = 100;
  
  dagreGraph.setGraph({ 
    rankdir: 'LR',
    ranksep: 150,
    nodesep: 100,
    edgesep: 50,
    marginx: 50,
    marginy: 50
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const ArchitectureGraph = ({ jsonData, onNodeClick }: ArchitectureGraphProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const parseCALMData = useCallback((data: any) => {
    if (!data) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    try {
      // Parse nodes from CALM structure - handle both array and object formats
      const nodesData = data.nodes || [];
      
      if (Array.isArray(nodesData)) {
        // Handle FINOS CALM array format
        nodesData.forEach((node: any) => {
          const id = node["unique-id"] || node.unique_id || node.id;
          if (id) {
            newNodes.push({
              id,
              type: "default",
              position: { x: 0, y: 0 }, // Will be set by layout algorithm
              data: { 
                label: node.name || id,
                ...node 
              },
              style: {
                background: "hsl(var(--card))",
                border: "2px solid hsl(var(--primary))",
                borderRadius: "12px",
                padding: "16px",
                width: 220,
                color: "hsl(var(--foreground))",
                fontSize: "14px",
                fontWeight: "500",
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });
          }
        });
      } else {
        // Handle object format
        Object.entries(nodesData).forEach(([id, node]: [string, any]) => {
          newNodes.push({
            id,
            type: "default",
            position: { x: 0, y: 0 },
            data: { 
              label: node.name || node.unique_id || id,
              ...node 
            },
            style: {
              background: "hsl(var(--card))",
              border: "2px solid hsl(var(--primary))",
              borderRadius: "12px",
              padding: "16px",
              width: 220,
              color: "hsl(var(--foreground))",
              fontSize: "14px",
              fontWeight: "500",
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
        });
      }

      // Parse relationships/edges - handle FINOS CALM nested format
      const relationships = data.relationships || [];
      relationships.forEach((rel: any, index: number) => {
        let sourceId = null;
        let targetId = null;
        let label = "";
        
        // Handle FINOS CALM nested structure
        if (rel["relationship-type"]?.connects) {
          const connects = rel["relationship-type"].connects;
          sourceId = connects.source?.node;
          targetId = connects.destination?.node;
          label = rel.description || rel.protocol || "";
        } 
        // Fallback to simple formats
        else {
          sourceId = rel.source || rel.from || rel.source_id;
          targetId = rel.target || rel.to || rel.target_id;
          label = rel.relationship_type || rel.type || rel.label || "";
        }
        
        if (sourceId && targetId) {
          newEdges.push({
            id: `edge-${index}`,
            source: sourceId,
            target: targetId,
            type: "custom",
            animated: true,
            style: { 
              stroke: "hsl(var(--accent))", 
              strokeWidth: 2.5 
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(var(--accent))",
              width: 25,
              height: 25,
            },
            data: {
              description: label,
              protocol: rel.protocol || ""
            }
          });
        }
      });

      // Apply intelligent layout
      return getLayoutedElements(newNodes, newEdges);
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
        <span className="text-xs text-muted-foreground ml-auto">
          {nodes.length} nodes, {edges.length} connections
        </span>
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
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
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
