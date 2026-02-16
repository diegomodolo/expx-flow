import { useParams, Navigate } from "react-router-dom";
import { TaskFlowEditor } from "@/components/task-flows/TaskFlowEditor";

export default function TaskFlowEditorPage() {
  const { flowId } = useParams();

  if (!flowId) return <Navigate to="/fluxos" replace />;

  return <TaskFlowEditor flowId={flowId} />;
}
