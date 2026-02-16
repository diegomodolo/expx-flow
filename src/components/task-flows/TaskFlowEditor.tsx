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
  EdgeTypes,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowColumnNode, FlowColumnNodeData } from "./FlowColumnNode";
import { FlowActionEdge } from "./FlowActionEdge";
import { FlowBoardSidebar } from "./FlowBoardSidebar";
import { FlowEdgeActionModal, FlowActionType } from "./FlowEdgeActionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTaskFlows } from "@/hooks/useTaskFlows";
import { useAllBoardColumns } from "@/hooks/useAllBoardColumns";
import { toast } from "sonner";
import type { BoardColumnWithOwner } from "@/hooks/useAllBoardColumns";

const nodeTypes: NodeTypes = {
  column: FlowColumnNode,
};

const edgeTypes: EdgeTypes = {
  actionEdge: FlowActionEdge,
};

interface TaskFlowEditorProps {
  flowId: string;
}

function TaskFlowEditorContent({ flowId }: TaskFlowEditorProps) {
  const navigate = useNavigate();
  const { flows, updateFlowAsync } = useTaskFlows();
  const { boards, isLoading: loadingBoards } = useAllBoardColumns();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  // Load flow data
  useEffect(() => {
    const flow = flows.find((f) => f.id === flowId);
    if (flow && !loadedRef.current) {
      loadedRef.current = true;
      setFlowName(flow.name);
      const fd = flow.flow_data || { nodes: [], edges: [] };
      setNodes(fd.nodes || []);
      setEdges(fd.edges || []);
    }
  }, [flows, flowId]);

  // Auto-save debounced
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges]);

  // Focus name input
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const onConnect = useCallback((params: Connection) => {
    // Open modal to choose action type
    setPendingConnection(params);
  }, []);

  const handleConfirmAction = useCallback(
    (actionType: FlowActionType) => {
      if (!pendingConnection) return;
      const newEdge: Edge = {
        id: `e-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`,
        source: pendingConnection.source!,
        target: pendingConnection.target!,
        sourceHandle: pendingConnection.sourceHandle,
        targetHandle: pendingConnection.targetHandle,
        type: "actionEdge",
        data: { actionType },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => [...eds, newEdge]);
      setPendingConnection(null);
    },
    [pendingConnection, setEdges]
  );

  const getNodeLabel = (nodeId: string | null) => {
    if (!nodeId) return "";
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return "";
    const data = node.data as FlowColumnNodeData;
    return `${data.columnName} (${data.ownerName})`;
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const colData = event.dataTransfer.getData("application/task-flow-column");
      if (!colData) return;

      const col: BoardColumnWithOwner = JSON.parse(colData);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `col-${col.id}-${Date.now()}`,
        type: "column",
        position,
        data: {
          label: `${col.name} - ${col.owner_name}`,
          columnName: col.name,
          ownerName: col.owner_name,
          color: col.color,
          columnId: col.id,
          userId: col.user_id,
        } as FlowColumnNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFlowAsync({
        id: flowId,
        flow_data: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
      });
    } catch {
      toast.error("Erro ao salvar fluxo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) { setIsEditingName(false); return; }
    try {
      await updateFlowAsync({ id: flowId, name: tempName.trim() });
      setFlowName(tempName.trim());
      setIsEditingName(false);
      toast.success("Nome atualizado!");
    } catch {
      toast.error("Erro ao atualizar nome");
    }
  };

  // Delete nodes/edges on key press
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }
    },
    [setNodes, setEdges]
  );

  return (
    <div className="h-screen flex flex-col bg-background" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fluxos")}>
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
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="h-8 text-lg font-semibold"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <h1
                className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                onClick={() => { setTempName(flowName); setIsEditingName(true); }}
              >
                {flowName}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {isSaving ? "Salvando..." : "Salvo automaticamente"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <FlowBoardSidebar boards={boards} isLoading={loadingBoards} />

        <div className="flex-1 bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => (node.data as any).color || "#3B82F6"}
              pannable
              zoomable
            />
            <Panel position="top-center" className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm text-muted-foreground">
              Arraste colunas da barra lateral para criar seu fluxo
            </Panel>
          </ReactFlow>
        </div>
      </div>

      <FlowEdgeActionModal
        isOpen={!!pendingConnection}
        onClose={() => setPendingConnection(null)}
        onConfirm={handleConfirmAction}
        sourceName={getNodeLabel(pendingConnection?.source ?? null)}
        targetName={getNodeLabel(pendingConnection?.target ?? null)}
      />
    </div>
  );
}

export function TaskFlowEditor({ flowId }: TaskFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <TaskFlowEditorContent flowId={flowId} />
    </ReactFlowProvider>
  );
}
