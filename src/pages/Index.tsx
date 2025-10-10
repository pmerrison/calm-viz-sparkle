import { useState, useRef, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { NavigationBar } from "@/components/NavigationBar";
import { JsonEditor } from "@/components/JsonEditor";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { NodeDetails } from "@/components/NodeDetails";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { MetadataPanel } from "@/components/MetadataPanel";
import { GitHubConnectDialog } from "@/components/GitHubConnectDialog";
import { GitHubFileBrowser } from "@/components/GitHubFileBrowser";
import { GitHubService, GitHubTokenStorage, type GitHubFile } from "@/services/github";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useJsonPositionMap } from "@/hooks/useJsonPositionMap";

const SAMPLE_CALM = {
  "$schema": "https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-04/meta/core.json",
  "nodes": [
    {
      "unique-id": "client-app",
      "name": "Client Application",
      "description": "User-facing application that interacts with the AI agent",
      "node-type": "system",
      "interfaces": [
        {
          "unique-id": "client-api",
          "protocol": "HTTPS",
          "port": 443
        }
      ]
    },
    {
      "unique-id": "ai-agent",
      "name": "AI Agent",
      "description": "Core agentic AI system that orchestrates tasks and coordinates with MCP servers",
      "node-type": "service",
      "interfaces": [
        {
          "unique-id": "agent-api",
          "protocol": "HTTPS",
          "port": 8080
        },
        {
          "unique-id": "agent-mcp-client",
          "protocol": "MCP"
        }
      ]
    },
    {
      "unique-id": "mcp-filesystem",
      "name": "Filesystem MCP Server",
      "description": "MCP server providing file system access capabilities",
      "node-type": "service",
      "interfaces": [
        {
          "unique-id": "mcp-fs-interface",
          "protocol": "MCP",
          "port": 3000
        }
      ]
    },
    {
      "unique-id": "mcp-database",
      "name": "Database MCP Server",
      "description": "MCP server providing database query and manipulation capabilities",
      "node-type": "service",
      "interfaces": [
        {
          "unique-id": "mcp-db-interface",
          "protocol": "MCP",
          "port": 3001
        }
      ]
    },
    {
      "unique-id": "mcp-api-integration",
      "name": "API Integration MCP Server",
      "description": "MCP server providing external API integration capabilities",
      "node-type": "service",
      "interfaces": [
        {
          "unique-id": "mcp-api-interface",
          "protocol": "MCP",
          "port": 3002
        }
      ]
    },
    {
      "unique-id": "llm-service",
      "name": "LLM Service",
      "description": "Large language model service providing reasoning and generation capabilities",
      "node-type": "service",
      "interfaces": [
        {
          "unique-id": "llm-api",
          "protocol": "HTTPS",
          "port": 443
        }
      ]
    },
    {
      "unique-id": "vector-store",
      "name": "Vector Store",
      "description": "Vector database for storing embeddings and semantic search",
      "node-type": "data-store",
      "interfaces": [
        {
          "unique-id": "vector-api",
          "protocol": "HTTPS",
          "port": 6333
        }
      ]
    },
    {
      "unique-id": "application-db",
      "name": "Application Database",
      "description": "Primary database for application data and state persistence",
      "node-type": "data-store",
      "interfaces": [
        {
          "unique-id": "db-interface",
          "protocol": "PostgreSQL",
          "port": 5432
        }
      ]
    },
    {
      "unique-id": "session-store",
      "name": "Session Store",
      "description": "Redis cache for session management and temporary state",
      "node-type": "data-store",
      "interfaces": [
        {
          "unique-id": "redis-interface",
          "protocol": "Redis",
          "port": 6379
        }
      ]
    }
  ],
  "relationships": [
    {
      "unique-id": "rel-client-to-agent",
      "description": "Client sends requests to AI agent",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "client-app",
            "interface": "client-api"
          },
          "destination": {
            "node": "ai-agent",
            "interface": "agent-api"
          }
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "rel-agent-to-llm",
      "description": "Agent invokes LLM for reasoning and generation",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-mcp-client"
          },
          "destination": {
            "node": "llm-service",
            "interface": "llm-api"
          }
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "rel-agent-to-mcp-fs",
      "description": "Agent connects to filesystem MCP server for file operations",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-mcp-client"
          },
          "destination": {
            "node": "mcp-filesystem",
            "interface": "mcp-fs-interface"
          }
        }
      },
      "protocol": "MCP"
    },
    {
      "unique-id": "rel-agent-to-mcp-db",
      "description": "Agent connects to database MCP server for data access",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-mcp-client"
          },
          "destination": {
            "node": "mcp-database",
            "interface": "mcp-db-interface"
          }
        }
      },
      "protocol": "MCP"
    },
    {
      "unique-id": "rel-agent-to-mcp-api",
      "description": "Agent connects to API integration MCP server for external service access",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-mcp-client"
          },
          "destination": {
            "node": "mcp-api-integration",
            "interface": "mcp-api-interface"
          }
        }
      },
      "protocol": "MCP"
    },
    {
      "unique-id": "rel-agent-to-vector",
      "description": "Agent queries vector store for semantic search",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-api"
          },
          "destination": {
            "node": "vector-store",
            "interface": "vector-api"
          }
        }
      },
      "protocol": "HTTPS"
    },
    {
      "unique-id": "rel-agent-to-appdb",
      "description": "Agent persists state and data to application database",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-api"
          },
          "destination": {
            "node": "application-db",
            "interface": "db-interface"
          }
        }
      },
      "protocol": "PostgreSQL"
    },
    {
      "unique-id": "rel-agent-to-session",
      "description": "Agent manages session state in Redis",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "ai-agent",
            "interface": "agent-api"
          },
          "destination": {
            "node": "session-store",
            "interface": "redis-interface"
          }
        }
      },
      "protocol": "Redis"
    },
    {
      "unique-id": "rel-mcp-db-to-appdb",
      "description": "Database MCP server accesses application database",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "mcp-database",
            "interface": "mcp-db-interface"
          },
          "destination": {
            "node": "application-db",
            "interface": "db-interface"
          }
        }
      },
      "protocol": "PostgreSQL"
    }
  ]
};

interface ArchitectureLevel {
  name: string;
  jsonContent: string;
  parsedData: any;
}

const Index = () => {
  const [jsonContent, setJsonContent] = useState(JSON.stringify(SAMPLE_CALM, null, 2));
  const [parsedData, setParsedData] = useState<any>(SAMPLE_CALM);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [historyStack, setHistoryStack] = useState<ArchitectureLevel[]>([]);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // GitHub integration state
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [githubRepo, setGithubRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [githubFiles, setGithubFiles] = useState<GitHubFile[]>([]);
  const [selectedGithubFile, setSelectedGithubFile] = useState<string | undefined>();
  const [githubService, setGithubService] = useState<GitHubService | null>(null);

  // Collapsible panel state
  const [isGithubCollapsed, setIsGithubCollapsed] = useState(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false);
  const [editorSizeBeforeCollapse, setEditorSizeBeforeCollapse] = useState(40);

  // Build position map for jump-to-definition
  const positionMap = useJsonPositionMap(jsonContent);

  // Load collapsed states from localStorage on mount
  useEffect(() => {
    const savedGithubCollapsed = localStorage.getItem('panel-github-collapsed');
    const savedEditorCollapsed = localStorage.getItem('panel-editor-collapsed');
    const savedMetadataCollapsed = localStorage.getItem('panel-metadata-collapsed');
    const savedEditorSize = localStorage.getItem('panel-editor-size');

    if (savedGithubCollapsed !== null) setIsGithubCollapsed(savedGithubCollapsed === 'true');
    if (savedEditorCollapsed !== null) setIsEditorCollapsed(savedEditorCollapsed === 'true');
    if (savedMetadataCollapsed !== null) setIsMetadataCollapsed(savedMetadataCollapsed === 'true');
    if (savedEditorSize !== null) setEditorSizeBeforeCollapse(Number(savedEditorSize));
  }, []);

  // Save collapsed states to localStorage
  useEffect(() => {
    localStorage.setItem('panel-github-collapsed', String(isGithubCollapsed));
  }, [isGithubCollapsed]);

  useEffect(() => {
    localStorage.setItem('panel-editor-collapsed', String(isEditorCollapsed));
  }, [isEditorCollapsed]);

  useEffect(() => {
    localStorage.setItem('panel-metadata-collapsed', String(isMetadataCollapsed));
  }, [isMetadataCollapsed]);

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    try {
      const parsed = JSON.parse(value);
      setParsedData(parsed);
      toast.success("JSON parsed successfully");
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  const handleFileUpload = (content: string) => {
    setJsonContent(content);
    try {
      const parsed = JSON.parse(content);
      setParsedData(parsed);
      toast.success("File loaded successfully");
    } catch (error) {
      toast.error("Invalid JSON file");
    }
  };

  const jumpToDefinition = useCallback((id: string, type: 'node' | 'relationship') => {
    console.log('jumpToDefinition called:', { id, type, hasEditor: !!editorRef.current });

    // Auto-expand editor if collapsed
    if (isEditorCollapsed) {
      setIsEditorCollapsed(false);
    }

    if (!editorRef.current) {
      console.warn('Editor not ready');
      return;
    }

    const location = type === 'node'
      ? positionMap.nodes.get(id)
      : positionMap.relationships.get(id);

    if (!location) {
      console.warn(`No position found for ${type} with id: ${id}`);
      return;
    }

    const editor = editorRef.current;

    // json-source-map returns { value, valueEnd } or just { line, column, pos }
    const start = location.value || location.start || location;
    const end = location.valueEnd || location.end || location;

    if (!start || typeof start.line !== 'number') {
      console.warn(`Invalid location structure for ${type} with id: ${id}`, location);
      return;
    }

    // Convert 0-based positions to 1-based Monaco positions
    const startLine = start.line + 1;
    const startColumn = start.column + 1;
    const endLine = end.line + 1;
    const endColumn = end.column + 1;

    // Scroll to and reveal the line
    editor.revealLineInCenter(startLine);

    // Set selection to highlight the entire object
    editor.setSelection({
      startLineNumber: startLine,
      startColumn: startColumn,
      endLineNumber: endLine,
      endColumn: endColumn,
    });

    // Add decoration for visual highlighting
    const newDecorations = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: endColumn,
        },
        options: {
          isWholeLine: false,
          className: 'highlighted-definition',
          glyphMarginClassName: 'highlighted-glyph',
          inlineClassName: 'highlighted-inline',
        },
      },
    ]);

    decorationsRef.current = newDecorations;

    // Focus the editor
    editor.focus();

    // Clear decorations after 3 seconds
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    }, 3000);
  }, [positionMap, isEditorCollapsed]);

  const handleNodeClick = useCallback((node: any) => {
    console.log('handleNodeClick called:', node);
    const nodeId = node['unique-id'] || node.unique_id || node.id;
    console.log('Extracted node ID:', nodeId);
    if (nodeId) {
      jumpToDefinition(nodeId, 'node');
    }
    setSelectedNode(node);
  }, [jumpToDefinition]);

  const handleEdgeClick = useCallback((edge: any) => {
    const edgeId = edge['unique-id'] || edge.unique_id || edge.id;
    if (edgeId) {
      jumpToDefinition(edgeId, 'relationship');
    }
  }, [jumpToDefinition]);

  const handleLoadDetailedArchitecture = useCallback(async (url: string, parentNodeName?: string) => {
    try {
      // Save current state to history before navigating
      const currentLevel: ArchitectureLevel = {
        name: parsedData?.metadata?.name || 'Root Architecture',
        jsonContent,
        parsedData,
      };

      // Fetch the CALM file from the URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const content = await response.text();
      const parsed = JSON.parse(content);

      // Update the editor and parsed data
      setJsonContent(JSON.stringify(parsed, null, 2));
      setParsedData(parsed);
      setSelectedNode(null); // Close node details

      // Push current state to history
      setHistoryStack(prev => [...prev, currentLevel]);

      toast.success(`Loaded detailed architecture${parentNodeName ? ` for ${parentNodeName}` : ''}`);
    } catch (error) {
      console.error('Error loading detailed architecture:', error);
      toast.error(`Failed to load architecture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [jsonContent, parsedData]);

  const handleNavigateBack = useCallback(() => {
    if (historyStack.length === 0) return;

    // Pop the last level from history
    const previousLevel = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, -1);

    // Restore previous state
    setJsonContent(previousLevel.jsonContent);
    setParsedData(previousLevel.parsedData);
    setSelectedNode(null);
    setHistoryStack(newHistory);

    toast.success(`Returned to ${previousLevel.name}`);
  }, [historyStack]);

  const handleConnectGitHub = useCallback(async (owner: string, repo: string, token?: string) => {
    try {
      // Save token if provided
      if (token) {
        GitHubTokenStorage.save(token);
      } else {
        // Try to load saved token
        const savedToken = GitHubTokenStorage.load();
        token = savedToken || undefined;
      }

      const service = new GitHubService(token);
      setGithubService(service);

      toast.promise(
        service.getRepoTree(owner, repo),
        {
          loading: `Connecting to ${owner}/${repo}...`,
          success: (files) => {
            setGithubRepo({ owner, repo });
            setGithubFiles(files);
            setSelectedGithubFile(undefined);
            return `Connected! Found ${files.length} JSON files`;
          },
          error: (err) => `Failed to connect: ${err.message}`,
        }
      );
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
    }
  }, []);

  const handleGitHubFileSelect = useCallback(async (file: GitHubFile) => {
    if (!githubRepo || !githubService) {
      console.error('Missing GitHub repo or service:', { githubRepo, githubService });
      return;
    }

    try {
      console.log('handleGitHubFileSelect called with file:', file);
      setSelectedGithubFile(file.path);

      console.log('Calling githubService.getFileContent...');

      // Fetch content with loading toast
      toast.loading(`Loading ${file.path}...`);
      const content = await githubService.getFileContent(githubRepo.owner, githubRepo.repo, file.path);

      console.log('Got content from GitHub, type:', typeof content, 'length:', content?.length);
      console.log('Content preview:', typeof content === 'string' ? content.substring(0, 200) : content);

      if (typeof content !== 'string') {
        throw new Error(`Expected string content, got ${typeof content}`);
      }

      // Clear history when loading from GitHub
      setHistoryStack([]);

      console.log('Parsing JSON...');
      const parsed = JSON.parse(content);
      console.log('Parsed successfully, setting editor content...');

      const formattedContent = JSON.stringify(parsed, null, 2);
      console.log('Formatted content length:', formattedContent.length);

      setJsonContent(formattedContent);
      setParsedData(parsed);
      setSelectedNode(null);

      toast.dismiss();
      toast.success(`Loaded ${file.path}`);

      console.log('Editor content should now be updated');
    } catch (error) {
      console.error('Error loading GitHub file:', error);
      toast.dismiss();
      toast.error(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [githubRepo, githubService]);

  const handleCloseGitHub = useCallback(() => {
    setGithubRepo(null);
    setGithubFiles([]);
    setSelectedGithubFile(undefined);
    setGithubService(null);
  }, []);

  const flows = parsedData?.flows || [];
  const controls = parsedData?.controls || {};
  const hasFlows = flows.length > 0;
  const hasControls = Object.keys(controls).length > 0;
  const hasMetadata = hasFlows || hasControls;

  // Build breadcrumbs from history
  const breadcrumbs = historyStack.map(level => level.name);
  const currentArchitectureName = parsedData?.metadata?.name;

  const hasGithub = githubRepo && githubFiles.length > 0;

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header onConnectGitHub={() => setShowGitHubDialog(true)} />
      <NavigationBar
        currentArchitectureName={currentArchitectureName}
        breadcrumbs={breadcrumbs}
        canNavigateBack={historyStack.length > 0}
        onNavigateBack={handleNavigateBack}
      />

      <GitHubConnectDialog
        open={showGitHubDialog}
        onOpenChange={setShowGitHubDialog}
        onConnect={handleConnectGitHub}
      />

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 w-full overflow-hidden min-h-0">
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Main content area */}
            <ResizablePanel defaultSize={hasMetadata && !isMetadataCollapsed ? 70 : 100} minSize={30}>
              <ResizablePanelGroup direction="horizontal">
                {/* GitHub File Browser - Collapsible Left Panel */}
                {hasGithub && !isGithubCollapsed && (
                  <>
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                      <CollapsiblePanel
                        isCollapsed={false}
                        onToggle={() => setIsGithubCollapsed(true)}
                        position="left"
                        title="GitHub Files"
                      >
                        <GitHubFileBrowser
                          owner={githubRepo.owner}
                          repo={githubRepo.repo}
                          files={githubFiles}
                          selectedFile={selectedGithubFile}
                          onFileSelect={handleGitHubFileSelect}
                          onClose={handleCloseGitHub}
                        />
                      </CollapsiblePanel>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}

                {hasGithub && isGithubCollapsed && (
                  <>
                    <div style={{ width: '48px' }}>
                      <CollapsiblePanel
                        isCollapsed={true}
                        onToggle={() => setIsGithubCollapsed(false)}
                        position="left"
                        title="GitHub"
                      >
                        <div />
                      </CollapsiblePanel>
                    </div>
                  </>
                )}

                {/* JSON Editor - Collapsible Center-Left Panel */}
                {!isEditorCollapsed && (
                  <>
                    <ResizablePanel
                      defaultSize={editorSizeBeforeCollapse}
                      minSize={25}
                      maxSize={60}
                      onResize={(size) => {
                        setEditorSizeBeforeCollapse(size);
                        localStorage.setItem('panel-editor-size', String(size));
                      }}
                    >
                      <CollapsiblePanel
                        isCollapsed={false}
                        onToggle={() => setIsEditorCollapsed(true)}
                        position="left"
                        title="JSON Editor"
                      >
                        <JsonEditor
                          value={jsonContent}
                          onChange={handleJsonChange}
                          onFileUpload={handleFileUpload}
                          onEditorReady={(editor) => (editorRef.current = editor)}
                        />
                      </CollapsiblePanel>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}

                {isEditorCollapsed && (
                  <>
                    <div style={{ width: '48px' }}>
                      <CollapsiblePanel
                        isCollapsed={true}
                        onToggle={() => setIsEditorCollapsed(false)}
                        position="left"
                        title="JSON"
                      >
                        <div />
                      </CollapsiblePanel>
                    </div>
                  </>
                )}

                {/* Graph Visualization - Always visible, takes remaining space */}
                <ResizablePanel defaultSize={100} minSize={30}>
                  <div className="h-full p-6">
                    {selectedNode ? (
                      <NodeDetails
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                        onLoadDetailedArchitecture={handleLoadDetailedArchitecture}
                      />
                    ) : (
                      <ArchitectureGraph
                        jsonData={parsedData}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                      />
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            {/* Bottom Panel: Flows + Controls - Collapsible */}
            {hasMetadata && !isMetadataCollapsed && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                  <MetadataPanel
                    flows={flows}
                    controls={controls}
                    onTransitionClick={(relId) => jumpToDefinition(relId, 'relationship')}
                    onNodeClick={(nodeId) => {
                      const node = parsedData?.nodes?.find((n: any) => n['unique-id'] === nodeId);
                      if (node) handleNodeClick(node);
                    }}
                    isCollapsed={false}
                    onToggleCollapse={() => setIsMetadataCollapsed(true)}
                  />
                </ResizablePanel>
              </>
            )}

            {hasMetadata && isMetadataCollapsed && (
              <div style={{ height: '48px' }}>
                <MetadataPanel
                  flows={flows}
                  controls={controls}
                  onTransitionClick={(relId) => jumpToDefinition(relId, 'relationship')}
                  onNodeClick={(nodeId) => {
                    const node = parsedData?.nodes?.find((n: any) => n['unique-id'] === nodeId);
                    if (node) handleNodeClick(node);
                  }}
                  isCollapsed={true}
                  onToggleCollapse={() => setIsMetadataCollapsed(false)}
                />
              </div>
            )}
          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  );
};

export default Index;
