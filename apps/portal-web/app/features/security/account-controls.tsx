import { Avatar, Button, makeStyles, tokens } from "@fluentui/react-components";
import { useState } from "react";
import { useIdentity } from "./identity-context";
import { errorMessage } from "./identity-client";

const useStyles = makeStyles({
  account: {
    minWidth: "44px",
    minHeight: "44px",
    columnGap: tokens.spacingHorizontalS,
  },
  avatarIcon: { width: "32px", height: "32px", flexShrink: 0 },
  name: {
    minWidth: 0,
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    "@media (max-width: 760px)": { display: "none" },
  },
  signOut: { minHeight: "44px" },
  error: {
    maxWidth: "180px",
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

export function AccountControls() {
  const styles = useStyles();
  const { identity, loading, signOut } = useIdentity();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <Button disabled>Carregando sessão</Button>;
  if (!identity)
    return (
      <Button as="a" href="/entrar" appearance="primary">
        Entrar
      </Button>
    );
  return (
    <>
      <Button
        className={styles.account}
        as="a"
        href="/seguranca/minha-conta"
        appearance="subtle"
        aria-label={identity.displayName + ": minha conta"}
        icon={{
          className: styles.avatarIcon,
          children: (
            <Avatar
              name={identity.displayName}
              color="brand"
              aria-hidden="true"
            />
          ),
        }}
      >
        <span className={styles.name} title={identity.displayName}>
          {identity.displayName}
        </span>
      </Button>
      <Button
        className={styles.signOut}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signOut();
          } catch (reason) {
            setError(errorMessage(reason));
          } finally {
            setBusy(false);
          }
        }}
      >
        Sair
      </Button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </>
  );
}
