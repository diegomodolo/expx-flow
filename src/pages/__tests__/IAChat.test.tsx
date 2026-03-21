import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import IAChat from "../IAChat";
import { useAIChat } from "@/hooks/useAIChat";

// Mock do DashboardLayout
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock do hook de IA
vi.mock("@/hooks/useAIChat", () => ({
  useAIChat: vi.fn().mockReturnValue({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    createConversation: vi.fn(),
    sendMessage: vi.fn(),
    loadConversation: vi.fn(),
    deleteConversation: vi.fn(),
  }),
}));

// Mock do CompanyContext
vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: vi.fn().mockReturnValue({
    activeCompany: { company_id: "company-1", name: "Empresa Teste" },
  }),
}));

// Mocks dos componentes internos
vi.mock("@/components/ai-chat/ChatSidebar", () => ({
  ChatSidebar: ({ onClientSelect }: any) => (
    <div data-testid="chat-sidebar">
      Sidebar Mock
      <button onClick={() => onClientSelect("client-123")}>
        Selecionar Cliente
      </button>
    </div>
  ),
}));

vi.mock("@/components/ai-chat/ChatMessages", () => ({
  ChatMessages: ({ loading }: any) => (
    <div data-testid="chat-messages">{loading ? "Carregando..." : "Mensagens"}</div>
  ),
}));

vi.mock("@/components/ai-chat/ChatInput", () => ({
  ChatInput: ({ onSendMessage, disabled }: any) => (
    <div data-testid="chat-input">
      Input Mock
      <button disabled={disabled} onClick={() => onSendMessage("Nova mensagem")}>
        Enviar
      </button>
    </div>
  ),
}));

vi.mock("@/components/ai-chat/QuickActionsPanel", () => ({
  QuickActionsPanel: () => <div data-testid="quick-actions-panel">Quick Actions Mock</div>,
}));

describe("IAChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar a tela inicial com layout correto", () => {
    renderWithProviders(<IAChat />);

    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("quick-actions-panel")).toBeInTheDocument();
    expect(screen.getByText("Selecione um cliente")).toBeInTheDocument();
  });

  it("deve selecionar um cliente e mostrar interface do chat", async () => {
    const mockCreateConversation = vi.fn();

    vi.mocked(useAIChat).mockReturnValue({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      createConversation: mockCreateConversation,
      sendMessage: vi.fn(),
      loadConversation: vi.fn(),
      deleteConversation: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderWithProviders(<IAChat />);

    await user.click(screen.getByRole("button", { name: /selecionar cliente/i }));

    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalledWith("client-123");
    });

    expect(screen.getByTestId("chat-messages")).toBeInTheDocument();
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  it("deve desabilitar input caso não haja currentConversation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IAChat />);

    // Seleciona cliente para abrir a tela, mas sem conversation
    await user.click(screen.getByRole("button", { name: /selecionar cliente/i }));

    const sendButton = screen.getByRole("button", { name: /enviar/i });
    expect(sendButton).toBeDisabled();
  });

  it("deve chamar sendMessage quando houver input válido e conversa ativa", async () => {
    const mockSendMessage = vi.fn();

    vi.mocked(useAIChat).mockReturnValue({
      conversations: [],
      currentConversation: { id: "conv-1" },
      messages: [],
      loading: false,
      createConversation: vi.fn(),
      sendMessage: mockSendMessage,
      loadConversation: vi.fn(),
      deleteConversation: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderWithProviders(<IAChat />);

    // Seleciona cliente para abrir a tela
    await user.click(screen.getByRole("button", { name: /selecionar cliente/i }));

    const sendButton = screen.getByRole("button", { name: /enviar/i });
    expect(sendButton).not.toBeDisabled();

    await user.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("Nova mensagem");
    });
  });
});
