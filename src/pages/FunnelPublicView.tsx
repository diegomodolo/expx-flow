import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode, CustomNodeData } from "@/components/funnel-editor/CustomNode";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function FunnelPublicViewContent() {
  const { token } = useParams();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [funnelName, setFunnelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicFunnel = async () => {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("acquisition_funnels")
          .select("*")
          .eq("public_token", token)
          .eq("is_public", true)
          .single();

        if (fetchError || !data) {
          setError("Funil não encontrado ou não está público");
          setLoading(false);
          return;
        }

        setFunnelName(data.name);
        const flowData = data.flow_data as any;
        
        // Remove onEdit callback from nodes for public view
        const publicNodes = (flowData.nodes || []).map((node: Node) => ({
          ...node,
          data: {
            ...node.data,
            onEdit: undefined,
          } as CustomNodeData,
        }));
        
        setNodes(publicNodes);
        setEdges(flowData.edges || []);
      } catch (err) {
        setError("Erro ao carregar funil");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicFunnel();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Funil não disponível</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">{funnelName}</h1>
        <p className="text-sm text-muted-foreground">Visualização pública do funil</p>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => (node.data as any).color || "#3B82F6"}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function FunnelPublicView() {
  return (
    <ReactFlowProvider>
      <FunnelPublicViewContent />
    </ReactFlowProvider>
  );
}