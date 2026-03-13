import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import CommunicationDashboard from "../CommunicationDashboard";

// Mock das dependências internas
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/components/comm-hub/ChannelSidebar", () => ({
  ChannelSidebar: ({ loading }: { loading: boolean }) => (
    <div data-testid="channel-sidebar">
      {loading ? "carregando canais..." : "Canais"}
    </div>
  ),
}));

vi.mock("@/components/comm-hub/ChatFlow", () => ({
  ChatFlow: ({ loading }: { loading: boolean }) => (
    <div data-testid="chat-flow">
      {loading ? "carregando mensagens..." : "Mensagens"}
    </div>
  ),
}));

vi.mock("@/components/comm-hub/MyDayPanel", () => ({
  MyDayPanel: ({ onOpenDM }: { onOpenDM: any }) => (
    <div data-testid="my-day-panel">
      My Day Panel
      <button onClick={() => onOpenDM("user-2", "Test User 2")}>abrir DM</button>
    </div>
  ),
}));

vi.mock("@/components/tasks/TaskDialog", () => ({
  TaskDialog: ({ open, onSave }: { open: boolean, onSave: any }) => (
    open ? (
      <div data-testid="task-dialog">
        Task Dialog Content
        <button onClick={onSave}>Salvar Tarefa</button>
      </div>
    ) : null
  ),
}));

// Mock do hook useInternalChat
vi.mock("@/hooks/useInternalChat", () => {
  const mockGetOrCreateDMChannel = vi.fn().mockResolvedValue("channel-123");
  const mockSendMessage = vi.fn();

  return {
    useInternalChat: vi.fn().mockReturnValue({
      channels: [{ id: "c1", name: "general" }],
      channelsLoading: false,
      activeChannel: { id: "c1", name: "general" },
      activeChannelId: "c1",
      setActiveChannelId: vi.fn(),
      messages: [{ id: "m1", content: "Olá" }],
      messagesLoading: false,
      sendMessage: mockSendMessage,
      sendingMessage: false,
      getOrCreateDMChannel: mockGetOrCreateDMChannel,
    }),
  };
});

// Mock do hook useChannelUnread
vi.mock("@/hooks/useChannelUnread", () => ({
  useChannelUnread: vi.fn().mockReturnValue({
    unreadCounts: { c1: 0 },
    mentionCounts: { c1: 0 },
    markAsRead: vi.fn(),
  }),
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "task-1", title: "Tarefa Teste" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

// Mock Sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("CommunicationDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("deve renderizar corretamente todos os componentes principais", () => {
    renderWithProviders(<CommunicationDashboard />);
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByTestId("channel-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-flow")).toBeInTheDocument();
    expect(screen.getByTestId("my-day-panel")).toBeInTheDocument();
  });

  it("deve exibir loading enquanto carrega canais", async () => {
    const useInternalChat = await import("@/hooks/useInternalChat");
    vi.mocked(useInternalChat.useInternalChat).mockReturnValueOnce({
      channels: [],
      channelsLoading: true, // Simula loading de canais
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
    expect(screen.getByText(/carregando canais\.\.\./i)).toBeInTheDocument();
  });

  it("deve tentar abrir uma DM e definir o canal ativo", async () => {
    const user = userEvent.setup();
    const useInternalChat = await import("@/hooks/useInternalChat");
    const mockSetActiveChannelId = vi.fn();
    const mockGetOrCreateDMChannelLocal = vi.fn().mockResolvedValue("channel-123");

    vi.mocked(useInternalChat.useInternalChat).mockReturnValueOnce({
      channels: [],
      channelsLoading: false,
      activeChannel: null,
      activeChannelId: null,
      setActiveChannelId: mockSetActiveChannelId,
      messages: [],
      messagesLoading: false,
      sendMessage: vi.fn(),
      sendingMessage: false,
      getOrCreateDMChannel: mockGetOrCreateDMChannelLocal,
    } as any);

    renderWithProviders(<CommunicationDashboard />);

    // Clica no botão simulado do painel MyDayPanel que abre a DM
    await user.click(screen.getByRole("button", { name: /abrir DM/i }));

    await waitFor(() => {
      expect(mockGetOrCreateDMChannelLocal).toHaveBeenCalledWith("user-2", "Test User 2");
      expect(mockSetActiveChannelId).toHaveBeenCalledWith("channel-123"); // Retorno mockado
    });
  });

  it("deve tratar erro ao abrir a DM", async () => {
    const user = userEvent.setup();
    const useInternalChat = await import("@/hooks/useInternalChat");
    const mockGetOrCreateDMChannelError = vi.fn().mockResolvedValue(null); // falha
    const { toast } = await import("sonner");

    vi.mocked(useInternalChat.useInternalChat).mockReturnValueOnce({
      channels: [],
      channelsLoading: false,
      activeChannel: null,
      activeChannelId: null,
      setActiveChannelId: vi.fn(),
      messages: [],
      messagesLoading: false,
      sendMessage: vi.fn(),
      sendingMessage: false,
      getOrCreateDMChannel: mockGetOrCreateDMChannelError,
    } as any);

    renderWithProviders(<CommunicationDashboard />);
    await user.click(screen.getByRole("button", { name: /abrir DM/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Não foi possível abrir a conversa");
    });
  });
});
