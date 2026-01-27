import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export function useUserWhatsAppInstances() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [hasInstances, setHasInstances] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserInstances = async () => {
      if (!user?.id || !activeCompany?.company_id) {
        setHasInstances(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has any WhatsApp instances assigned
        const { count, error } = await supabase
          .from("whatsapp_instance_users")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error checking WhatsApp instances:", error);
          setHasInstances(false);
        } else {
          setHasInstances((count || 0) > 0);
        }
      } catch (error) {
        console.error("Error checking WhatsApp instances:", error);
        setHasInstances(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserInstances();
  }, [user?.id, activeCompany?.company_id]);

  return { hasInstances, isLoading };
}
