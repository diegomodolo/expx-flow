import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, Users, Megaphone, CheckCircle, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const features = [
    {
      icon: BarChart3,
      title: "Relatórios Avançados",
      description: "Acompanhe métricas detalhadas de CPL, ROI e performance de campanhas em tempo real."
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Organize e gerencie todos os seus clientes em um só lugar com histórico completo."
    },
    {
      icon: Megaphone,
      title: "Campanhas Inteligentes",
      description: "Crie, monitore e otimize campanhas de marketing digital com ferramentas avançadas."
    },
    {
      icon: TrendingUp,
      title: "Analytics em Tempo Real",
      description: "Dashboards interativos com dados atualizados automaticamente."
    }
  ];

  const benefits = [
    "Aumente o ROI das suas campanhas em até 300%",
    "Reduza o tempo de análise em 80%",
    "Automatize relatórios e economize horas",
    "Tenha visão 360° dos seus clientes",
    "Dashboards personalizáveis e intuitivos",
    "Suporte técnico especializado"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
            <h1 className="text-xl font-bold text-gray-900">MarketingHub</h1>
          </div>
          <div className="flex space-x-4">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Cadastre-se Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
            ⚡ Plataforma #1 em Marketing Digital
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Gerencie suas 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> campanhas</span>
            <br />como um profissional
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A plataforma completa para agências e profissionais de marketing que querem 
            resultados extraordinários. Dashboards inteligentes, relatórios automatizados 
            e gestão completa de clientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-6 text-lg">
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
              Ver Demo ao Vivo
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            ✅ Grátis por 14 dias • ✅ Sem cartão de crédito • ✅ Suporte 24/7
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em uma plataforma
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ferramentas profissionais para otimizar suas campanhas e maximizar resultados
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Por que +5.000 profissionais escolhem nossa plataforma?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-white text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/auth">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg">
                    Comece Agora - É Grátis!
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <CardTitle className="text-2xl text-white">
                    "Aumentamos nosso ROI em 250% em apenas 3 meses"
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-white/90 text-lg mb-4">
                    "A plataforma revolucionou nossa agência. Dashboards intuitivos, 
                    relatórios automáticos e insights que realmente fazem diferença."
                  </p>
                  <div className="text-white/80">
                    <p className="font-semibold">Maria Silva</p>
                    <p>CEO, Digital Marketing Pro</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para transformar seus resultados?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de profissionais que já estão usando nossa plataforma 
            para maximizar o desempenho de suas campanhas
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-12 py-6 text-xl">
              Cadastre-se Gratuitamente
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
          <p className="text-gray-400 mt-4">
            Teste grátis por 14 dias. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
            <span className="text-white font-semibold">MarketingHub</span>
          </div>
          <p className="text-gray-400">
            © 2024 MarketingHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}