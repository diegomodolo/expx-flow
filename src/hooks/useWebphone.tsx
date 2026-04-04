import { useEffect, useRef, useState, useCallback } from "react";

export type WebphoneStatus =
  | "disconnected"
  | "connecting"
  | "registered"
  | "ringing"
  | "in-call";

interface SipCredentials {
  domain: string;
  extension: string;
  password: string;
}

interface UseWebphoneReturn {
  status: WebphoneStatus;
  isMuted: boolean;
  answer: () => void;
  hangup: () => void;
  toggleMute: () => void;
}

// Singleton global — impede múltiplas instâncias
let globalWebphoneInstance: InstanceType<typeof window.libwebphone> | null =
  null;

export function useWebphone(
  credentials: SipCredentials | null,
): UseWebphoneReturn {
  const [status, setStatus] = useState<WebphoneStatus>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const currentCallRef = useRef<unknown>(null);

  useEffect(() => {
    if (!credentials || !window.libwebphone) return;
    if (globalWebphoneInstance) return; // já inicializado

    const { domain, extension, password } = credentials;

    setStatus("connecting");

    globalWebphoneInstance = new window.libwebphone({
      userAgent: {
        transport: {
          sockets: [`wss://${domain}:6443`],
          recovery_max_interval: 30,
          recovery_min_interval: 2,
        },
        authentication: {
          username: extension,
          password,
          realm: domain,
        },
        user_agent: {
          instance_id: `expxflow-${extension}-${domain}`,
          no_answer_timeout: 30,
          register: true,
          register_expires: 600,
          user_agent: "expxflow-libwebphone",
        },
      },
    });

    globalWebphoneInstance.on("userAgent.registered", () => {
      setStatus("registered");
    });

    globalWebphoneInstance.on("userAgent.unregistered", () => {
      setStatus("disconnected");
    });

    globalWebphoneInstance.on(
      "call.created",
      (_lwp: unknown, call: unknown) => {
        const c = call as {
          isPrimary: () => boolean;
          isInProgress: () => boolean;
          getCustomHeaders: () => Record<string, string> | null;
          answer: () => void;
          reject: () => void;
        };

        if (!c.isPrimary()) {
          c.reject();
          return;
        }

        currentCallRef.current = c;
        setStatus("ringing");

        // Atende automaticamente chamadas originadas pelo dialer API4Com
        if (c.isInProgress()) {
          const headers = c.getCustomHeaders();
          if (headers?.["X-Api4comintegratedcall"] === "true") {
            c.answer();
            setStatus("in-call");
          }
        }
      },
    );

    globalWebphoneInstance.on("call.terminated", () => {
      currentCallRef.current = null;
      setIsMuted(false);
      setStatus("registered");
    });

    return () => {
      // Não destruir no unmount — singleton deve persistir
    };
  }, [credentials?.domain, credentials?.extension, credentials?.password]);

  const answer = useCallback(() => {
    const call = currentCallRef.current as {
      answer: () => void;
    } | null;
    call?.answer();
    setStatus("in-call");
  }, []);

  const hangup = useCallback(() => {
    const call = currentCallRef.current as {
      hangup: () => void;
    } | null;
    call?.hangup();
    currentCallRef.current = null;
    setStatus("registered");
  }, []);

  const toggleMute = useCallback(() => {
    const call = currentCallRef.current as {
      mute: () => void;
      unmute: () => void;
    } | null;
    if (!call) return;
    if (isMuted) {
      call.unmute();
      setIsMuted(false);
    } else {
      call.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  return { status, isMuted, answer, hangup, toggleMute };
}
