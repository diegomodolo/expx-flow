const TermosServico = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Termos de Serviço
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e usar a plataforma Controle de Tráfego, você concorda em estar 
                vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte 
                destes termos, não deve usar nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground leading-relaxed">
                A Controle de Tráfego é uma plataforma de gestão de marketing que oferece:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Gestão de campanhas de marketing</li>
                <li>Controle de equipes e colaboradores</li>
                <li>Relatórios e análises</li>
                <li>Gestão de clientes</li>
                <li>Ferramentas de produtividade</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Conta do Usuário</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para usar nossa plataforma, você deve:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Fornecer informações precisas e atualizadas</li>
                <li>Manter a segurança de sua conta</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
                <li>Notificar-nos imediatamente sobre uso não autorizado</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Uso Aceitável</h2>
              <p className="text-muted-foreground leading-relaxed">
                Você concorda em não usar nossa plataforma para:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Atividades ilegais ou fraudulentas</li>
                <li>Violação de direitos de terceiros</li>
                <li>Distribuição de malware ou conteúdo malicioso</li>
                <li>Tentativas de acesso não autorizado</li>
                <li>Spam ou comunicações não solicitadas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Propriedade Intelectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                A plataforma Controle de Tráfego e todo seu conteúdo são protegidos por 
                direitos autorais, marcas registradas e outras leis de propriedade intelectual. 
                Você não pode copiar, modificar ou distribuir nosso conteúdo sem autorização.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Pagamentos e Assinaturas</h2>
              <p className="text-muted-foreground leading-relaxed">
                Os serviços são oferecidos mediante assinatura. Os preços, formas de pagamento 
                e políticas de cancelamento estão disponíveis em nossa plataforma e podem ser 
                alterados com aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nossa responsabilidade é limitada ao máximo permitido por lei. Não somos 
                responsáveis por danos indiretos, incidentais ou consequenciais decorrentes 
                do uso de nossa plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Modificações dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                As alterações entrarão em vigor após a publicação na plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Rescisão</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos suspender ou encerrar sua conta a qualquer momento, com ou sem 
                causa, mediante aviso. Você também pode encerrar sua conta a qualquer momento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Lei Aplicável</h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será 
                resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas sobre estes Termos de Serviço, entre em contato:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-muted-foreground">
                  E-mail: juridico@controledetrafego.com.br<br />
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

export default TermosServico;