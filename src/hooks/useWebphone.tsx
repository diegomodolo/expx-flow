 
// @ts-ignore
import * as Libwebphone from "@/lib/libwebphone";
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
 
let globalWebphoneInstance: any = null;

export function useWebphone(
  credentials: SipCredentials | null,
): UseWebphoneReturn {
  const [status, setStatus] = useState<WebphoneStatus>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const currentCallRef = useRef<unknown>(null);

  useEffect(() => {
    if (!credentials) {
      console.log("[useWebphone] sem credenciais");
      return;
    }
    if (globalWebphoneInstance) {
      console.log("[useWebphone] instância já existe, status atual:", status);
      return;
    }

    const { domain, extension, password } = credentials;
    console.log(`[useWebphone] iniciando SIP: ${extension}@${domain}`);

    setStatus("connecting");

    // CommonJS module — pode estar em .default ou direto
     
    const LWP = (Libwebphone as any).default || Libwebphone;
    globalWebphoneInstance = new LWP({
      userAgent: {
        renderTargets: [],
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

    globalWebphoneInstance.on("userAgent.registration.registered", () => {
      console.log("[useWebphone] SIP registrado!");
      setStatus("registered");
    });

    globalWebphoneInstance.on("userAgent.registration.failed", () => {
      console.log("[useWebphone] SIP falhou ao registrar");
      setStatus("disconnected");
    });

    globalWebphoneInstance.on("userAgent.registration.unregistered", () => {
      console.log("[useWebphone] SIP desregistrado");
      setStatus("disconnected");
    });

    globalWebphoneInstance.on("userAgent.connected", () => {
      console.log("[useWebphone] WSS conectado");
    });

    globalWebphoneInstance.on("userAgent.disconnected", () => {
      console.log("[useWebphone] WSS desconectado");
      setStatus("disconnected");
    });

    globalWebphoneInstance.onAny((event: string) => {
      console.log("[useWebphone] evento:", event);
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

        if (c.isInProgress()) {
          const headers = c.getCustomHeaders();
          if (headers?.["X-Api4comintegratedcall"] === "true") {
            c.answer();
            setStatus("in-call");
          }
        }
      },
    );

    globalWebphoneInstance.on("call.ended", () => {
      currentCallRef.current = null;
      setIsMuted(false);
      setStatus("registered");
    });

    return () => {
      // Não destruir no unmount — singleton deve persistir
    };
  }, [credentials?.domain, credentials?.extension, credentials?.password]);

  const answer = useCallback(() => {
    const call = currentCallRef.current as { answer: () => void } | null;
    call?.answer();
    setStatus("in-call");
  }, []);

  const hangup = useCallback(() => {
    const call = currentCallRef.current as { hangup: () => void } | null;
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
