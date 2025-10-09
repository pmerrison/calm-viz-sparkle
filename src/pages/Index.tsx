import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { NavigationBar } from "@/components/NavigationBar";
import { JsonEditor } from "@/components/JsonEditor";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { NodeDetails } from "@/components/NodeDetails";
import { FlowsPanel } from "@/components/FlowsPanel";
import { ControlsPanel } from "@/components/ControlsPanel";
import { GitHubConnectDialog } from "@/components/GitHubConnectDialog";
import { GitHubFileBrowser } from "@/components/GitHubFileBrowser";
import { GitHubService, GitHubTokenStorage, type GitHubFile } from "@/services/github";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useJsonPositionMap } from "@/hooks/useJsonPositionMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Build position map for jump-to-definition
  const positionMap = useJsonPositionMap(jsonContent);

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
  }, [positionMap]);

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
      const content = await toast.promise(
        githubService.getFileContent(githubRepo.owner, githubRepo.repo, file.path),
        {
          loading: `Loading ${file.path}...`,
          success: `Loaded ${file.path}`,
          error: (err) => `Failed to load file: ${err.message}`,
        }
      );

      console.log('Got content from GitHub, length:', content?.length);
      console.log('Content preview:', content?.substring(0, 200));

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

      console.log('Editor content should now be updated');
    } catch (error) {
      console.error('Error loading GitHub file:', error);
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
        <div className="flex-1 w-full p-6 overflow-hidden min-h-0">
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Top Row: GitHub Browser (if connected) + Editor + Graph/NodeDetails */}
            <ResizablePanel defaultSize={hasMetadata ? 60 : 100} minSize={30}>
              <ResizablePanelGroup direction="horizontal">
                {githubRepo && githubFiles.length > 0 && (
                  <>
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                      <div className="h-full pr-3 pb-3">
                        <GitHubFileBrowser
                          owner={githubRepo.owner}
                          repo={githubRepo.repo}
                          files={githubFiles}
                          selectedFile={selectedGithubFile}
                          onFileSelect={handleGitHubFileSelect}
                          onClose={handleCloseGitHub}
                        />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}
                <ResizablePanel defaultSize={githubRepo ? 40 : 50} minSize={30}>
                  <div className="h-full pr-3 pb-3">
                    <JsonEditor
                      value={jsonContent}
                      onChange={handleJsonChange}
                      onFileUpload={handleFileUpload}
                      onEditorReady={(editor) => (editorRef.current = editor)}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={githubRepo ? 40 : 50} minSize={30}>
                  <div className="h-full pl-3 pb-3">
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

            {/* Bottom Row: Flows + Controls (only if metadata exists) */}
            {hasMetadata && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={20}>
                  <ResizablePanelGroup direction="horizontal">
                    {hasFlows && (
                      <ResizablePanel defaultSize={hasControls ? 50 : 100} minSize={30}>
                        <div className="h-full pr-3 pt-3">
                          <FlowsPanel
                            flows={flows}
                            onTransitionClick={(relId) => jumpToDefinition(relId, 'relationship')}
                          />
                        </div>
                      </ResizablePanel>
                    )}

                    {hasFlows && hasControls && <ResizableHandle withHandle />}

                    {hasControls && (
                      <ResizablePanel defaultSize={hasFlows ? 50 : 100} minSize={30}>
                        <div className="h-full pl-3 pt-3">
                          <ControlsPanel
                            controls={controls}
                            onNodeClick={(nodeId) => {
                              const node = parsedData?.nodes?.find((n: any) => n['unique-id'] === nodeId);
                              if (node) handleNodeClick(node);
                            }}
                          />
                        </div>
                      </ResizablePanel>
                    )}
                  </ResizablePanelGroup>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  );
};

export default Index;
