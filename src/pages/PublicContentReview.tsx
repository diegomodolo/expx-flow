import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  order_index: number;
  headline: string | null;
  subheadline: string | null;
  caption: string | null;
  objective: string | null;
  post_type: string | null;
  image_url: string | null;
  review_status: string | null;
  review_feedback: string | null;
  reviewed_at: string | null;
}

interface Plan {
  id: string;
  name: string;
  status: string;
  month: number;
  year: number;
  clients: {
    id: string;
    name: string;
    company: string;
    avatar: string | null;
  } | null;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PublicContentReview() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchPlanData();
    } else {
      setError("Link inválido");
      setIsLoading(false);
    }
  }, [token]);

  const fetchPlanData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-content-review?token=${token}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar dados");
      }

      setPlan(data.plan);
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (postId: string) => {
    setUpdatingPostId(postId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-content-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            reviewStatus: "approved",
            planToken: token,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao aprovar");
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, review_status: "approved", review_feedback: null, reviewed_at: new Date().toISOString() }
            : p
        )
      );
      toast.success("Post aprovado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setUpdatingPostId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingPostId || !rejectFeedback.trim()) {
      toast.error("Informe o que precisa ser alterado");
      return;
    }

    setUpdatingPostId(rejectingPostId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-content-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: rejectingPostId,
            reviewStatus: "rejected",
            reviewFeedback: rejectFeedback,
            planToken: token,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao rejeitar");
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === rejectingPostId
            ? { ...p, review_status: "rejected", review_feedback: rejectFeedback, reviewed_at: new Date().toISOString() }
            : p
        )
      );
      setRejectingPostId(null);
      setRejectFeedback("");
      toast.success("Feedback enviado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao rejeitar");
    } finally {
      setUpdatingPostId(null);
    }
  };

  const getReviewStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Reprovado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const approvedCount = posts.filter((p) => p.review_status === "approved").length;
  const rejectedCount = posts.filter((p) => p.review_status === "rejected").length;
  const pendingCount = posts.filter((p) => !p.review_status || p.review_status === "pending").length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {plan.clients?.avatar && (
              <Avatar className="h-12 w-12">
                <AvatarImage src={plan.clients.avatar} />
                <AvatarFallback>{plan.clients.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold">{plan.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{plan.clients?.name}</span>
                <span>•</span>
                <Calendar className="w-4 h-4" />
                <span>{monthNames[plan.month - 1]} {plan.year}</span>
              </div>
            </div>
          </div>

          {/* Progress summary */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>{approvedCount} aprovados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>{rejectedCount} reprovados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span>{pendingCount} pendentes</span>
            </div>
          </div>
        </div>
      </header>

      {/* Posts grid */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <Card
              key={post.id}
              className={`overflow-hidden transition-all ${
                post.review_status === "approved"
                  ? "ring-2 ring-green-500/30"
                  : post.review_status === "rejected"
                  ? "ring-2 ring-red-500/30"
                  : ""
              }`}
            >
              {/* Image */}
              <div className="aspect-[3/4] bg-muted relative">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.headline || `Post ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Post number */}
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>

                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  {getReviewStatusBadge(post.review_status)}
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Headlines */}
                {post.headline && (
                  <h3 className="font-semibold text-sm">{post.headline}</h3>
                )}
                {post.subheadline && (
                  <p className="text-sm text-muted-foreground">{post.subheadline}</p>
                )}

                {/* Caption */}
                {post.caption && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    <p className="line-clamp-4">{post.caption}</p>
                  </div>
                )}

                {/* Rejection feedback */}
                {post.review_status === "rejected" && post.review_feedback && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                    <p className="text-xs font-medium text-red-600 mb-1">Feedback:</p>
                    <p className="text-xs text-red-600/80">{post.review_feedback}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant={post.review_status === "approved" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleApprove(post.id)}
                    disabled={updatingPostId === post.id}
                  >
                    {updatingPostId === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    variant={post.review_status === "rejected" ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                      setRejectingPostId(post.id);
                      setRejectFeedback(post.review_feedback || "");
                    }}
                    disabled={updatingPostId === post.id}
                  >
                    <X className="w-4 h-4" />
                    Reprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              Nenhum post neste planejamento
            </h3>
          </div>
        )}
      </main>

      {/* Reject dialog */}
      <Dialog open={!!rejectingPostId} onOpenChange={() => setRejectingPostId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Post</DialogTitle>
            <DialogDescription>
              Informe o que precisa ser alterado neste post para que seja aprovado.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Descreva as alterações necessárias..."
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingPostId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectFeedback.trim() || updatingPostId === rejectingPostId}
            >
              {updatingPostId === rejectingPostId ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
