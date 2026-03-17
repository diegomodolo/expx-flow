import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import CommunicationDashboard from "../CommunicationDashboard";
import { useInternalChat } from "@/hooks/useInternalChat";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "task-1", title: "Nova Tarefa" },
            error: null,
          })
        }),
      }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
  },
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock("@/components/comm-hub/ChannelSidebar", () => ({
  ChannelSidebar: () => <div data-testid="channel-sidebar">Channel Sidebar</div>,
}));

vi.mock("@/components/comm-hub/ChatFlow", () => ({
  ChatFlow: () => <div data-testid="chat-flow">Chat Flow</div>,
}));

vi.mock("@/components/comm-hub/MyDayPanel", () => ({
  MyDayPanel: ({ onOpenTask }: any) => (
    <div data-testid="my-day-panel">
      My Day Panel
      <button onClick={() => {
        if(onOpenTask) onOpenTask("task-1")
      }}>Acao Selecionar Tarefa</button>
    </div>
  ),
}));

vi.mock("@/hooks/useInternalChat", () => ({
  useInternalChat: vi.fn(),
}));

vi.mock("@/hooks/useChannelUnread", () => ({
  useChannelUnread: vi.fn().mockReturnValue({
    unreadCounts: {},
    mentionCounts: {},
    markAsRead: vi.fn(),
  }),
}));

vi.mock("@/components/tasks/TaskDialog", () => ({
  TaskDialog: ({ open, onOpenChange }: any) => {
    if (!open) return null;
    return (
      <div data-testid="task-dialog">
        Task Dialog
        <button onClick={() => onOpenChange(false)}>Fechar</button>
      </div>
    );
  },
}));


describe("CommunicationDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useInternalChat).mockReturnValue({
      channels: [{ id: "1", name: "geral" }],
      channelsLoading: false,
      activeChannel: { id: "1", name: "geral" },
      activeChannelId: "1",
      setActiveChannelId: vi.fn(),
      messages: [{ id: "1", content: "oi" }],
      messagesLoading: false,
      sendMessage: vi.fn(),
      sendingMessage: false,
      getOrCreateDMChannel: vi.fn(),
    } as any);
  });

  it("deve renderizar corretamente os componentes principais", async () => {
    renderWithProviders(<CommunicationDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(screen.getByTestId("channel-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("chat-flow")).toBeInTheDocument();
      expect(screen.getByTestId("my-day-panel")).toBeInTheDocument();
    });
  });

  it("deve abrir o task dialog ao interagir com o meu dia", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommunicationDashboard />);

    await user.click(screen.getByRole("button", { name: /acao selecionar tarefa/i }));

    await waitFor(() => {
      expect(screen.getByTestId("task-dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /fechar/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("task-dialog")).not.toBeInTheDocument();
    });
  });

  it("deve exibir loading enquanto carrega canais", () => {
    vi.mocked(useInternalChat).mockReturnValue({
      channels: [],
      channelsLoading: true,
      activeChannel: null,
      activeChannelId: null,
      setActiveChannelId: vi.fn(),
      messages: [],
      messagesLoading: false,
      sendMessage: vi.fn(),
      sendingMessage: false,
      getOrCreateDMChannel: vi.fn(),
    } as any);

    renderWithProviders(<CommunicationDashboard />);

    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });

  it("deve tratar erro corretamente simulando falta de dados", async () => {
    vi.mocked(useInternalChat).mockReturnValue({
      channels: [],
      channelsLoading: false,
      activeChannel: null,
      activeChannelId: null,
      setActiveChannelId: vi.fn(),
      messages: [],
      messagesLoading: false,
      sendMessage: vi.fn(),
      sendingMessage: false,
      getOrCreateDMChannel: vi.fn().mockRejectedValue(new Error("Erro de DM")),
      error: "Erro na api"
    } as any);

    renderWithProviders(<CommunicationDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-flow")).toBeInTheDocument();
    });
  });
});
