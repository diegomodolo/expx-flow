import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background">
        <DashboardSidebar />
        <DashboardHeader />
        <main className="ml-16 pt-16 p-6 min-h-screen">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}