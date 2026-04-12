import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({
  children,
  noPadding = false,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen w-full bg-background relative">
        <DashboardSidebar />
        <div
          className="min-h-screen flex flex-col ml-[72px]"
          style={{ width: "calc(100% - 72px)" }}
        >
          <DashboardHeader />
          <main className={`flex-1 ${noPadding ? "" : "p-8 bg-muted/30"}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
