const ExclusaoDados = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Instruções para Exclusão de Dados (LGPD)
            </h1>
            <p className="text-muted-foreground">
              Como solicitar a exclusão dos seus dados pessoais
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Seus Direitos sob a LGPD</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Solicitar a exclusão dos seus dados pessoais</li>
                <li>Revogar o consentimento para tratamento dos dados</li>
                <li>Obter informações sobre quais dados possuímos sobre você</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a portabilidade dos seus dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Como Solicitar a Exclusão</h2>
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-medium text-foreground">Método 1: E-mail</h3>
                <p className="text-muted-foreground">
                  Envie um e-mail para nosso DPO (Encarregado de Proteção de Dados):
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-mono text-sm">dpo@controledetrafego.com.br</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Assunto:</strong> "Solicitação de Exclusão de Dados - LGPD"
                </p>
              </div>

              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-medium text-foreground">Método 2: Através da Plataforma</h3>
                <p className="text-muted-foreground">
                  Se você possui acesso à plataforma:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li>Acesse suas Configurações de Conta</li>
                  <li>Vá para a seção "Privacidade e Dados"</li>
                  <li>Clique em "Solicitar Exclusão de Dados"</li>
                  <li>Confirme sua solicitação</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Informações Necessárias</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para processar sua solicitação, precisaremos das seguintes informações:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Nome completo</li>
                <li>E-mail cadastrado na plataforma</li>
                <li>CPF (para verificação de identidade)</li>
                <li>Nome da empresa (se aplicável)</li>
                <li>Motivo da solicitação (opcional)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Prazo para Exclusão</h2>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Confirmação:</strong> Você receberá uma confirmação em até <strong>24 horas</strong> após o recebimento da solicitação.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  <strong>Exclusão:</strong> A exclusão será processada em até <strong>15 dias úteis</strong> após a confirmação da sua identidade.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Dados que Serão Excluídos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Os seguintes dados serão permanentemente removidos dos nossos sistemas:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Informações de perfil pessoal</li>
                <li>Histórico de atividades na plataforma</li>
                <li>Preferências e configurações</li>
                <li>Dados de comunicação (e-mails, mensagens)</li>
                <li>Arquivos e documentos enviados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Dados que Podem ser Mantidos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Por obrigações legais, alguns dados podem ser mantidos por período determinado:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Dados financeiros (conforme legislação tributária)</li>
                <li>Logs de auditoria e segurança</li>
                <li>Informações necessárias para cumprimento de ordem judicial</li>
                <li>Dados anonimizados para fins estatísticos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Importante</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  ⚠️ <strong>A exclusão de dados é irreversível.</strong> Após a confirmação, não será possível 
                  recuperar suas informações, histórico ou configurações.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  Se você faz parte de uma equipe ou empresa, certifique-se de transferir 
                  responsabilidades antes de solicitar a exclusão.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Dúvidas?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Se você tiver dúvidas sobre o processo de exclusão de dados ou seus direitos sob a LGPD, 
                entre em contato com nosso DPO:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-muted-foreground">
                  <strong>DPO - Encarregado de Proteção de Dados</strong><br />
                  E-mail: dpo@controledetrafego.com.br<br />
                  Telefone: [Telefone para contato]<br />
                  Horário de atendimento: Segunda a sexta, 9h às 18h
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Recursos Adicionais</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para mais informações sobre seus direitos sob a LGPD:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Autoridade Nacional de Proteção de Dados (ANPD): anpd.gov.br</li>
                <li>Nossa Política de Privacidade completa</li>
                <li>Central de Ajuda sobre Privacidade</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExclusaoDados;