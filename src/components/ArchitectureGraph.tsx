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
import { CustomNode } from "./CustomNode";
import { SystemGroupNode } from "./SystemGroupNode";

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
  const nodeTypes = useMemo(() => ({ custom: CustomNode, group: SystemGroupNode }), []);

  const parseCALMData = useCallback((data: any) => {
    if (!data) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const systemNodes: Node[] = [];
    const deploymentMap: Record<string, string[]> = {}; // systemId -> [childNodeIds]
    
    try {
      // Parse nodes from CALM structure - handle both array and object formats
      const nodesData = data.nodes || [];
      
      if (Array.isArray(nodesData)) {
        // Handle FINOS CALM array format
        nodesData.forEach((node: any) => {
          const id = node["unique-id"] || node.unique_id || node.id;
          const nodeType = node["node-type"] || node.node_type || node.type;
          
          if (id) {
            // Separate system nodes from regular nodes
            if (nodeType === "system") {
              systemNodes.push({
                id,
                type: "group",
                position: { x: 0, y: 0 },
                style: {
                  zIndex: -1,
                },
                data: { 
                  label: node.name || id,
                  nodeType: "system",
                  ...node 
                },
              });
            } else {
              newNodes.push({
                id,
                type: "custom",
                position: { x: 0, y: 0 },
                data: { 
                  label: node.name || id,
                  ...node 
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
              });
            }
          }
        });
      } else {
        // Handle object format
        Object.entries(nodesData).forEach(([id, node]: [string, any]) => {
          const nodeType = (node as any)["node-type"] || (node as any).node_type || (node as any).type;
          
          if (nodeType === "system") {
            systemNodes.push({
              id,
              type: "group",
              position: { x: 0, y: 0 },
              style: {
                zIndex: -1,
              },
              data: { 
                label: (node as any).name || (node as any).unique_id || id,
                nodeType: "system",
                ...node 
              },
            });
          } else {
            newNodes.push({
              id,
              type: "custom",
              position: { x: 0, y: 0 },
              data: { 
                label: (node as any).name || (node as any).unique_id || id,
                ...node 
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });
          }
        });
      }

      // Parse relationships/edges - handle FINOS CALM nested format
      const relationships = data.relationships || [];
      relationships.forEach((rel: any, index: number) => {
        // Check for deployed-in relationship
        if (rel["relationship-type"]?.["deployed-in"]) {
          const deployedIn = rel["relationship-type"]["deployed-in"];
          const containerId = deployedIn.container;
          const childNodeIds = deployedIn.nodes || [];
          
          if (containerId && childNodeIds.length > 0) {
            deploymentMap[containerId] = childNodeIds;
          }
        }
        // Handle regular connections
        else if (rel["relationship-type"]?.connects) {
          const connects = rel["relationship-type"].connects;
          const sourceId = connects.source?.node;
          const targetId = connects.destination?.node;
          const label = rel.description || rel.protocol || "";
          
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
        }
        // Fallback to simple formats
        else {
          const sourceId = rel.source || rel.from || rel.source_id;
          const targetId = rel.target || rel.to || rel.target_id;
          const label = rel.relationship_type || rel.type || rel.label || "";
          
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
        }
      });

      // Update nodes with parent relationships
      newNodes.forEach((node) => {
        for (const [systemId, childIds] of Object.entries(deploymentMap)) {
          if (childIds.includes(node.id)) {
            node.parentId = systemId;
            node.expandParent = true;
            // Set relative position within parent
            node.position = { x: 50, y: 50 };
            break;
          }
        }
      });

      // Apply layout only to non-system nodes first
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);

      // Calculate bounds for system nodes based on their children
      systemNodes.forEach((systemNode) => {
        const childNodes = layoutedNodes.filter(n => n.parentId === systemNode.id);
        
        if (childNodes.length > 0) {
          // Find bounding box of children
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          childNodes.forEach(child => {
            const nodeWidth = 250;
            const nodeHeight = 100;
            minX = Math.min(minX, child.position.x);
            minY = Math.min(minY, child.position.y);
            maxX = Math.max(maxX, child.position.x + nodeWidth);
            maxY = Math.max(maxY, child.position.y + nodeHeight);
          });
          
          // Add padding around children
          const padding = 80;
          systemNode.position = {
            x: minX - padding,
            y: minY - padding
          };
          systemNode.style = {
            ...systemNode.style,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
          };
          
          // Adjust child positions to be relative to parent
          childNodes.forEach(child => {
            child.position = {
              x: child.position.x - systemNode.position.x,
              y: child.position.y - systemNode.position.y
            };
          });
        } else {
          // Empty system, give it minimum dimensions
          systemNode.position = { x: 0, y: 0 };
          systemNode.style = {
            ...systemNode.style,
            width: 300,
            height: 200,
          };
        }
      });

      // Combine all nodes
      const allNodes = [...systemNodes, ...layoutedNodes];

      return { nodes: allNodes, edges: layoutedEdges };
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
            nodeTypes={nodeTypes}
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
