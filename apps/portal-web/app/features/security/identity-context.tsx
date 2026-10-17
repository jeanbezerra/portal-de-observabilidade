import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Identity } from "./security-model";
import { currentIdentity, IdentityServiceError, logout } from "./identity-client";
import { monitorSession, sessionDeadline } from "./session-monitor";

const IdentityContext = createContext<{
  identity: Identity | null;
  loading: boolean;
  unavailable: boolean;
  ended: "expirada" | "encerrada" | null;
  refresh: () => Promise<boolean>;
  signOut: () => Promise<void>;
  endSession: () => void;
}>({
  identity: null,
  loading: true,
  unavailable: false,
  ended: null,
  refresh: async () => false,
  signOut: async () => {},
  endSession: () => {},
});

export function IdentityProvider({ children, initialIdentity }: {
  children: ReactNode;
  initialIdentity?: Identity;
}) {
  const [identity, setIdentity] = useState<Identity | null>(initialIdentity ?? null);
  const [loading, setLoading] = useState(!initialIdentity);
  const [unavailable, setUnavailable] = useState(false);
  const [ended, setEnded] = useState<"expirada" | "encerrada" | null>(null);
  const deadline = useRef<number | null>(sessionDeadline(initialIdentity?.session));
  const generation = useRef(0);
  const endedRef = useRef(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const finish = useCallback((reason: "expirada" | "encerrada") => {
    generation.current++;
    endedRef.current = true;
    pending.current = null;
    deadline.current = null;
    setIdentity(null);
    setEnded(reason);
    setUnavailable(false);
    setLoading(false);
  }, []);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    const version = generation.current;
    const result = (async () => {
      try {
        const next = await currentIdentity();
        if (version !== generation.current) return false;
        deadline.current = sessionDeadline(next.session);
        endedRef.current = false;
        setIdentity(next);
        setEnded(null);
        setUnavailable(false);
        channel.current?.postMessage({ type: "validated", deadline: deadline.current });
        return true;
      } catch (error) {
        if (version !== generation.current) return false;
        if (error instanceof IdentityServiceError && error.status === 401)
          finish("expirada");
        else setUnavailable(true);
        return false;
      } finally {
        if (version === generation.current) {
          setLoading(false);
          pending.current = null;
        }
      }
    })();
    pending.current = result;
    return result;
  }, [finish]);
  useEffect(() => {
    if (initialIdentity) {
      if (endedRef.current) return;
      generation.current++;
      pending.current = null;
      deadline.current = sessionDeadline(initialIdentity.session);
      setIdentity(initialIdentity);
      setUnavailable(false);
      setEnded(null);
      setLoading(false);
    } else void refresh();
  }, [initialIdentity, refresh]);
  useEffect(() => {
    const onAccessResponse = (event: Event) => {
      if ((event as CustomEvent<number>).detail === 401) finish("expirada");
      else void refresh();
    };
    window.addEventListener("identity-access-response", onAccessResponse);
    return () => window.removeEventListener("identity-access-response", onAccessResponse);
  }, [finish, refresh]);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const connection = new BroadcastChannel("portal-identity-session");
    channel.current = connection;
    connection.onmessage = (event) => {
      if (event.data?.type === "signed-out") finish("encerrada");
      else if (event.data?.type === "signed-in") void refresh();
      else if (event.data?.type === "validated" && Number.isFinite(event.data.deadline))
        deadline.current = event.data.deadline;
    };
    return () => {
      channel.current = null;
      connection.close();
    };
  }, [finish, refresh]);
  useEffect(() => {
    if (!identity) return;
    return monitorSession({
      deadline: () => deadline.current,
      validate: refresh,
      expire: () => finish("expirada"),
    });
  }, [!!identity, finish, refresh]);
  const endSession = useCallback(() => {
    finish("encerrada");
    channel.current?.postMessage({ type: "signed-out" });
  }, [finish]);
  const signOut = useCallback(async () => {
    generation.current++;
    pending.current = null;
    try {
      await logout();
    } catch (error) {
      if (!(error instanceof IdentityServiceError && error.status === 401)) throw error;
    }
    endSession();
  }, [endSession]);
  return (
    <IdentityContext.Provider value={{ identity, loading, unavailable, ended, refresh, signOut, endSession }}>
      {children}
    </IdentityContext.Provider>
  );
}
export const useIdentity = () => useContext(IdentityContext);
