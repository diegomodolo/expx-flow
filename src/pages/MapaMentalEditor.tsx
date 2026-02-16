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

  // Helper: compute node metadata (childCount, hasLeft/RightChildren, collapsed visibility)
  const updateNodeMetadata = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    // Build parent->children map with direction info
    const childrenMap: Record<string, string[]> = {};
    const edgeDirectionMap: Record<string, 'left' | 'right'> = {}; // edge.id -> direction

    currentEdges.forEach(e => {
      if (!childrenMap[e.source]) childrenMap[e.source] = [];
      childrenMap[e.source].push(e.target);
      edgeDirectionMap[e.id] = (e.data as any)?.direction || 'right';
    });

    // For each edge, determine direction from edge data
    const nodeChildDirections: Record<string, Set<string>> = {};
    currentEdges.forEach(e => {
      if (!nodeChildDirections[e.source]) nodeChildDirections[e.source] = new Set();
      const dir = (e.data as any)?.direction || 'right';
      nodeChildDirections[e.source].add(dir);
    });

    return currentNodes.map(n => {
      const children = childrenMap[n.id] || [];
      const directions = nodeChildDirections[n.id] || new Set();
      return {
        ...n,
        data: {
          ...n.data,
          childCount: children.length,
          hasLeftChildren: directions.has('left'),
          hasRightChildren: directions.has('right') || (children.length > 0 && !directions.has('left')),
        },
      };
    });
  }, []);

  // Load data once
  useEffect(() => {
    if (mindMap && !initialized.current) {
      setTitle(mindMap.title);
      const loadedEdges = mindMap.edges || [];
      const loadedNodes = (mindMap.nodes || []).map((n: Node) => ({
        ...n,
        data: {
          ...n.data,
          onAddChild: handleAddChildRef.current,
          onLabelChange: handleLabelChangeRef.current,
          onToggleCollapse: handleToggleCollapseRef.current,
        },
      }));
      setEdges(loadedEdges);
      setNodes(updateNodeMetadata(loadedNodes, loadedEdges));
      initialized.current = true;
      setTimeout(() => fitView({ padding: 0.3 }), 100);
    }
  }, [mindMap]);

  // Refs for stable callbacks passed to node data
  const handleAddChildRef = useRef<(parentId: string, direction?: 'left' | 'right') => void>(() => {});
  const handleLabelChangeRef = useRef<(nodeId: string, label: string) => void>(() => {});
  const handleToggleCollapseRef = useRef<(nodeId: string) => void>(() => {});

  // Sync callbacks into nodes
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        onAddChild: handleAddChildRef.current,
        onLabelChange: handleLabelChangeRef.current,
        onToggleCollapse: handleToggleCollapseRef.current,
      },
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

  // Toggle collapse
  const handleToggleCollapse = useCallback((nodeId: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, collapsed: !(n.data as any).collapsed } }
        : n
    ));
    setSaveStatus('unsaved');
    setTimeout(() => autoLayoutRef.current(), 50);
  }, []);
  handleToggleCollapseRef.current = handleToggleCollapse;

  // Add child with direction support
  const handleAddChild = useCallback((parentId: string, direction: 'left' | 'right' = 'right') => {
    const newId = `node-${Date.now()}`;
    setEdges(currentEdges => {
      setNodes(nds => {
        const parent = nds.find(n => n.id === parentId);
        if (!parent) return nds;
        const parentLevel = (parent.data as any).level || 0;

        const xOffset = direction === 'left' ? -250 : 250;

        const newNode: Node = {
          id: newId,
          type: 'mindMapNode',
          position: {
            x: parent.position.x + xOffset,
            y: parent.position.y,
          },
          data: {
            label: 'Nova ideia',
            level: parentLevel + 1,
            direction,
            onAddChild: handleAddChildRef.current,
            onLabelChange: handleLabelChangeRef.current,
            onToggleCollapse: handleToggleCollapseRef.current,
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
          type: 'default',
          sourceHandle: direction === 'left' ? 'left-source' : undefined,
          targetHandle: direction === 'left' ? 'right-target' : undefined,
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
          data: { direction },
        },
      ];
    });
    setSaveStatus('unsaved');
    setTimeout(() => autoLayoutRef.current(), 50);
  }, []);
  handleAddChildRef.current = handleAddChild;

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
    setSaveStatus('unsaved');
  }, []);
  handleLabelChangeRef.current = handleLabelChange;

  const handleAddSibling = useCallback(() => {
    if (!selectedNodeId) return;
    const parentEdge = edges.find(e => e.target === selectedNodeId);
    if (parentEdge) {
      const dir = (parentEdge.data as any)?.direction || 'right';
      handleAddChild(parentEdge.source, dir);
    }
  }, [selectedNodeId, edges, handleAddChild]);

  const handleDelete = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'root') return;
    // Recursively find all descendants
    const toDelete = new Set<string>();
    const findDescendants = (nodeId: string) => {
      toDelete.add(nodeId);
      edges.filter(e => e.source === nodeId).forEach(e => findDescendants(e.target));
    };
    findDescendants(selectedNodeId);

    setNodes(nds => nds.filter(n => !toDelete.has(n.id)));
    setEdges(eds => eds.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)));
    setSelectedNodeId(null);
    setSaveStatus('unsaved');
    setTimeout(() => autoLayoutRef.current(), 50);
  }, [selectedNodeId, edges]);

  const handleEditLabel = useCallback(() => {}, []);

  // Auto-layout: bidirectional tree algorithm
  const autoLayoutRef = useRef<() => void>(() => {});
  const handleAutoLayout = useCallback(() => {
    setNodes(currentNodes => {
      let currentEdges: Edge[] = [];
      setEdges(eds => { currentEdges = eds; return eds; });

      // Build adjacency with direction
      const rightChildrenMap: Record<string, string[]> = {};
      const leftChildrenMap: Record<string, string[]> = {};
      currentEdges.forEach(e => {
        const dir = (e.data as any)?.direction || 'right';
        if (dir === 'left') {
          if (!leftChildrenMap[e.source]) leftChildrenMap[e.source] = [];
          leftChildrenMap[e.source].push(e.target);
        } else {
          if (!rightChildrenMap[e.source]) rightChildrenMap[e.source] = [];
          rightChildrenMap[e.source].push(e.target);
        }
      });

      // Find root(s)
      const targetIds = new Set(currentEdges.map(e => e.target));
      const roots = currentNodes.filter(n => !targetIds.has(n.id));
      if (roots.length === 0) return currentNodes;

      // Check collapsed state
      const collapsedSet = new Set(
        currentNodes.filter(n => (n.data as any).collapsed).map(n => n.id)
      );

      const H_GAP = 50; // horizontal gap between a node's right edge and its child's left edge
      const V_GAP = 16; // vertical gap between sibling nodes
      const positions: Record<string, { x: number; y: number }> = {};
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

      const getNodeHeight = (nodeId: string): number => {
        const n = nodeMap.get(nodeId);
        return n?.measured?.height ?? n?.height ?? 40;
      };
      const getNodeWidth = (nodeId: string): number => {
        const n = nodeMap.get(nodeId);
        return n?.measured?.width ?? n?.width ?? 120;
      };

      // Calculate the total vertical space a subtree needs
      // This is the sum of all leaf-level heights + gaps, NOT influenced by parent height
      const subtreeHeightCache: Record<string, number> = {};
      const calcSubtreeSpan = (nodeId: string, childrenMap: Record<string, string[]>): number => {
        const key = `${nodeId}-${childrenMap === rightChildrenMap ? 'r' : 'l'}`;
        if (subtreeHeightCache[key] !== undefined) return subtreeHeightCache[key];

        if (collapsedSet.has(nodeId)) {
          subtreeHeightCache[key] = getNodeHeight(nodeId);
          return subtreeHeightCache[key];
        }

        const children = childrenMap[nodeId];
        if (!children || children.length === 0) {
          subtreeHeightCache[key] = getNodeHeight(nodeId);
          return subtreeHeightCache[key];
        }

        // Total span = sum of all children subtree spans + gaps between them
        let total = 0;
        children.forEach((cId, i) => {
          if (i > 0) total += V_GAP;
          total += calcSubtreeSpan(cId, childrenMap);
        });

        // The parent itself needs at least its own height
        subtreeHeightCache[key] = Math.max(getNodeHeight(nodeId), total);
        return subtreeHeightCache[key];
      };

      // Layout a branch: place children, then center parent on them
      const layoutBranch = (
        nodeId: string,
        xStart: number, // the X position for this node
        yCenterHint: number, // the center Y where this subtree should be placed
        childrenMap: Record<string, string[]>,
        dirMul: number // 1 for right, -1 for left
      ) => {
        const myHeight = getNodeHeight(nodeId);
        const myWidth = getNodeWidth(nodeId);
        const children = collapsedSet.has(nodeId) ? undefined : childrenMap[nodeId];

        if (!children || children.length === 0) {
          // Leaf: center on the hint
          if (!positions[nodeId]) {
            positions[nodeId] = { x: xStart, y: yCenterHint - myHeight / 2 };
          }
          return;
        }

        // Calculate children positions
        const totalChildSpan = calcSubtreeSpan(nodeId, childrenMap);
        const childrenSpan = children.reduce((sum, cId, i) => {
          return sum + calcSubtreeSpan(cId, childrenMap) + (i > 0 ? V_GAP : 0);
        }, 0);

        // Children X: after this node's right edge + gap
        const childX = dirMul > 0
          ? xStart + myWidth + H_GAP
          : xStart - H_GAP; // for left, children are placed to the left

        // Children Y: centered around the hint
        let childYTop = yCenterHint - childrenSpan / 2;

        children.forEach(childId => {
          const childSpan = calcSubtreeSpan(childId, childrenMap);
          const childCenter = childYTop + childSpan / 2;

          // For left direction, position child so its right edge aligns
          const childWidth = getNodeWidth(childId);
          const childXPos = dirMul > 0 ? childX : childX - childWidth;

          positions[childId] = {
            x: childXPos,
            y: childCenter - getNodeHeight(childId) / 2,
          };
          layoutBranch(childId, childXPos, childCenter, childrenMap, dirMul);
          childYTop += childSpan + V_GAP;
        });

        // Center parent vertically among its children
        if (!positions[nodeId]) {
          const firstChildPos = positions[children[0]];
          const lastChildPos = positions[children[children.length - 1]];
          const lastChildH = getNodeHeight(children[children.length - 1]);
          const centerY = (firstChildPos.y + lastChildPos.y + lastChildH) / 2 - myHeight / 2;
          positions[nodeId] = { x: xStart, y: centerY };
        }
      };

      let globalY = 0;
      roots.forEach(root => {
        const hasRight = !collapsedSet.has(root.id) && (rightChildrenMap[root.id]?.length || 0) > 0;
        const hasLeft = !collapsedSet.has(root.id) && (leftChildrenMap[root.id]?.length || 0) > 0;

        const rightSpan = hasRight ? calcSubtreeSpan(root.id, rightChildrenMap) : getNodeHeight(root.id);
        const leftSpan = hasLeft ? calcSubtreeSpan(root.id, leftChildrenMap) : getNodeHeight(root.id);
        const maxSpan = Math.max(rightSpan, leftSpan);
        const centerY = globalY + maxSpan / 2;

        // Position root
        const rootWidth = getNodeWidth(root.id);
        positions[root.id] = { x: -rootWidth / 2, y: centerY - getNodeHeight(root.id) / 2 };

        if (hasRight) {
          layoutBranch(root.id, -rootWidth / 2, centerY, rightChildrenMap, 1);
        }
        if (hasLeft) {
          layoutBranch(root.id, -rootWidth / 2, centerY, leftChildrenMap, -1);
        }

        globalY += maxSpan + V_GAP * 3;
      });

      setSaveStatus('unsaved');

      // Update metadata and positions
      const updatedNodes = currentNodes.map(n => ({
        ...n,
        position: positions[n.id] || n.position,
        // Hide collapsed children
        hidden: isHiddenByCollapse(n.id, currentEdges, collapsedSet),
      }));

      return updateNodeMetadata(updatedNodes, currentEdges);
    });

    // Also hide collapsed edges
    setEdges(eds => {
      let currentNodes: Node[] = [];
      setNodes(nds => { currentNodes = nds; return nds; });
      const hiddenNodeIds = new Set(currentNodes.filter(n => n.hidden).map(n => n.id));
      return eds.map(e => ({
        ...e,
        hidden: hiddenNodeIds.has(e.target),
      }));
    });
  }, [updateNodeMetadata]);

  autoLayoutRef.current = handleAutoLayout;

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      type: 'default',
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
        handleAddChild(selectedNodeId, 'right');
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
            type: 'default',
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
          onAddChild={() => selectedNodeId && handleAddChild(selectedNodeId, 'right')}
          onAddSibling={handleAddSibling}
          onEditLabel={handleEditLabel}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

// Helper: check if a node should be hidden because an ancestor is collapsed
function isHiddenByCollapse(nodeId: string, edges: Edge[], collapsedSet: Set<string>): boolean {
  // Find parent
  const parentEdge = edges.find(e => e.target === nodeId);
  if (!parentEdge) return false; // root is never hidden
  if (collapsedSet.has(parentEdge.source)) return true;
  return isHiddenByCollapse(parentEdge.source, edges, collapsedSet);
}

export default function MapaMentalEditor() {
  return (
    <ReactFlowProvider>
      <MindMapEditorInner />
    </ReactFlowProvider>
  );
}
