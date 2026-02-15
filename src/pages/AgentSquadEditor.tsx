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
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SquadAgentNode, SquadAgentNodeData } from "@/components/agent-squads/SquadAgentNode";
import { SquadAgentLibrary } from "@/components/agent-squads/SquadAgentLibrary";
import { SquadNodeEditPanel } from "@/components/agent-squads/SquadNodeEditPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, Check, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAgentSquads } from "@/hooks/useAgentSquads";
import { useToast } from "@/hooks/use-toast";

const nodeTypes: NodeTypes = {
  squadAgent: SquadAgentNode,
};

// Custom labeled edge
function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} id={id} />
      {(data as any)?.label && (
        <EdgeLabelRenderer>
          <div
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
            className="bg-card border rounded px-2 py-0.5 text-xs text-muted-foreground shadow-sm"
          >
            {(data as any).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { labeled: LabeledEdge };

function SquadEditorContent() {
  const navigate = useNavigate();
  const { squadId } = useParams();
  const { toast } = useToast();
  const { fetchSquadById, fetchSquadMembers, fetchSquadFlows, saveSquadLayout } = useAgentSquads();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [squadName, setSquadName] = useState("Squad");
  const [squadClientId, setSquadClientId] = useState<string | undefined>();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const nodesRef = useRef<Node[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleOpenEditPanel = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) setEditingNode(node);
  }, []);

  // Load squad data
  useEffect(() => {
    if (!squadId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const squad = await fetchSquadById(squadId);
        setSquadName(squad.name);
        setSquadClientId(squad.client_id);

        const members = await fetchSquadMembers(squadId);
        const flows = await fetchSquadFlows(squadId);

        // Build nodes from members
        const loadedNodes: Node[] = members.map((m) => ({
          id: m.id,
          type: "squadAgent",
          position: { x: m.position_x, y: m.position_y },
          data: {
            label: m.agent?.agent_name || "Agente",
            description: m.agent?.description || "",
            role: m.role,
            agent_id: m.agent_id,
            squad_instructions: m.squad_instructions || "",
            onEdit: handleOpenEditPanel,
          } as SquadAgentNodeData,
        }));

        // Build edges from flows
        const loadedEdges: Edge[] = flows.map((f) => ({
          id: f.id,
          source: f.source_member_id,
          target: f.target_member_id,
          type: "labeled",
          data: { label: f.label || "" },
          animated: true,
          markerEnd: { type: "arrowclosed" as any },
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
      } catch (err) {
        toast({ title: "Erro ao carregar squad", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [squadId, handleOpenEditPanel]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: "labeled",
        data: { label: "" },
        animated: true,
        markerEnd: { type: "arrowclosed" as any },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const agentData = event.dataTransfer.getData("application/squad-agent");
      if (!agentData) return;

      const agent = JSON.parse(agentData);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `agent-${agent.id}-${Date.now()}`,
        type: "squadAgent",
        position,
        data: {
          label: agent.agent_name,
          description: agent.description || "",
          role: "executor",
          agent_id: agent.id,
          squad_instructions: "",
          onEdit: handleOpenEditPanel,
        } as SquadAgentNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [handleOpenEditPanel, setNodes, screenToFlowPosition]
  );

  const onDragStart = (event: React.DragEvent, agent: any) => {
    event.dataTransfer.setData("application/squad-agent", JSON.stringify(agent));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleSaveNode = (id: string, updates: Partial<SquadAgentNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...(node.data as SquadAgentNodeData), ...updates } } : node
      )
    );
  };

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const handleSave = async () => {
    if (!squadId) return;
    setIsSaving(true);
    try {
      const members = nodes.map((n) => {
        const d = n.data as SquadAgentNodeData;
        return {
          id: n.id,
          agent_id: d.agent_id,
          role: d.role,
          squad_instructions: d.squad_instructions,
          position_x: n.position.x,
          position_y: n.position.y,
        };
      });

      const flows = edges.map((e) => ({
        source_member_id: e.source,
        target_member_id: e.target,
        label: (e.data as any)?.label || "",
      }));

      await saveSquadLayout(squadId, members, flows);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditingName = () => {
    setTempName(squadName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      setSquadName(tempName.trim());
      // TODO: persist name change
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  if (isLoading) {
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/ia/squads")}>
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
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1
                className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                onClick={handleStartEditingName}
              >
                {squadName}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">Editor Visual da Squad</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <SquadAgentLibrary clientId={squadClientId} onDragStart={onDragStart} />

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
            defaultEdgeOptions={{ type: "labeled", animated: true, markerEnd: { type: "arrowclosed" as any } }}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
            <Panel position="top-center" className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm text-muted-foreground">
              Arraste agentes da biblioteca e conecte-os para definir o fluxo
            </Panel>
          </ReactFlow>
        </div>
      </div>

      <SquadNodeEditPanel
        node={editingNode}
        isOpen={!!editingNode}
        onClose={() => setEditingNode(null)}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}

export default function AgentSquadEditor() {
  return (
    <ReactFlowProvider>
      <SquadEditorContent />
    </ReactFlowProvider>
  );
}
