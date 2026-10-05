import {
  Button,
  FluentProvider,
  makeStyles,
  MessageBar,
  MessageBarBody,
  tokens,
  webLightTheme,
} from "@fluentui/react-components";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { PortalShell } from "./components/portal-shell";
import "./app.css";

const portoTheme = {
  ...webLightTheme,
  fontFamilyBase:
    '"Open Sans", "Open Sans Fallback", Arial, sans-serif',
};

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    href: "/favicon.ico",
    type: "image/vnd.microsoft.icon",
    sizes: "48x48",
  },
  {
    rel: "preload",
    href: "/fonts/open-sans-latin-variable.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/porto-roobert-variable.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="fluentui-insertion-point"
          content="fluentui-insertion-point"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <FluentProvider theme={portoTheme} style={{ minHeight: "100vh" }}>
          {children}
        </FluentProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}

const useErrorStyles = makeStyles({
  page: {
    display: "grid",
    alignItems: "center",
    minHeight: "100vh",
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  panel: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    width: "min(640px, 100%)",
    margin: "0 auto",
    padding: tokens.spacingHorizontalXXL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow8,
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
  },
  details: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  stack: {
    maxWidth: "100%",
    overflowX: "auto",
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const styles = useErrorStyles();
  let message = "Não foi possível abrir esta página";
  let details = "Ocorreu um erro inesperado. Tente novamente.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Página não encontrada" : "Erro na página";
    details =
      error.status === 404
        ? "O endereço informado não existe no portal."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="error-title">
        <h1 id="error-title" className={styles.title}>
          {message}
        </h1>
        <MessageBar intent="error">
          <MessageBarBody>{details}</MessageBarBody>
        </MessageBar>
        {stack ? (
          <pre className={styles.stack}>
            <code>{stack}</code>
          </pre>
        ) : null}
        <div>
          <Button as="a" href="/" appearance="primary">
            Voltar ao início
          </Button>
        </div>
      </section>
    </main>
  );
}
