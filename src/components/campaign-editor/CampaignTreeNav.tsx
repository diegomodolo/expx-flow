import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TreeNode } from '@/hooks/useCampaignTree';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Layers, 
  ImageIcon,
  ChevronRight,
} from 'lucide-react';

interface CampaignTreeNavProps {
  tree: TreeNode | null;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (nodeId: string) => void;
}

function TreeNodeItem({
  node,
  selectedNodeId,
  onSelectNode,
  level,
  expandedNodes,
  toggleExpand,
}: TreeNodeItemProps) {
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  const getIcon = () => {
    switch (node.type) {
      case 'campaign':
        return <Target className="w-4 h-4 flex-shrink-0" />;
      case 'adset':
        return <Layers className="w-4 h-4 flex-shrink-0" />;
      case 'ad':
        return <ImageIcon className="w-4 h-4 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (node.status === 'active') {
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40">
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">
        Pausado
      </Badge>
    );
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors group",
          isSelected
            ? "bg-primary/10 ring-2 ring-primary ring-inset"
            : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelectNode(node)}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-muted rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform text-muted-foreground",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        <span className={cn(
          node.type === 'campaign' ? "text-primary" : "text-muted-foreground"
        )}>
          {getIcon()}
        </span>

        {/* Name */}
        <span
          className={cn(
            "flex-1 truncate text-xs",
            node.type === 'campaign' && "font-medium text-foreground",
            node.type === 'adset' && "font-normal text-foreground",
            node.type === 'ad' && "font-normal text-foreground"
          )}
          title={node.name}
        >
          {node.name}
        </span>

        {/* Status badge */}
        {getStatusBadge()}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CampaignTreeNav({
  tree,
  selectedNodeId,
  onSelectNode,
}: CampaignTreeNavProps) {
  // Initialize with campaign and all ad sets expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree) {
      initial.add(tree.id);
      tree.children?.forEach(child => initial.add(child.id));
    }
    return initial;
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Calculate totals for the summary
  const summary = useMemo(() => {
    if (!tree) return { adSets: 0, ads: 0, activeAds: 0 };
    
    let adSets = 0;
    let ads = 0;
    let activeAds = 0;
    
    tree.children?.forEach(adSet => {
      adSets++;
      adSet.children?.forEach(ad => {
        ads++;
        if (ad.status === 'active') activeAds++;
      });
    });
    
    return { adSets, ads, activeAds };
  }, [tree]);

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Nenhuma campanha selecionada
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with summary */}
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-2">Estrutura</h3>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{summary.adSets} conjuntos</span>
          <span>•</span>
          <span>{summary.ads} anúncios</span>
        </div>
      </div>

      {/* Tree navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <TreeNodeItem
            node={tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            level={0}
            expandedNodes={expandedNodes}
            toggleExpand={toggleExpand}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
