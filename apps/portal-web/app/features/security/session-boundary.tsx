import { Button, Card, makeStyles, MessageBar, MessageBarBody, Spinner, tokens } from "@fluentui/react-components";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useIdentity } from "./identity-context";
import { loginPath } from "./session-navigation";

const useStyles = makeStyles({
  page: {
    display: "grid", alignContent: "center", justifyItems: "center",
    minHeight: "100vh", padding: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  panel: { maxWidth: "480px", gap: tokens.spacingVerticalL, padding: tokens.spacingHorizontalXL },
});

export function SessionBoundary({ children }: { children: ReactNode }) {
  const { identity, loading, unavailable, ended, refresh } = useIdentity();
  const location = useLocation();
  const navigate = useNavigate();
  const styles = useStyles();
  useEffect(() => {
    if (!loading && !identity && !unavailable)
      void navigate(loginPath(location.pathname + location.search + location.hash, ended ?? "expirada"), { replace: true });
  }, [identity, loading, unavailable, ended, location, navigate]);
  if (unavailable) return (
    <main className={styles.page}>
      <Card className={styles.panel}>
        <h1>Não foi possível validar sua sessão</h1>
        <MessageBar intent="error"><MessageBarBody>O serviço de segurança está indisponível. Tente novamente.</MessageBarBody></MessageBar>
        <Button appearance="primary" onClick={() => void refresh()}>Tentar novamente</Button>
      </Card>
    </main>
  );
  if (loading || !identity) return <main className={styles.page}><Spinner label="Validando sua sessão …" /></main>;
  return <>{children}</>;
}
