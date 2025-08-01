import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Building, Mail, Phone } from "lucide-react";

export const CompanySettings = () => {
  const { activeCompany, updateCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: activeCompany?.company?.name || "",
    email: activeCompany?.company?.email || "",
    phone: activeCompany?.company?.phone || "",
    logo: activeCompany?.company?.logo || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany?.company?.id) return;

    try {
      setLoading(true);
      await updateCompany(activeCompany.company.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        logo: formData.logo,
      });
      
      toast({
        title: "Empresa atualizada!",
        description: "As configurações da empresa foram salvas com sucesso.",
      });
    } catch (error) {
      // Error handling is done in updateCompany
    } finally {
      setLoading(false);
    }
  };

  if (!activeCompany?.company) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Nenhuma empresa selecionada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Configurações da Empresa
        </CardTitle>
        <CardDescription>
          Gerencie as informações da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Section */}
          <div className="space-y-4">
            <Label>Logotipo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={formData.logo} alt="Logo da empresa" />
                <AvatarFallback>
                  <Building className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              <ImageUploader
                bucket="company-logos"
                folder={activeCompany?.company?.id}
                currentImageUrl={formData.logo}
                onImageUploaded={(url) => setFormData({ ...formData, logo: url })}
                onImageRemoved={() => setFormData({ ...formData, logo: "" })}
                maxSize={5}
                className="flex-1"
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da sua empresa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email da Empresa</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone da Empresa</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">URL do Logotipo</Label>
              <Input
                id="logo"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({
                name: activeCompany.company?.name || "",
                email: activeCompany.company?.email || "",
                phone: activeCompany.company?.phone || "",
                logo: activeCompany.company?.logo || "",
              })}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};