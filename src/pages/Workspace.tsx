import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";
import type { WorkspaceDocument } from "@/types/workspace";
import { FileText } from "lucide-react";

export default function Workspace() {
  const [selectedDocument, setSelectedDocument] = useState<WorkspaceDocument | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Workspace</h1>
            <p className="text-sm text-muted-foreground">Crie e organize seus documentos</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <WorkspaceSidebar
                selectedDocumentId={selectedDocument?.id || null}
                onSelectDocument={setSelectedDocument}
                onSelectFolder={setSelectedFolderId}
                selectedFolderId={selectedFolderId}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={75} minSize={50}>
              <WorkspaceEditor document={selectedDocument} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </DashboardLayout>
  );
}
