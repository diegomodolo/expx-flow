import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Check, Loader2, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMindMaps } from '@/hooks/useMindMaps';
import MindMapNodeComponent from '@/components/mind-map/MindMapNode';
import { MindMapToolbar } from '@/components/mind-map/MindMapToolbar';
import { useDebounce } from '@/hooks/useDebounce';

const nodeTypes = { mindMapNode: MindMapNodeComponent };

function MindMapEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mindMaps, updateMindMap } = useMindMaps();
  const { fitView } = useReactFlow();

  const mindMap = mindMaps.find(m => m.id === id);
  const [title, setTitle] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load data once
  useEffect(() => {
    if (mindMap && !initialized.current) {
      setTitle(mindMap.title);
      const loadedNodes = (mindMap.nodes || []).map((n: Node) => ({
        ...n,
        data: {
          ...n.data,
          onAddChild: handleAddChild,
          onLabelChange: handleLabelChange,
        },
      }));
      setNodes(loadedNodes);
      setEdges(mindMap.edges || []);
      initialized.current = true;
      setTimeout(() => fitView({ padding: 0.3 }), 100);
    }
  }, [mindMap]);

  // Update node callbacks when handlers change
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, onAddChild: handleAddChild, onLabelChange: handleLabelChange },
    })));
  }, []);

  // Auto-save with debounce
  const debouncedNodes = useDebounce(nodes, 2000);
  const debouncedEdges = useDebounce(edges, 2000);
  const debouncedTitle = useDebounce(title, 2000);

  useEffect(() => {
    if (!id || !initialized.current) return;
    setSaveStatus('saving');
    updateMindMap.mutate(
      { id, title: debouncedTitle, nodes: debouncedNodes, edges: debouncedEdges },
      { onSuccess: () => setSaveStatus('saved'), onError: () => setSaveStatus('unsaved') }
    );
  }, [debouncedNodes, debouncedEdges, debouncedTitle]);

  const handleAddChild = useCallback((parentId: string) => {
    const newId = `node-${Date.now()}`;
    setEdges(currentEdges => {
      setNodes(nds => {
        const parent = nds.find(n => n.id === parentId);
        if (!parent) return nds;
        const parentLevel = (parent.data as any).level || 0;

        // Count existing children of this parent using edges
        const existingChildIds = currentEdges
          .filter(e => e.source === parentId)
          .map(e => e.target);
        const existingChildren = nds.filter(n => existingChildIds.includes(n.id));
        const childCount = existingChildren.length;

        // Position right next to parent, stacked vertically among siblings
        const spacing = 70;
        const totalHeight = childCount * spacing;
        const startY = parent.position.y - totalHeight / 2;

        const newNode: Node = {
          id: newId,
          type: 'mindMapNode',
          position: {
            x: parent.position.x + 250,
            y: startY + childCount * spacing,
          },
          data: {
            label: 'Nova ideia',
            level: parentLevel + 1,
            onAddChild: handleAddChild,
            onLabelChange: handleLabelChange,
          },
        };
        return [...nds, newNode];
      });

      return [
        ...currentEdges,
        {
          id: `edge-${parentId}-${newId}`,
          source: parentId,
          target: newId,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
        },
      ];
    });
    setSaveStatus('unsaved');
    setTimeout(() => autoLayoutRef.current(), 50);
  }, []);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
    setSaveStatus('unsaved');
  }, []);

  const handleAddSibling = useCallback(() => {
    if (!selectedNodeId) return;
    // Find parent of selected node
    const parentEdge = edges.find(e => e.target === selectedNodeId);
    if (parentEdge) {
      handleAddChild(parentEdge.source);
    }
  }, [selectedNodeId, edges, handleAddChild]);

  const handleDelete = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'root') return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setSaveStatus('unsaved');
    setTimeout(() => autoLayoutRef.current(), 50);
  }, [selectedNodeId]);

  const handleEditLabel = useCallback(() => {
    // Trigger double-click edit on selected node - handled by node component
  }, []);

  // Auto-layout: tree algorithm
  const autoLayoutRef = useRef<() => void>(() => {});
  const handleAutoLayout = useCallback(() => {
    // Read current state via functional updaters, but compute layout synchronously
    // We use refs approach: get latest nodes/edges from the state updater
    setNodes(currentNodes => {
      // We need edges too - get them via a ref trick
      let currentEdges: Edge[] = [];
      setEdges(eds => { currentEdges = eds; return eds; }); // read-only peek

      // Build adjacency: parent -> children
      const childrenMap: Record<string, string[]> = {};
      currentEdges.forEach(e => {
        if (!childrenMap[e.source]) childrenMap[e.source] = [];
        childrenMap[e.source].push(e.target);
      });

      // Find root(s): nodes that are never a target
      const targetIds = new Set(currentEdges.map(e => e.target));
      const roots = currentNodes.filter(n => !targetIds.has(n.id));
      if (roots.length === 0) return currentNodes;

      const H_SPACING = 260;
      const V_SPACING = 70;
      const positions: Record<string, { x: number; y: number }> = {};

      // Lay out recursively
      const layoutNode = (nodeId: string, depth: number, yOffset: number): number => {
        const children = childrenMap[nodeId];
        if (!children || children.length === 0) {
          positions[nodeId] = { x: depth * H_SPACING, y: yOffset * V_SPACING };
          return 1;
        }

        let currentY = yOffset;
        children.forEach(childId => {
          const size = layoutNode(childId, depth + 1, currentY);
          currentY += size;
        });

        // Center parent among its children
        const firstChild = positions[children[0]];
        const lastChild = positions[children[children.length - 1]];
        positions[nodeId] = {
          x: depth * H_SPACING,
          y: (firstChild.y + lastChild.y) / 2,
        };

        return currentY - yOffset;
      };

      let globalY = 0;
      roots.forEach(root => {
        const size = layoutNode(root.id, 0, globalY);
        globalY += size + 1;
      });

      setSaveStatus('unsaved');

      return currentNodes.map(n => ({
        ...n,
        position: positions[n.id] || n.position,
      }));
    });
  }, []);

  // Keep ref updated
  autoLayoutRef.current = handleAutoLayout;

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
    }, eds));
    setSaveStatus('unsaved');
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodeId(selectedNodes.length === 1 ? selectedNodes[0].id : null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Tab' && selectedNodeId) {
        e.preventDefault();
        handleAddChild(selectedNodeId);
      }
      if (e.key === 'Enter' && selectedNodeId) {
        e.preventDefault();
        handleAddSibling();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        handleDelete();
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey) && id) {
        e.preventDefault();
        setSaveStatus('saving');
        updateMindMap.mutate(
          { id, title, nodes, edges },
          { onSuccess: () => setSaveStatus('saved') }
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, handleAddChild, handleAddSibling, handleDelete, id, title, nodes, edges]);

  if (!mindMap && mindMaps.length > 0) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Mapa mental não encontrado.
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mapas-mentais')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Input
            value={title}
            onChange={e => { setTitle(e.target.value); setSaveStatus('unsaved'); }}
            className="border-none bg-transparent text-lg font-semibold h-9 w-64 focus-visible:ring-0 px-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleAutoLayout} className="gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Reorganizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Organizar nós automaticamente em árvore</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>}
            {saveStatus === 'saved' && <><Check className="w-3.5 h-3.5 text-green-500" /> Salvo</>}
            {saveStatus === 'unsaved' && <><Save className="w-3.5 h-3.5" /> Não salvo</>}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            nodeColor={() => 'hsl(var(--primary))'}
            maskColor="hsl(var(--background) / 0.8)"
            className="!bg-card !border-border"
          />
        </ReactFlow>

        <MindMapToolbar
          hasSelection={!!selectedNodeId}
          onAddChild={() => selectedNodeId && handleAddChild(selectedNodeId)}
          onAddSibling={handleAddSibling}
          onEditLabel={handleEditLabel}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

export default function MapaMentalEditor() {
  return (
    <ReactFlowProvider>
      <MindMapEditorInner />
    </ReactFlowProvider>
  );
}
