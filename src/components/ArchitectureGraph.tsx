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
import { Network, AlertCircle, ExternalLink, FileText } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { CustomEdge } from "./CustomEdge";
import { CustomNode } from "./CustomNode";
import { SystemGroupNode } from "./SystemGroupNode";

interface ArchitectureGraphProps {
  jsonData: any;
  onNodeClick: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  onJumpToControl?: (controlId: string) => void;
  onJumpToNode?: (nodeId: string) => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 100;

  dagreGraph.setGraph({
    rankdir: 'LR',
    ranksep: 150,
    nodesep: 180, // Increased from 100 to accommodate node expansion on hover
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

export const ArchitectureGraph = ({ jsonData, onNodeClick, onEdgeClick, onJumpToControl, onJumpToNode }: ArchitectureGraphProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const nodeTypes = useMemo(() => ({ custom: CustomNode, group: SystemGroupNode }), []);

  const parseCALMData = useCallback((data: any, onShowDetailsCallback?: (nodeData: any) => void, onJumpToControlCallback?: (controlId: string) => void) => {
    if (!data) return { nodes: [], edges: [] };

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const systemNodes: Node[] = [];
    const deploymentMap: Record<string, string[]> = {}; // systemId -> [childNodeIds]

    // Extract top-level AIGF metadata for lookups
    const aigfMetadata = data.metadata?.['aigf-governance'] || {};
    const allRisks = aigfMetadata.risks || [];
    const allMitigations = aigfMetadata.mitigations || [];

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
                  ...node,
                  _aigfLookup: { risks: allRisks, mitigations: allMitigations },
                  onShowDetails: onShowDetailsCallback,
                  onJumpToControl: onJumpToControlCallback
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
                ...node,
                _aigfLookup: { risks: allRisks, mitigations: allMitigations },
                onShowDetails: onShowDetailsCallback,
                onJumpToControl: onJumpToControlCallback
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
        // Check for deployed-in or composed-of relationships (both handle container-nodes)
        if (rel["relationship-type"]?.["deployed-in"] || rel["relationship-type"]?.["composed-of"]) {
          const containerRel = rel["relationship-type"]["deployed-in"] || rel["relationship-type"]["composed-of"];
          const containerId = containerRel.container;
          const childNodeIds = containerRel.nodes || [];

          if (containerId && childNodeIds.length > 0) {
            deploymentMap[containerId] = childNodeIds;
          }
        }
        // Handle interacts relationships (actor to multiple nodes)
        else if (rel["relationship-type"]?.interacts) {
          const interacts = rel["relationship-type"].interacts;
          const actorId = interacts.actor;
          const targetNodeIds = interacts.nodes || [];
          const label = rel.description || "interacts";

          // Create edges from actor to each target node
          targetNodeIds.forEach((targetId: string, targetIndex: number) => {
            newEdges.push({
              id: `edge-${index}-${targetIndex}`,
              source: actorId,
              target: targetId,
              type: "custom",
              animated: false, // Non-animated to distinguish from connects
              style: {
                stroke: "hsl(280 75% 60%)", // Purple for actor interactions
                strokeWidth: 2,
                strokeDasharray: "5,5", // Dashed line
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "hsl(280 75% 60%)",
                width: 25,
                height: 25,
              },
              data: {
                description: label,
                protocol: rel.protocol || "",
                metadata: rel.metadata || {},
                'unique-id': rel['unique-id'] || rel.unique_id || rel.id,
                relationshipType: 'interacts'
              }
            });
          });
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
                protocol: rel.protocol || "",
                metadata: rel.metadata || {},
                'unique-id': rel['unique-id'] || rel.unique_id || rel.id
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
                protocol: rel.protocol || "",
                metadata: rel.metadata || {},
                'unique-id': rel['unique-id'] || rel.unique_id || rel.id
              }
            });
          }
        }
      });

      // Separate nodes into groups
      const nodesInSystems: Node[] = [];
      const independentNodes: Node[] = [];
      
      newNodes.forEach((node) => {
        let isInSystem = false;
        for (const [systemId, childIds] of Object.entries(deploymentMap)) {
          if (childIds.includes(node.id)) {
            isInSystem = true;
            nodesInSystems.push({
              ...node,
              parentId: systemId,
              expandParent: true,
              position: { x: 0, y: 0 }, // Will be set after layout
            });
            break;
          }
        }
        if (!isInSystem) {
          independentNodes.push(node);
        }
      });

      // Step 1: Layout children within each system
      systemNodes.forEach((systemNode) => {
        const childNodes = nodesInSystems.filter(n => n.parentId === systemNode.id);
        
        if (childNodes.length > 0) {
          // Get edges within this system
          const systemEdges = newEdges.filter(e => 
            childNodes.some(n => n.id === e.source) && 
            childNodes.some(n => n.id === e.target)
          );
          
          // Layout children with compact settings
          const { nodes: layoutedChildren } = getLayoutedElements(childNodes, systemEdges);
          
          // Calculate bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          const nodeWidth = 250;
          const nodeHeight = 100;
          
          layoutedChildren.forEach(child => {
            minX = Math.min(minX, child.position.x);
            minY = Math.min(minY, child.position.y);
            maxX = Math.max(maxX, child.position.x + nodeWidth);
            maxY = Math.max(maxY, child.position.y + nodeHeight);
          });
          
          // Set system dimensions with padding
          const padding = 80;
          systemNode.style = {
            ...systemNode.style,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
          };
          
          // Update child positions to be relative to system origin with padding
          layoutedChildren.forEach((child, idx) => {
            const originalChild = nodesInSystems.find(n => n.id === child.id);
            if (originalChild) {
              originalChild.position = {
                x: child.position.x - minX + padding,
                y: child.position.y - minY + padding
              };
            }
          });
        } else {
          // Empty system
          systemNode.style = {
            ...systemNode.style,
            width: 300,
            height: 200,
          };
        }
      });

      // Step 2: Create top-level layout
      // For top-level layout, we need to treat systems as single nodes with their calculated dimensions
      const systemNodesForLayout = systemNodes.map(s => ({
        ...s,
        // Don't include children in top-level layout
        parentId: undefined,
      }));
      
      // Get edges that connect independent nodes or cross system boundaries
      const topLevelEdges = newEdges.filter(e => {
        const sourceInSystem = nodesInSystems.some(n => n.id === e.source);
        const targetInSystem = nodesInSystems.some(n => n.id === e.target);
        // Include edge if at least one end is independent or they're in different systems
        return !sourceInSystem || !targetInSystem;
      });
      
      // Combine independent nodes and system nodes for top-level layout
      const topLevelNodes = [...independentNodes, ...systemNodesForLayout];
      
      // Layout with increased spacing to prevent overlap
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ 
        rankdir: 'LR',
        ranksep: 250,
        nodesep: 150,
        edgesep: 50,
        marginx: 100,
        marginy: 100
      });
      
      topLevelNodes.forEach((node) => {
        const width = node.style?.width || 250;
        const height = node.style?.height || 100;
        dagreGraph.setNode(node.id, { width, height });
      });
      
      topLevelEdges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });
      
      dagre.layout(dagreGraph);
      
      // Apply top-level positions
      independentNodes.forEach(node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = 250;
        const height = 100;
        node.position = {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        };
      });
      
      systemNodes.forEach(systemNode => {
        const nodeWithPosition = dagreGraph.node(systemNode.id);
        const width = (systemNode.style?.width as number) || 300;
        const height = (systemNode.style?.height as number) || 200;
        systemNode.position = {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        };
      });

      // Combine all nodes
      const allNodes = [...systemNodes, ...independentNodes, ...nodesInSystems];

      return { nodes: allNodes, edges: newEdges };
    } catch (error) {
      console.error("Error parsing CALM data:", error);
      return { nodes: [], edges: [] };
    }
  }, []);

  useEffect(() => {
    const { nodes: parsedNodes, edges: parsedEdges } = parseCALMData(jsonData, onNodeClick, onJumpToControl);
    setNodes(parsedNodes);
    setEdges(parsedEdges);
  }, [jsonData, parseCALMData, setNodes, setEdges, onNodeClick, onJumpToControl]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Jump to node definition in JSON editor
      if (onJumpToNode) {
        const nodeId = node.data['unique-id'] || node.data.unique_id || node.data.id || node.id;
        onJumpToNode(nodeId);
      }
    },
    [onJumpToNode]
  );

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: {
            ...n.style,
            zIndex: n.id === node.id && n.type !== 'group' ? 1000 : (n.type === 'group' ? -1 : 1),
          },
        }))
      );
    },
    [setNodes]
  );

  const handleNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: {
            ...n.style,
            zIndex: n.type === 'group' ? -1 : 1,
          },
        }))
      );
    },
    [setNodes]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge.data);
      }
    },
    [onEdgeClick]
  );

  const isEmpty = nodes.length === 0;
  const adrs = jsonData?.adrs || [];

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border bg-card">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Network className="w-4 h-4 text-accent" />
        <h2 className="font-semibold">Architecture Visualization</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {nodes.length} nodes, {edges.length} connections
        </span>
      </div>

      {adrs.length > 0 && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Architecture Decision Records</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {adrs.map((adr: string, index: number) => (
              <a
                key={index}
                href={adr}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-background/60 hover:bg-accent/20 border border-border transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[300px]">{adr}</span>
              </a>
            ))}
          </div>
        </div>
      )}

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
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onEdgeClick={handleEdgeClick}
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
