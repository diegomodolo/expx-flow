import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { GoogleMeetIntegrationCard } from "@/components/google/GoogleMeetIntegrationCard";

export default function GoogleMeetIntegrationSettings() {
  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Meet & Drive</h1>
          <p className="text-muted-foreground">
            Conecte uma conta Google para criar reuniões no Meet e acessar transcrições automaticamente.
          </p>
        </div>
        <GoogleMeetIntegrationCard />
      </div>
    </SettingsLayout>
  );
}
