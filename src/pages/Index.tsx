import { useState } from "react";
import { Header } from "@/components/Header";
import { JsonEditor } from "@/components/JsonEditor";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { NodeDetails } from "@/components/NodeDetails";
import { toast } from "sonner";

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

const Index = () => {
  const [jsonContent, setJsonContent] = useState(JSON.stringify(SAMPLE_CALM, null, 2));
  const [parsedData, setParsedData] = useState<any>(SAMPLE_CALM);
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
          <JsonEditor 
            value={jsonContent}
            onChange={handleJsonChange}
            onFileUpload={handleFileUpload}
          />
          
          {selectedNode ? (
            <NodeDetails 
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <ArchitectureGraph 
              jsonData={parsedData}
              onNodeClick={setSelectedNode}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
