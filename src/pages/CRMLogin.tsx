import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRMAuth } from '@/contexts/CRMAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CRMLogin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useCRMAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    // Se já está autenticado, redirecionar para o CRM
    if (isAuthenticated) {
      navigate(`/crm/${token}`);
      return;
    }

    // Buscar configurações do workspace
    const fetchWorkspace = async () => {
      const { data } = await supabase
        .from('crm_workspaces')
        .select('*')
        .eq('access_token', token)
        .eq('is_active', true)
        .single();

      if (data) {
        setWorkspace(data);
      }
    };

    fetchWorkspace();
  }, [token, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    setIsLoading(true);

    const { error } = await login(token, email, password);

    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error === 'Invalid credentials' ? 'Email ou senha incorretos' : error,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Login realizado com sucesso',
      description: 'Bem-vindo ao CRM',
    });

    navigate(`/crm/${token}`);
  };

  const primaryColor = workspace?.login_primary_color || '#3B82F6';
  const title = workspace?.login_title || 'Bem-vindo ao CRM';
  const subtitle = workspace?.login_subtitle || 'Faça login para acessar o sistema';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)`,
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {workspace?.logo_url && (
            <div className="flex justify-center">
              <img 
                src={workspace.logo_url} 
                alt="Logo" 
                className="h-16 object-contain"
              />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="mt-2">{subtitle}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              style={{
                backgroundColor: primaryColor,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
