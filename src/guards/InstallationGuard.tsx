import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getCachedInstallationStatus,
  setCachedInstallationStatus,
  type InstallationStatus,
} from "@/guards/installationStatusCache";

interface InstallationGuardProps {
  children: React.ReactNode;
}

export function InstallationGuard({ children }: InstallationGuardProps) {
  const location = useLocation();
  const [status, setStatus] = useState<InstallationStatus | null>(
    getCachedInstallationStatus,
  );

  useEffect(() => {
    if (getCachedInstallationStatus() !== null) {
      return;
    }

    let active = true;
    fetch("/api/installer/status")
      .then((response) => response.json())
      .then((data: InstallationStatus) => {
        if (!active) return;
        setCachedInstallationStatus(data);
        setStatus(data);
      })
      .catch(() => {
        if (!active) return;
        const fallback: InstallationStatus = { configured: true };
        setCachedInstallationStatus(fallback);
        setStatus(fallback);
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          data-testid="installation-guard-loading"
          role="status"
          aria-label="Verificando instalação"
          className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (!status.configured && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (status.configured && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
