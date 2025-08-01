const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Política de Privacidade
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Informações que Coletamos</h2>
              <p className="text-muted-foreground leading-relaxed">
                A Controle de Tráfego coleta informações que você nos fornece diretamente quando:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Cria uma conta em nossa plataforma</li>
                <li>Preenche formulários em nosso site</li>
                <li>Entra em contato conosco</li>
                <li>Utiliza nossos serviços de gestão de marketing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Como Utilizamos suas Informações</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos as informações coletadas para:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Personalizar sua experiência na plataforma</li>
                <li>Comunicar-nos com você sobre nossa plataforma</li>
                <li>Garantir a segurança de nossa plataforma</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Compartilhamento de Informações</h2>
              <p className="text-muted-foreground leading-relaxed">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
                exceto nas seguintes circunstâncias:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Com seu consentimento explícito</li>
                <li>Para cumprir obrigações legais</li>
                <li>Para proteger nossos direitos e propriedade</li>
                <li>Com prestadores de serviços que nos auxiliam na operação da plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Segurança dos Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais apropriadas para 
                proteger suas informações pessoais contra acesso não autorizado, alteração, 
                divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Seus Direitos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Você tem o direito de:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Acessar suas informações pessoais</li>
                <li>Corrigir informações incorretas</li>
                <li>Solicitar a exclusão de suas informações</li>
                <li>Revogar consentimentos dados anteriormente</li>
                <li>Portabilidade de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência em 
                nossa plataforma, analisar o uso e personalizar conteúdo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-muted-foreground">
                  E-mail: privacidade@controledetrafego.com.br<br />
                  Endereço: [Endereço da Empresa]
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;