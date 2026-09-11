import {
  createDOMRenderer,
  RendererProvider,
  SSRProvider,
} from "@fluentui/react-components";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

const renderer = createDOMRenderer();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RendererProvider renderer={renderer}>
        <SSRProvider>
          <HydratedRouter />
        </SSRProvider>
      </RendererProvider>
    </StrictMode>,
  );
});
