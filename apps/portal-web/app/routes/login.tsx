import { Button, Card, Field, Input, mergeClasses, Select, Spinner } from "@fluentui/react-components";
import { ArrowRightRegular, EyeOffRegular, EyeRegular, LockClosedRegular, PauseRegular, PersonRegular, PlayRegular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { redirect, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { IdentityProvider, useIdentity } from "../features/security/identity-context";
import { readPortalIdentity } from "../features/security/portal-session.server";
import { safeReturnPath } from "../features/security/session-navigation";
import { useLoginStyles } from "../features/security/login-appearance";
import {
  discoverProviders,
  errorMessage,
  login,
} from "../features/security/identity-client";
import type { DiscoveredProvider } from "../features/security/security-model";
import { Notice } from "../features/security/security-ui";

export const meta = () => [{ title: "Entrar | Portal de Observabilidade" }];
export async function loader({ request }: Route.LoaderArgs) {
  const session = await readPortalIdentity(request);
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  for (const cookie of session.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  if (session.ok) throw redirect(safeReturnPath(new URL(request.url).searchParams.get("retorno")), { headers });
  return new Response(null, { status: 200, headers });
}
export const headers: Route.HeadersFunction = () => ({ "Cache-Control": "no-store", Vary: "Cookie" });

export default function Login() {
  return <IdentityProvider><LoginForm /></IdentityProvider>;
}
function LoginForm() {
  const loginStyles = useLoginStyles();
  const { identity, refresh } = useIdentity();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [providers, setProviders] = useState<DiscoveredProvider[]>([]);
  const [provider, setProvider] = useState("local");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    void discoverProviders()
      .then(setProviders)
      .catch((reason) => setError(errorMessage(reason)));
  }, []);
  const safeDestination = safeReturnPath(search.get("retorno"));
  const selected = providers.find((item) => item.id === provider);
  return (
    <main className={loginStyles.page}>
      <Card className={loginStyles.frame} aria-labelledby="login-title">
        <div className={loginStyles.visual}>
          <img
            className={loginStyles.image}
            src="/images/login-porto.webp"
            alt=""
            width={900}
            height={1595}
            fetchPriority="high"
            draggable={false}
          />
          <div className={loginStyles.veil} aria-hidden="true" />
          <div className={mergeClasses(loginStyles.glow, motionPaused && loginStyles.paused)} aria-hidden="true" />
          <div className={mergeClasses(loginStyles.orbit, motionPaused && loginStyles.paused)} aria-hidden="true" />
          <div className={mergeClasses(loginStyles.orbit, loginStyles.orbitInner, motionPaused && loginStyles.paused)} aria-hidden="true" />
          <Button
            className={loginStyles.motionControl}
            type="button"
            size="small"
            icon={motionPaused ? <PlayRegular /> : <PauseRegular />}
            onClick={() => setMotionPaused((paused) => !paused)}
          >
            {motionPaused ? "Retomar animações" : "Pausar animações"}
          </Button>
        </div>
        <section className={loginStyles.panel} aria-labelledby="login-title">
          <div className={loginStyles.content}>
            <header className={loginStyles.introduction}>
              <img className={loginStyles.logo} src="/porto.svg" alt="Porto" width={138} height={32} />
              <span className={loginStyles.accent} aria-hidden="true" />
              <h1 id="login-title" className={loginStyles.title}>Portal de Observabilidade</h1>
              <p className={loginStyles.lead}>
                Entre com seu usuário e senha para acessar o portal.
              </p>
            </header>
        {search.get("sessao") === "expirada" && <Notice intent="info" message="Sua sessão expirou ou foi revogada. Entre novamente para continuar." />}
        {search.get("sessao") === "encerrada" && <Notice intent="success" message="Sua sessão foi encerrada." />}
        {error && <div ref={errorRef} tabIndex={-1}><Notice message={error} /></div>}
        {identity ? (
          <div className={loginStyles.fields}>
            <p>Você está conectado como {identity.displayName}.</p>
            <Button appearance="primary" as="a" href={safeDestination}>
              Continuar
            </Button>
          </div>
        ) : (
          <form
            method="post"
            className={loginStyles.form}
            aria-busy={busy}
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setBusy(true);
              try {
                if (selected?.interaction === "REDIRECT") {
                  window.location.assign(
                    "/api/identity/api/v1/auth/login/" +
                      encodeURIComponent(provider),
                  );
                  return;
                }
                await login(provider, username, password);
                setPassword("");
                if (!(await refresh())) {
                  setError("Não foi possível confirmar sua sessão. Tente entrar novamente.");
                  return;
                }
                if (typeof BroadcastChannel !== "undefined") {
                  const channel = new BroadcastChannel("portal-identity-session");
                  channel.postMessage({ type: "signed-in" });
                  channel.close();
                }
                await navigate(safeDestination, { replace: true });
              } catch (reason) {
                setError(errorMessage(reason));
              } finally {
                setPassword("");
                setBusy(false);
              }
            }}
          >
            {providers.length > 0 && (
              <Field label="Forma de acesso">
                <Select
                  value={provider}
                  disabled={busy}
                  onChange={(_, state) => setProvider(state.value)}
                >
                  <option value="local">Conta local</option>
                  {providers.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.type === "OIDC"}
                    >
                      {item.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {selected?.interaction !== "REDIRECT" && (
              <div className={loginStyles.fields}>
                <Field label="Usuário" required>
                  <Input
                    required
                    className={loginStyles.input}
                    size="large"
                    contentBefore={<PersonRegular className={loginStyles.inputIcon} aria-hidden="true" />}
                    name="username"
                    disabled={busy}
                    value={username}
                    autoComplete="username"
                    maxLength={255}
                    onChange={(_, state) => setUsername(state.value)}
                  />
                </Field>
                <Field label="Senha" required>
                  <Input
                    required
                    className={loginStyles.input}
                    size="large"
                    contentBefore={<LockClosedRegular className={loginStyles.inputIcon} aria-hidden="true" />}
                    contentAfter={
                      <Button
                        type="button"
                        appearance="transparent"
                        size="small"
                        className={loginStyles.passwordToggle}
                        icon={showPassword ? <EyeOffRegular /> : <EyeRegular />}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        disabled={busy}
                        onClick={() => setShowPassword((visible) => !visible)}
                      />
                    }
                    name="password"
                    disabled={busy}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    maxLength={1024}
                    onChange={(_, state) => setPassword(state.value)}
                  />
                </Field>
              </div>
            )}
            <div>
              <Button
                className={loginStyles.submit}
                type="submit"
                appearance="primary"
                size="large"
                iconPosition="after"
                icon={busy ? <Spinner size="tiny" appearance="inverted" aria-hidden="true" /> : <ArrowRightRegular />}
                disabled={busy}
              >
                {busy
                  ? "Entrando…"
                  : selected?.interaction === "REDIRECT"
                    ? "Continuar com " + selected.displayName
                    : "Entrar"}
              </Button>
            </div>
          </form>
        )}
          </div>
        </section>
      </Card>
    </main>
  );
}
