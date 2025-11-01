import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode, CustomNodeData } from "./CustomNode";
import { BlockLibrary } from "./BlockLibrary";
import { NodeEditModal } from "./NodeEditModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Maximize2, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useFunnels } from "@/hooks/useFunnels";
import { useToast } from "@/hooks/use-toast";
import type { BlockType } from "@/hooks/useFunnels";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export function FunnelEditor() {
  const navigate = useNavigate();
  const { clientId, funnelId } = useParams();
  const { toast } = useToast();
  const { blockTypes = [], loadingBlockTypes, updateFunnel, fetchFunnelById } = useFunnels(clientId);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [funnelName, setFunnelName] = useState("Funil sem título");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const nodesRef = useRef<Node[]>([]);

  // Update ref whenever nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Handle opening edit modal
  const handleOpenEditModal = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) setEditingNode(node);
  }, []);

  // Load funnel data
  useEffect(() => {
    if (funnelId) {
      fetchFunnelById(funnelId).then((funnel) => {
        setFunnelName(funnel.name);
        // Add onEdit function to all loaded nodes
        const nodesWithEdit = (funnel.flow_data.nodes || []).map((node: Node) => ({
          ...node,
          data: {
            ...node.data,
            onEdit: handleOpenEditModal,
          } as CustomNodeData,
        }));
        setNodes(nodesWithEdit);
        setEdges(funnel.flow_data.edges || []);
      });
    }
  }, [funnelId, handleOpenEditModal]);

  // Auto-save with debounce
  useEffect(() => {
    if (funnelId && nodes.length > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockData = event.dataTransfer.getData("application/reactflow");
      if (!blockData) return;

      const block: BlockType = JSON.parse(blockData);
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const newNode: Node = {
        id: `${block.name}-${Date.now()}`,
        type: "custom",
        position,
        data: {
          label: block.display_name,
          description: block.default_description || undefined,
          color: block.color,
          category: block.category,
          icon: block.icon || undefined,
          onEdit: handleOpenEditModal,
        } as CustomNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [handleOpenEditModal, setNodes]
  );

  const onDragStart = (event: React.DragEvent, blockType: BlockType) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(blockType));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleEditNode = (id: string, label: string, description: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...(node.data as CustomNodeData), label, description } as CustomNodeData }
          : node
      )
    );
  };

  const handleSave = async () => {
    if (!funnelId) return;
    
    setIsSaving(true);
    try {
      updateFunnel({
        id: funnelId,
        flow_data: {
          nodes,
          edges,
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      reactFlowWrapper.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loadingBlockTypes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/editor-funil")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{funnelName}</h1>
            <p className="text-sm text-muted-foreground">
              {isSaving ? "Salvando..." : "Salvo automaticamente"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <BlockLibrary blockTypes={blockTypes} onDragStart={onDragStart} />
        
        <div ref={reactFlowWrapper} className="flex-1 bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => (node.data as any).color || "#3B82F6"}
              pannable
              zoomable
            />
            <Panel position="top-center" className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm text-muted-foreground">
              Arraste blocos da biblioteca para começar
            </Panel>
          </ReactFlow>
        </div>
      </div>

      <NodeEditModal
        isOpen={!!editingNode}
        onClose={() => setEditingNode(null)}
        node={editingNode}
        onSave={handleEditNode}
      />
    </div>
  );
}
