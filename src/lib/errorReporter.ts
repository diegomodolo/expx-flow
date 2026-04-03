import { supabase } from "@/integrations/supabase/client";

const MAX_REPORTS_PER_SESSION = 5;
const DEBOUNCE_MS = 5000;
const REPORTED_ERRORS_KEY = "expx_reported_errors";

let reportCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingErrors: Array<{
  message: string;
  stack: string | null;
  componentStack?: string | null;
}> = [];

function getReportedFingerprints(): Set<string> {
  try {
    const stored = sessionStorage.getItem(REPORTED_ERRORS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function addReportedFingerprint(fp: string) {
  try {
    const set = getReportedFingerprints();
    set.add(fp);
    sessionStorage.setItem(REPORTED_ERRORS_KEY, JSON.stringify([...set]));
  } catch {
    // silently ignore storage errors
  }
}

function generateFingerprint(message: string, stack: string | null): string {
  const stackLines = (stack || "").split("\n").slice(0, 3).join("\n");
  const raw = `${message}|||${stackLines}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function isIgnoredError(message: string): boolean {
  const ignored = [
    "ResizeObserver loop",
    "Script error.",
    "Non-Error promise rejection",
    "Loading chunk",
    "Failed to fetch",
    "Failed to send a request to the Edge Function",
    "FunctionsFetchError",
    "NO_API_KEY",
    "Chave OpenRouter não configurada",
    "Load failed",
    "NetworkError",
    "AbortError",
    "Lock broken",
    "was released because another request stole it",
    "navigatorLock",
    "lockAcquireTimeout",
    "cancelled",
    "net::ERR_",
    "ChunkLoadError",
    "Refresh Token",
    "AuthApiError",
    "AuthRetryableFetchError",
    "Failed to execute 'insertBefore'",
    "Failed to execute 'removeChild'",
    "The node before which the new node is to be inserted",
    "The node to be removed is not a child",
    "The object exceeded the maximum allowed size",
    "The connection to the database timed out",
    "404 Error: User attempted to access non-existent route",
    "HTTP 400 error",
    "Error downloading file",
    "Error uploading file",
    "Upload error",
    "[WhatsAppReactionPicker] Error",
    "[useWhatsAppMediaCache] Upload error",
  ];
  return ignored.some((pattern) => message.includes(pattern));
}

async function sendReport(error: {
  message: string;
  stack: string | null;
  componentStack?: string | null;
}) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  if (isIgnoredError(error.message)) return;

  const fingerprint = generateFingerprint(error.message, error.stack);
  const reported = getReportedFingerprints();
  if (reported.has(fingerprint)) return;

  reportCount++;
  addReportedFingerprint(fingerprint);

  try {
    await supabase.functions.invoke("auto-report-error", {
      body: {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        componentStack: error.componentStack || null,
      },
    });
  } catch {
    // Silently fail — we don't want error reporting to cause more errors
  }
}

function processPendingErrors() {
  const next = pendingErrors.shift();
  if (next) {
    sendReport(next);
  }
}

function queueError(
  message: string,
  stack: string | null,
  componentStack?: string | null,
) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  if (isIgnoredError(message)) return;

  pendingErrors.push({ message, stack, componentStack });

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processPendingErrors, DEBOUNCE_MS);
}

export function initErrorReporter() {
  // Intercept window.onerror (uncaught errors)
  const originalOnError = window.onerror;
  window.onerror = (message, _source, _lineno, _colno, error) => {
    const msg = typeof message === "string" ? message : String(message);
    queueError(msg, error?.stack || null);
    if (originalOnError) {
      return originalOnError.call(
        window,
        message,
        _source,
        _lineno,
        _colno,
        error,
      );
    }
    return false;
  };

  // Intercept unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    let message: string;
    let stack: string | null = null;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || null;
    } else if (error !== null && typeof error === "object") {
      // Handle non-Error objects like Supabase PostgrestError { message, code, details, hint }
      const errObj = error as {
        message?: string;
        code?: string;
        details?: string;
      };
      if (errObj.message) {
        message = errObj.message;
        if (errObj.code) message += ` (code: ${errObj.code})`;
        if (errObj.details) message += ` — ${errObj.details}`;
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          message = String(error);
        }
      }
    } else {
      message = String(error);
    }

    queueError(message, stack);
  });

  // Intercept console.error
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);

    // Extract error info from arguments
    const firstArg = args[0];
    let message = "";
    let stack: string | null = null;

    if (firstArg instanceof Error) {
      message = firstArg.message;
      stack = firstArg.stack || null;
    } else if (typeof firstArg === "string") {
      message = firstArg;
      // Check if second arg has error info
      const secondArg = args[1];
      if (secondArg instanceof Error) {
        message = `${message}: ${secondArg.message}`;
        stack = secondArg.stack || null;
      } else if (
        secondArg !== null &&
        secondArg !== undefined &&
        typeof secondArg === "object"
      ) {
        // Handle Supabase PostgrestError and similar non-Error objects with message property
        const errObj = secondArg as {
          message?: string;
          code?: string;
          details?: string;
        };
        if (errObj.message) {
          message = `${message}: ${errObj.message}`;
          if (errObj.code) message += ` (code: ${errObj.code})`;
        }
      }
    } else {
      message = args
        .map((a) => {
          try {
            return typeof a === "object" ? JSON.stringify(a) : String(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
    }

    if (message) {
      queueError(message, stack);
    }
  };
}

// Export for React ErrorBoundary integration
export function reportComponentError(
  error: Error,
  componentStack: string | null,
) {
  queueError(error.message, error.stack || null, componentStack);
}
