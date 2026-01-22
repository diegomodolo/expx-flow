import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, TrendingUp, BarChart3, Zap, Shield, Users, CheckCircle, Star, Quote, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-green-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logo-full.png" 
                alt="Expx Flow" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-gray-900">Expx Flow</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('inicio')} 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Início
              </button>
              <button 
                onClick={() => scrollToSection('recursos')} 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Recursos
              </button>
              <button 
                onClick={() => scrollToSection('beneficios')} 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Benefícios
              </button>
              <button 
                onClick={() => scrollToSection('depoimentos')} 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Depoimentos
              </button>
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                  Entrar no Sistema
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-gray-600 hover:text-green-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-green-100 py-4">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => scrollToSection('inicio')} 
                  className="text-left text-gray-600 hover:text-green-600 transition-colors"
                >
                  Início
                </button>
                <button 
                  onClick={() => scrollToSection('recursos')} 
                  className="text-left text-gray-600 hover:text-green-600 transition-colors"
                >
                  Recursos
                </button>
                <button 
                  onClick={() => scrollToSection('beneficios')} 
                  className="text-left text-gray-600 hover:text-green-600 transition-colors"
                >
                  Benefícios
                </button>
                <button 
                  onClick={() => scrollToSection('depoimentos')} 
                  className="text-left text-gray-600 hover:text-green-600 transition-colors"
                >
                  Depoimentos
                </button>
                <Link to="/auth" className="inline-block">
                  <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-full">
                    Entrar no Sistema
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-green-500/5 to-transparent"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src="/logo-full.png" 
                  alt="Expx Flow" 
                  className="h-16 w-auto"
                />
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  Sistema Inteligente
                </Badge>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Expx
                  <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent"> Flow</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Transforme seus dados de tráfego pago em insights poderosos. Monitore, analise e otimize suas campanhas com inteligência artificial.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
                    Entrar no Sistema
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-green-200 text-green-700 hover:bg-green-50">
                  Ver Demonstração
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Acesso instantâneo</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Suporte 24/7</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-3xl blur-3xl opacity-30 animate-pulse"></div>
              <Card className="relative p-8 backdrop-blur-sm bg-white/90 border-green-100 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Dashboard em Tempo Real</h3>
                    <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">ROI Atual</p>
                      <p className="text-2xl font-bold text-green-600">+247%</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-gray-600">Conversões</p>
                      <p className="text-2xl font-bold text-emerald-600">1,284</p>
                    </div>
                  </div>
                  <div className="h-24 bg-gradient-to-r from-green-100 to-green-50 rounded-lg flex items-end justify-around p-2">
                    <div className="h-8 w-3 bg-green-400 rounded"></div>
                    <div className="h-12 w-3 bg-green-500 rounded"></div>
                    <div className="h-16 w-3 bg-green-600 rounded"></div>
                    <div className="h-10 w-3 bg-green-400 rounded"></div>
                    <div className="h-20 w-3 bg-green-700 rounded"></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Recursos Principais
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para dominar o tráfego pago e maximizar seus resultados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Avançado</h3>
              <p className="text-gray-600">
                Monitore todas as métricas importantes em tempo real com dashboards intuitivos e relatórios detalhados.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">IA para Otimização</h3>
              <p className="text-gray-600">
                Inteligência artificial que identifica oportunidades e sugere otimizações automáticas para suas campanhas.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestão de Campanhas</h3>
              <p className="text-gray-600">
                Organize e gerencie todas as suas campanhas de forma centralizada com ferramentas poderosas de controle.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Alertas Inteligentes</h3>
              <p className="text-gray-600">
                Receba notificações automáticas sobre oportunidades, problemas e insights importantes em suas campanhas.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestão de Equipes</h3>
              <p className="text-gray-600">
                Organize squads, distribua tarefas e acompanhe a produtividade da sua equipe de marketing digital.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-green-100 group hover:border-green-200">
              <div className="mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Segurança Avançada</h3>
              <p className="text-gray-600">
                Dados protegidos com criptografia de ponta e controle de acesso granular para sua equipe.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Por que escolher o Expx Flow?
                </h2>
                <p className="text-xl text-gray-600">
                  Maximize seus resultados com a plataforma mais completa para gestão de tráfego pago do mercado.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">ROI Comprovado</h3>
                    <p className="text-gray-600">Clientes reportam aumento médio de 180% no ROI das campanhas nos primeiros 3 meses.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Economia de Tempo</h3>
                    <p className="text-gray-600">Automatize até 70% das tarefas manuais e foque no que realmente importa: estratégia.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Insights Acionáveis</h3>
                    <p className="text-gray-600">IA identifica padrões ocultos e fornece recomendações específicas para cada campanha.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="p-8 bg-white border-green-100 shadow-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Resultados em Tempo Real</h3>
                    <Badge className="bg-green-100 text-green-700">+23% hoje</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">R$ 2.4M</p>
                      <p className="text-sm text-gray-600">Receita Gerada</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <p className="text-3xl font-bold text-emerald-600">89%</p>
                      <p className="text-sm text-gray-600">Taxa de Conversão</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Google Ads</span>
                      <span className="text-sm font-medium text-gray-900">65%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full w-[65%]"></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Facebook Ads</span>
                      <span className="text-sm font-medium text-gray-900">35%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full w-[35%]"></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-600">
              Mais de 500 empresas confiam no Expx Flow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 border-green-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="h-8 w-8 text-green-600 mb-4" />
              <p className="text-gray-600 mb-4">
                "O Expx Flow revolucionou nossa operação de mídia paga. Conseguimos triplicar nosso ROI em apenas 4 meses."
              </p>
              <div className="flex items-center">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">MC</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Maria Silva</p>
                  <p className="text-sm text-gray-600">CMO, TechCorp</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-green-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="h-8 w-8 text-green-600 mb-4" />
              <p className="text-gray-600 mb-4">
                "A IA do sistema é impressionante. Identifica oportunidades que nossa equipe jamais encontraria manualmente."
              </p>
              <div className="flex items-center">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">RS</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Roberto Santos</p>
                  <p className="text-sm text-gray-600">Diretor, GrowthCo</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-green-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="h-8 w-8 text-green-600 mb-4" />
              <p className="text-gray-600 mb-4">
                "Interface intuitiva e relatórios detalhados. Nossa produtividade aumentou 200% desde que começamos a usar."
              </p>
              <div className="flex items-center">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">AL</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Ana Lima</p>
                  <p className="text-sm text-gray-600">Head Digital, ScaleCorp</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 via-green-700 to-green-800">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Acesse o sistema agora
            </h2>
            <p className="text-xl text-green-100">
              Entre no Expx Flow e gerencie suas campanhas com inteligência artificial.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 shadow-lg hover:shadow-xl transition-all duration-300">
                  Entrar no Sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                Falar com Especialista
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-green-500">
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-green-200">Empresas Ativas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">R$ 50M+</p>
                <p className="text-green-200">Em Tráfego Gerenciado</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">Resultados</p>
                <p className="text-green-200">Comprovados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <img 
                src="/logo-full.png" 
                alt="Expx Flow" 
                className="h-8 w-auto brightness-0 invert"
              />
              <span className="text-white font-semibold">Expx Flow</span>
            </div>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 Expx Flow. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
