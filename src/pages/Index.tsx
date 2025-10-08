import { useState } from "react";
import { Header } from "@/components/Header";
import { JsonEditor } from "@/components/JsonEditor";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { NodeDetails } from "@/components/NodeDetails";
import { toast } from "sonner";

const SAMPLE_CALM = {
  nodes: {
    "web-app": {
      unique_id: "web-app",
      name: "Web Application",
      type: "system",
      description: "Frontend web application"
    },
    "api-gateway": {
      unique_id: "api-gateway",
      name: "API Gateway",
      type: "system",
      description: "API gateway service"
    },
    "database": {
      unique_id: "database",
      name: "Database",
      type: "datastore",
      description: "PostgreSQL database"
    }
  },
  relationships: [
    {
      source: "web-app",
      target: "api-gateway",
      relationship_type: "connects to"
    },
    {
      source: "api-gateway",
      target: "database",
      relationship_type: "reads from"
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
