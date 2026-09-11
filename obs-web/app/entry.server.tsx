import {
  createDOMRenderer,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
} from "@fluentui/react-components";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { Transform } from "node:stream";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import {
  renderToPipeableStream,
  renderToStaticMarkup,
} from "react-dom/server";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";

export const streamTimeout = 5_000;

const insertionPoint =
  '<meta name="fluentui-insertion-point" content="fluentui-insertion-point"/>';
const insertionPointPattern = new RegExp(
  insertionPoint.replaceAll(" ", "(\\s)*"),
);

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const renderer = createDOMRenderer();
    const userAgent = request.headers.get("user-agent");
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    let timeoutId = setTimeout(() => abort(), streamTimeout + 1_000);

    const { pipe, abort } = renderToPipeableStream(
      <RendererProvider renderer={renderer}>
        <SSRProvider>
          <ServerRouter
            context={routerContext}
            url={request.url}
          />
        </SSRProvider>
      </RendererProvider>,
      {
        [readyOption]() {
          shellRendered = true;
          let stylesInjected = false;
          const body = new Transform({
            transform(chunk, _encoding, callback) {
              let html = chunk.toString();
              if (!stylesInjected && insertionPointPattern.test(html)) {
                const styles = renderToStaticMarkup(
                  <>{renderToStyleElements(renderer)}</>,
                );
                html = html.replace(
                  insertionPointPattern,
                  `${insertionPoint}${styles}`,
                );
                stylesInjected = true;
              }
              callback(null, html);
            },
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined as unknown as NodeJS.Timeout;
              callback();
            },
          });

          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
  });
}
