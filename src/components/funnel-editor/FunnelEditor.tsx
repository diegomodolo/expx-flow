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
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode, CustomNodeData } from "./CustomNode";
import { GroupNode } from "./GroupNode";
import { BlockLibrary } from "./BlockLibrary";
import { NodeEditModal } from "./NodeEditModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Maximize2, Loader2, Check, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useFunnels } from "@/hooks/useFunnels";
import { useToast } from "@/hooks/use-toast";
import type { BlockType } from "@/hooks/useFunnels";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  group: GroupNode,
};

function FunnelEditorContent() {
  const navigate = useNavigate();
  const { clientId, funnelId } = useParams();
  const { toast } = useToast();
  const { 
    blockTypes = [], 
    loadingBlockTypes, 
    updateFunnel, 
    fetchFunnelById,
  } = useFunnels(clientId);
  const { screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [funnelName, setFunnelName] = useState("Funil sem título");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const nodesRef = useRef<Node[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Update ref whenever nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Handle opening edit modal
  const handleOpenEditModal = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) setEditingNode(node);
  }, []);

  // Focus input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Load funnel data
  useEffect(() => {
    if (funnelId) {
      fetchFunnelById(funnelId).then((funnel) => {
        setFunnelName(funnel.name);
        
        // Add onEdit function to all loaded nodes
        const nodesWithEdit = (funnel.flow_data.nodes || []).map((node) => ({
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

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Ignorar se for o próprio grupo sendo arrastado
      if (node.type === "group") return;

      // Procurar por grupos no canvas
      const groupNodes = nodes.filter((n) => n.type === "group");
      
      groupNodes.forEach((groupNode) => {
        if (!groupNode.width || !groupNode.height) return;

        const groupRect = {
          x: groupNode.position.x,
          y: groupNode.position.y,
          width: groupNode.width,
          height: groupNode.height,
        };

        // Verificar se o nó está dentro do grupo
        // Calcular posição absoluta considerando parent
        let absoluteX = node.position.x;
        let absoluteY = node.position.y;
        
        // Se o node já tem um parent, precisamos calcular a posição absoluta
        if (node.parentId) {
          const parentNode = nodes.find(n => n.id === node.parentId);
          if (parentNode) {
            absoluteX += parentNode.position.x;
            absoluteY += parentNode.position.y;
          }
        }
        
        const nodeRect = {
          x: absoluteX,
          y: absoluteY,
          width: node.width || 200,
          height: node.height || 100,
        };

        const isInside =
          nodeRect.x >= groupRect.x &&
          nodeRect.y >= groupRect.y &&
          nodeRect.x + nodeRect.width <= groupRect.x + groupRect.width &&
          nodeRect.y + nodeRect.height <= groupRect.y + groupRect.height;

        if (isInside && !node.parentId) {
          // Vincular o nó ao grupo
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === node.id) {
                return {
                  ...n,
                  parentId: groupNode.id,
                  extent: "parent" as const,
                  position: {
                    x: nodeRect.x - groupRect.x,
                    y: nodeRect.y - groupRect.y,
                  },
                };
              }
              return n;
            })
          );
        }
      });
    },
    [nodes, setNodes]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const blockData = event.dataTransfer.getData("application/reactflow");
      if (!blockData) return;

      const block: BlockType = JSON.parse(blockData);

      // Usar screenToFlowPosition para obter a posição exata considerando zoom e pan
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Verificar se é um bloco de container
      const isContainer = block.category === "containers";

      const newNode: Node = {
        id: `${block.name}-${Date.now()}`,
        type: isContainer ? "group" : "custom",
        position,
        data: {
          label: block.display_name,
          description: block.default_description || undefined,
          color: block.color,
          category: block.category,
          icon: block.icon || undefined,
          onEdit: handleOpenEditModal,
        } as CustomNodeData,
        // Propriedades específicas para grupos
        ...(isContainer && {
          style: { 
            width: 400, 
            height: 300,
          },
        }),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [handleOpenEditModal, setNodes, screenToFlowPosition]
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

  const handleStartEditingName = () => {
    setTempName(funnelName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!funnelId || !tempName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      updateFunnel({
        id: funnelId,
        name: tempName.trim(),
      });
      setFunnelName(tempName.trim());
      setIsEditingName(false);
      toast({
        title: "Nome atualizado!",
        description: "O nome do funil foi alterado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar nome",
        description: "Não foi possível atualizar o nome do funil.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEditingName = () => {
    setIsEditingName(false);
    setTempName("");
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
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={nameInputRef}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEditingName();
                  }}
                  className="h-8 text-lg font-semibold"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEditingName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1 
                className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                onClick={handleStartEditingName}
                title="Clique para editar o nome"
              >
                {funnelName}
              </h1>
            )}
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
          onNodeDragStop={onNodeDragStop}
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

export function FunnelEditor() {
  return (
    <ReactFlowProvider>
      <FunnelEditorContent />
    </ReactFlowProvider>
  );
}
