import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { TreeNode } from '@/hooks/useCampaignTree';
import { CampaignTreeNav } from './CampaignTreeNav';
import { CampaignEditContent } from './CampaignEditContent';
import { AdSetEditContent } from './AdSetEditContent';
import { AdEditContent } from './AdEditContent';

interface UnifiedCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTree: TreeNode | null;
  initialSelectedNode: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}

export function UnifiedCampaignModal({
  isOpen,
  onClose,
  campaignTree,
  initialSelectedNode,
  clientId,
  companyId,
  onSuccess,
}: UnifiedCampaignModalProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(initialSelectedNode);
  const [parentNode, setParentNode] = useState<TreeNode | null>(null);

  // Update selected node when initial node changes
  useEffect(() => {
    if (isOpen && initialSelectedNode) {
      setSelectedNode(initialSelectedNode);
    }
  }, [isOpen, initialSelectedNode?.id]);

  // Find parent node for ads (to show inherited pixel)
  const findParentNode = useCallback((node: TreeNode, tree: TreeNode | null): TreeNode | null => {
    if (!tree || !node.parentId) return null;
    
    if (tree.id === node.parentId) return tree;
    
    if (tree.children) {
      for (const child of tree.children) {
        if (child.id === node.parentId) return child;
        const found = findParentNode(node, child);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Update parent node when selected node changes
  useEffect(() => {
    if (selectedNode?.type === 'ad' && campaignTree) {
      const parent = findParentNode(selectedNode, campaignTree);
      setParentNode(parent);
    } else {
      setParentNode(null);
    }
  }, [selectedNode, campaignTree, findParentNode]);

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleSuccess = () => {
    onSuccess?.();
  };

  if (!campaignTree) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-[1800px] max-w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        hideCloseButton={false}
      >
        <div className="flex h-full">
          {/* Left sidebar - Tree navigation */}
          <div className="w-[340px] min-w-[340px] border-r bg-muted/30 flex flex-col">
            <CampaignTreeNav
              tree={campaignTree}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={handleNodeSelect}
            />
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedNode?.type === 'campaign' && (
              <CampaignEditContent
                node={selectedNode}
                clientId={clientId}
                companyId={companyId}
                onSuccess={handleSuccess}
              />
            )}
            {selectedNode?.type === 'adset' && (
              <AdSetEditContent
                node={selectedNode}
                clientId={clientId}
                companyId={companyId}
                onSuccess={handleSuccess}
              />
            )}
            {selectedNode?.type === 'ad' && (
              <AdEditContent
                node={selectedNode}
                parentNode={parentNode}
                clientId={clientId}
                companyId={companyId}
                onSuccess={handleSuccess}
              />
            )}
            {!selectedNode && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Selecione um item na navegação à esquerda
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
