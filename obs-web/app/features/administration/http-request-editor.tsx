import {
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";

import type {
  HttpAuthentication,
  HttpRequestConfiguration,
  HttpRequestParameter,
} from "./scheduled-jobs-model";

export type HttpRequestDraft = {
  method: HttpRequestConfiguration["method"];
  url: string;
  queryParameters: string;
  headers: string;
  cookies: string;
  authenticationType: HttpAuthentication["type"];
  username: string;
  passwordSecretRef: string;
  tokenSecretRef: string;
  apiKeyName: string;
  apiKeyLocation: HttpAuthentication["apiKeyLocation"];
  tokenUrl: string;
  clientId: string;
  clientSecretRef: string;
  scopes: string;
  audience: string;
  clientAuthenticationMethod: HttpAuthentication["clientAuthenticationMethod"];
  tokenParameters: string;
  bodyType: HttpRequestConfiguration["bodyType"];
  body: string;
  formParameters: string;
  contentType: string;
  connectTimeoutSeconds: string;
  requestTimeoutSeconds: string;
  redirectPolicy: HttpRequestConfiguration["redirectPolicy"];
  httpVersion: HttpRequestConfiguration["httpVersion"];
  expectedStatusCodes: string;
  maxResponseBytes: string;
  maxAttempts: string;
  initialDelayMillis: string;
  backoffMultiplier: string;
  retryStatusCodes: string;
};

export const initialHttpRequestDraft: HttpRequestDraft = {
  method: "POST",
  url: "",
  queryParameters: "{}",
  headers: '{\n  "Accept": "application/json"\n}',
  cookies: "{}",
  authenticationType: "NONE",
  username: "",
  passwordSecretRef: "",
  tokenSecretRef: "",
  apiKeyName: "X-API-Key",
  apiKeyLocation: "HEADER",
  tokenUrl: "",
  clientId: "",
  clientSecretRef: "",
  scopes: "",
  audience: "",
  clientAuthenticationMethod: "BASIC",
  tokenParameters: "{}",
  bodyType: "JSON",
  body: "{}",
  formParameters: "{}",
  contentType: "application/json",
  connectTimeoutSeconds: "10",
  requestTimeoutSeconds: "60",
  redirectPolicy: "NEVER",
  httpVersion: "HTTP_2",
  expectedStatusCodes: "",
  maxResponseBytes: "1048576",
  maxAttempts: "1",
  initialDelayMillis: "1000",
  backoffMultiplier: "2",
  retryStatusCodes: "429, 500, 502, 503, 504",
};

const useStyles = makeStyles({
  root: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
  },
  group: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: "none",
  },
  legend: {
    marginBottom: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  code: {
    minHeight: "112px",
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  body: {
    minHeight: "180px",
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  details: {
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  summary: {
    cursor: "pointer",
    fontWeight: tokens.fontWeightSemibold,
  },
  detailsContent: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
  },
  help: {
    color: tokens.colorNeutralForeground2,
  },
  errorList: {
    marginTop: tokens.spacingVerticalXS,
    marginBottom: 0,
    paddingLeft: tokens.spacingHorizontalXXL,
  },
});

const secretReferencePattern = /^env:[A-Za-z_][A-Za-z0-9_]*$/;

function parameterError(value: string, label: string) {
  try {
    parseParameters(value, label);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : `${label} inválidos`;
  }
}

function parseParameters(value: string, label: string): HttpRequestParameter[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "{}");
  } catch {
    throw new Error(`${label}: informe um objeto JSON válido`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}: use um objeto JSON com pares de nome e valor`);
  }

  return Object.entries(parsed).flatMap(([name, rawValue]) => {
    if (!name.trim()) throw new Error(`${label}: os nomes não podem ficar vazios`);
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    return values.map((entry) => {
      if (
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        "secretRef" in entry
      ) {
        const secretRef = String((entry as { secretRef: unknown }).secretRef);
        if (!secretReferencePattern.test(secretRef)) {
          throw new Error(`${label}: ${name} deve usar {"secretRef":"env:NOME"}`);
        }
        return { name, value: null, secretRef };
      }
      if (!["string", "number", "boolean"].includes(typeof entry)) {
        throw new Error(`${label}: ${name} precisa ser texto, número, booleano ou secretRef`);
      }
      return { name, value: String(entry), secretRef: null };
    });
  });
}

function parseStatuses(value: string, label: string) {
  if (!value.trim()) return [];
  const statuses = value
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (statuses.some((status) => !Number.isInteger(status) || status < 100 || status > 599)) {
    throw new Error(`${label}: use códigos HTTP entre 100 e 599 separados por vírgula`);
  }
  return [...new Set(statuses)];
}

function numberError(value: string, label: string, minimum: number, maximum: number) {
  const number = Number(value);
  return !Number.isFinite(number) || number < minimum || number > maximum
    ? `${label}: informe um valor entre ${minimum} e ${maximum}`
    : undefined;
}

export function validateHttpRequestDraft(draft: HttpRequestDraft) {
  const errors: string[] = [];
  try {
    const url = new URL(draft.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    errors.push("Informe uma URL absoluta usando http ou https");
  }

  for (const [value, label] of [
    [draft.queryParameters, "Parâmetros de query"],
    [draft.headers, "Cabeçalhos"],
    [draft.cookies, "Cookies"],
    [draft.formParameters, "Campos do formulário"],
    [draft.tokenParameters, "Parâmetros adicionais do token"],
  ] as const) {
    const error = parameterError(value, label);
    if (error) errors.push(error);
  }

  if (draft.bodyType === "JSON" && draft.body.trim()) {
    try {
      JSON.parse(draft.body);
    } catch {
      errors.push("O corpo precisa ser um documento JSON válido");
    }
  }
  if (draft.bodyType === "FORM_URLENCODED") {
    try {
      if (parseParameters(draft.formParameters, "Campos do formulário").length === 0) {
        errors.push("Inclua ao menos um campo no formulário");
      }
    } catch {
      // O erro específico já foi incluído acima.
    }
  }

  const requiredSecret = (value: string, label: string) => {
    if (!secretReferencePattern.test(value)) errors.push(`${label}: use env:NOME_DA_VARIAVEL`);
  };
  if (draft.authenticationType === "BASIC") {
    if (!draft.username.trim()) errors.push("Informe o usuário da autenticação Basic");
    requiredSecret(draft.passwordSecretRef, "Senha Basic");
  } else if (draft.authenticationType === "BEARER") {
    requiredSecret(draft.tokenSecretRef, "Token Bearer");
  } else if (draft.authenticationType === "API_KEY") {
    if (!draft.apiKeyName.trim()) errors.push("Informe o nome da API key");
    requiredSecret(draft.tokenSecretRef, "API key");
  } else if (draft.authenticationType === "OAUTH2_CLIENT_CREDENTIALS") {
    try {
      const tokenUrl = new URL(draft.tokenUrl);
      if (tokenUrl.protocol !== "http:" && tokenUrl.protocol !== "https:") throw new Error();
    } catch {
      errors.push("Informe uma URL de token OAuth 2.0 válida");
    }
    if (!draft.clientId.trim()) errors.push("Informe o client ID OAuth 2.0");
    requiredSecret(draft.clientSecretRef, "Client secret OAuth 2.0");
  }

  for (const error of [
    numberError(draft.connectTimeoutSeconds, "Timeout de conexão", 1, 120),
    numberError(draft.requestTimeoutSeconds, "Timeout da requisição", 1, 3600),
    numberError(draft.maxResponseBytes, "Limite da resposta", 1024, 5_000_000),
    numberError(draft.maxAttempts, "Tentativas", 1, 5),
    numberError(draft.initialDelayMillis, "Espera inicial", 0, 60_000),
    numberError(draft.backoffMultiplier, "Multiplicador do backoff", 1, 5),
  ]) {
    if (error) errors.push(error);
  }
  try {
    parseStatuses(draft.expectedStatusCodes, "Status esperados");
    parseStatuses(draft.retryStatusCodes, "Status para nova tentativa");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Códigos HTTP inválidos");
  }
  return [...new Set(errors)];
}

export function toHttpRequestConfiguration(draft: HttpRequestDraft): HttpRequestConfiguration {
  return {
    method: draft.method,
    url: draft.url.trim(),
    queryParameters: parseParameters(draft.queryParameters, "Parâmetros de query"),
    headers: parseParameters(draft.headers, "Cabeçalhos"),
    cookies: parseParameters(draft.cookies, "Cookies"),
    authentication: {
      type: draft.authenticationType,
      username: draft.username.trim(),
      passwordSecretRef: draft.passwordSecretRef.trim(),
      tokenSecretRef: draft.tokenSecretRef.trim(),
      apiKeyName: draft.apiKeyName.trim(),
      apiKeyLocation: draft.apiKeyLocation,
      tokenUrl: draft.tokenUrl.trim(),
      clientId: draft.clientId.trim(),
      clientSecretRef: draft.clientSecretRef.trim(),
      scopes: draft.scopes.split(/[\s,]+/).filter(Boolean),
      audience: draft.audience.trim(),
      clientAuthenticationMethod: draft.clientAuthenticationMethod,
      tokenParameters: parseParameters(draft.tokenParameters, "Parâmetros adicionais do token"),
    },
    bodyType: draft.bodyType,
    body: draft.bodyType === "NONE" ? "" : draft.body,
    formParameters: parseParameters(draft.formParameters, "Campos do formulário"),
    contentType: draft.contentType.trim(),
    connectTimeoutSeconds: Number(draft.connectTimeoutSeconds),
    requestTimeoutSeconds: Number(draft.requestTimeoutSeconds),
    redirectPolicy: draft.redirectPolicy,
    httpVersion: draft.httpVersion,
    expectedStatusCodes: parseStatuses(draft.expectedStatusCodes, "Status esperados"),
    maxResponseBytes: Number(draft.maxResponseBytes),
    retry: {
      maxAttempts: Number(draft.maxAttempts),
      initialDelayMillis: Number(draft.initialDelayMillis),
      backoffMultiplier: Number(draft.backoffMultiplier),
      statusCodes: parseStatuses(draft.retryStatusCodes, "Status para nova tentativa"),
    },
  };
}

function JsonParametersField({
  label,
  hint,
  value,
  showErrors,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  showErrors: boolean;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  const error = parameterError(value, label);
  return (
    <Field
      label={label}
      hint={hint}
      validationState={showErrors && error ? "error" : "none"}
      validationMessage={showErrors ? error : undefined}
    >
      <Textarea className={styles.code} value={value} onChange={(_, data) => onChange(data.value)} />
    </Field>
  );
}

export function HttpRequestEditor({
  draft,
  showErrors,
  onChange,
}: {
  draft: HttpRequestDraft;
  showErrors: boolean;
  onChange: (update: Partial<HttpRequestDraft>) => void;
}) {
  const styles = useStyles();
  const errors = validateHttpRequestDraft(draft);
  const urlError = errors.includes("Informe uma URL absoluta usando http ou https")
    ? "Informe uma URL absoluta usando http ou https"
    : undefined;
  let bodyError: string | undefined;
  if (draft.bodyType === "JSON" && draft.body.trim()) {
    try {
      JSON.parse(draft.body);
    } catch {
      bodyError = "O corpo precisa ser um documento JSON válido";
    }
  }
  const update = <K extends keyof HttpRequestDraft>(key: K, value: HttpRequestDraft[K]) =>
    onChange({ [key]: value } as Pick<HttpRequestDraft, K>);

  return (
    <div className={styles.root}>
      {showErrors && errors.length > 0 ? (
        <MessageBar intent="error">
          <MessageBarBody>
            Revise a configuração HTTP:
            <ul className={styles.errorList}>
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Destino e método</legend>
        <div className={styles.grid}>
          <Field label="Método HTTP" required>
            <Select value={draft.method} onChange={(event) => update("method", event.target.value as HttpRequestDraft["method"])}>
              {(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const).map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </Select>
          </Field>
          <Field
            className={styles.fullWidth}
            label="URL"
            hint="Use uma URL absoluta. Parâmetros fixos também podem permanecer na própria URL"
            required
            validationState={showErrors && urlError ? "error" : "none"}
            validationMessage={showErrors ? urlError : undefined}
          >
            <Input
              type="url"
              value={draft.url}
              placeholder="https://api.exemplo.com/v1/processamentos"
              onChange={(_, data) => update("url", data.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Parâmetros</legend>
        <Text className={styles.help}>
          Use objetos JSON. Um valor pode ser texto, número, booleano, uma lista ou uma referência como {`{"secretRef":"env:API_KEY"}`}.
        </Text>
        <div className={styles.grid}>
          <JsonParametersField
            label="Query string"
            hint='Exemplo: {"page":1,"tag":["ops","daily"]}'
            value={draft.queryParameters}
            showErrors={showErrors}
            onChange={(value) => update("queryParameters", value)}
          />
          <JsonParametersField
            label="Cabeçalhos"
            hint='Exemplo: {"Accept":"application/json","X-Key":{"secretRef":"env:API_KEY"}}'
            value={draft.headers}
            showErrors={showErrors}
            onChange={(value) => update("headers", value)}
          />
          <JsonParametersField
            label="Cookies"
            hint='Exemplo: {"tenant":"observabilidade"}'
            value={draft.cookies}
            showErrors={showErrors}
            onChange={(value) => update("cookies", value)}
          />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Autenticação</legend>
        <div className={styles.grid}>
          <Field label="Tipo de autenticação">
            <Select
              value={draft.authenticationType}
              onChange={(event) => update("authenticationType", event.target.value as HttpAuthentication["type"])}
            >
              <option value="NONE">Sem autenticação estruturada</option>
              <option value="BASIC">Basic</option>
              <option value="BEARER">Bearer token</option>
              <option value="API_KEY">API key</option>
              <option value="OAUTH2_CLIENT_CREDENTIALS">OAuth 2.0 client credentials</option>
            </Select>
          </Field>

          {draft.authenticationType === "BASIC" ? (
            <>
              <Field label="Usuário" required>
                <Input value={draft.username} onChange={(_, data) => update("username", data.value)} />
              </Field>
              <Field label="Referência da senha" hint="Exemplo: env:HTTP_BASIC_PASSWORD" required>
                <Input value={draft.passwordSecretRef} onChange={(_, data) => update("passwordSecretRef", data.value)} />
              </Field>
            </>
          ) : null}

          {draft.authenticationType === "BEARER" ? (
            <Field label="Referência do token" hint="Exemplo: env:HTTP_BEARER_TOKEN" required>
              <Input value={draft.tokenSecretRef} onChange={(_, data) => update("tokenSecretRef", data.value)} />
            </Field>
          ) : null}

          {draft.authenticationType === "API_KEY" ? (
            <>
              <Field label="Nome da API key" required>
                <Input value={draft.apiKeyName} onChange={(_, data) => update("apiKeyName", data.value)} />
              </Field>
              <Field label="Enviar em">
                <Select value={draft.apiKeyLocation} onChange={(event) => update("apiKeyLocation", event.target.value as HttpAuthentication["apiKeyLocation"])}>
                  <option value="HEADER">Cabeçalho</option>
                  <option value="QUERY">Query string</option>
                </Select>
              </Field>
              <Field label="Referência da API key" hint="Exemplo: env:HTTP_API_KEY" required>
                <Input value={draft.tokenSecretRef} onChange={(_, data) => update("tokenSecretRef", data.value)} />
              </Field>
            </>
          ) : null}

          {draft.authenticationType === "OAUTH2_CLIENT_CREDENTIALS" ? (
            <>
              <Field className={styles.fullWidth} label="URL do token" required>
                <Input type="url" value={draft.tokenUrl} onChange={(_, data) => update("tokenUrl", data.value)} />
              </Field>
              <Field label="Client ID" required>
                <Input value={draft.clientId} onChange={(_, data) => update("clientId", data.value)} />
              </Field>
              <Field label="Referência do client secret" hint="Exemplo: env:OAUTH_CLIENT_SECRET" required>
                <Input value={draft.clientSecretRef} onChange={(_, data) => update("clientSecretRef", data.value)} />
              </Field>
              <Field label="Autenticação do cliente">
                <Select value={draft.clientAuthenticationMethod} onChange={(event) => update("clientAuthenticationMethod", event.target.value as HttpAuthentication["clientAuthenticationMethod"])}>
                  <option value="BASIC">Authorization Basic</option>
                  <option value="REQUEST_BODY">Credenciais no corpo</option>
                </Select>
              </Field>
              <Field label="Scopes" hint="Separe por espaço ou vírgula">
                <Input value={draft.scopes} onChange={(_, data) => update("scopes", data.value)} />
              </Field>
              <Field label="Audience">
                <Input value={draft.audience} onChange={(_, data) => update("audience", data.value)} />
              </Field>
              <JsonParametersField
                label="Parâmetros adicionais do token"
                hint='Exemplo: {"resource":"https://api.exemplo.com"}'
                value={draft.tokenParameters}
                showErrors={showErrors}
                onChange={(value) => update("tokenParameters", value)}
              />
            </>
          ) : null}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Corpo</legend>
        <div className={styles.grid}>
          <Field label="Tipo do corpo">
            <Select
              value={draft.bodyType}
              onChange={(event) => {
                const bodyType = event.target.value as HttpRequestConfiguration["bodyType"];
                onChange({
                  bodyType,
                  contentType:
                    bodyType === "JSON"
                      ? "application/json"
                      : bodyType === "FORM_URLENCODED"
                        ? "application/x-www-form-urlencoded"
                        : bodyType === "NONE"
                          ? ""
                          : draft.contentType,
                });
              }}
            >
              <option value="NONE">Sem corpo</option>
              <option value="JSON">JSON</option>
              <option value="RAW">Texto ou conteúdo bruto</option>
              <option value="FORM_URLENCODED">Form URL encoded</option>
            </Select>
          </Field>
          <Field label="Content-Type" hint="Opcional para conteúdo bruto">
            <Input value={draft.contentType} onChange={(_, data) => update("contentType", data.value)} />
          </Field>
          {draft.bodyType === "FORM_URLENCODED" ? (
            <JsonParametersField
              label="Campos do formulário"
              hint='Exemplo: {"action":"synchronize"}'
              value={draft.formParameters}
              showErrors={showErrors}
              onChange={(value) => update("formParameters", value)}
            />
          ) : draft.bodyType !== "NONE" ? (
            <Field
              className={styles.fullWidth}
              label="Conteúdo do corpo"
              validationState={showErrors && bodyError ? "error" : "none"}
              validationMessage={showErrors ? bodyError : undefined}
            >
              <Textarea className={styles.body} value={draft.body} onChange={(_, data) => update("body", data.value)} />
            </Field>
          ) : null}
        </div>
      </fieldset>

      <details className={styles.details}>
        <summary className={styles.summary}>Opções avançadas</summary>
        <div className={styles.detailsContent}>
          <div className={styles.grid}>
            <Field label="Timeout de conexão (segundos)">
              <Input type="number" min={1} max={120} value={draft.connectTimeoutSeconds} onChange={(_, data) => update("connectTimeoutSeconds", data.value)} />
            </Field>
            <Field label="Timeout total (segundos)">
              <Input type="number" min={1} max={3600} value={draft.requestTimeoutSeconds} onChange={(_, data) => update("requestTimeoutSeconds", data.value)} />
            </Field>
            <Field label="Redirecionamentos">
              <Select value={draft.redirectPolicy} onChange={(event) => update("redirectPolicy", event.target.value as HttpRequestConfiguration["redirectPolicy"])}>
                <option value="NEVER">Não seguir</option>
                <option value="NORMAL">Seguir sem downgrade HTTPS</option>
              </Select>
            </Field>
            <Field label="Versão HTTP preferencial">
              <Select value={draft.httpVersion} onChange={(event) => update("httpVersion", event.target.value as HttpRequestConfiguration["httpVersion"])}>
                <option value="HTTP_2">HTTP/2</option>
                <option value="HTTP_1_1">HTTP/1.1</option>
              </Select>
            </Field>
            <Field label="Status esperados" hint="Vazio aceita qualquer 2xx; exemplo: 200, 201, 202">
              <Input value={draft.expectedStatusCodes} onChange={(_, data) => update("expectedStatusCodes", data.value)} />
            </Field>
            <Field label="Limite da resposta (bytes)">
              <Input type="number" min={1024} max={5_000_000} value={draft.maxResponseBytes} onChange={(_, data) => update("maxResponseBytes", data.value)} />
            </Field>
            <Field label="Número máximo de tentativas">
              <Input type="number" min={1} max={5} value={draft.maxAttempts} onChange={(_, data) => update("maxAttempts", data.value)} />
            </Field>
            <Field label="Espera inicial entre tentativas (ms)">
              <Input type="number" min={0} max={60_000} value={draft.initialDelayMillis} onChange={(_, data) => update("initialDelayMillis", data.value)} />
            </Field>
            <Field label="Multiplicador do backoff">
              <Input type="number" min={1} max={5} step={0.1} value={draft.backoffMultiplier} onChange={(_, data) => update("backoffMultiplier", data.value)} />
            </Field>
            <Field label="Status que permitem nova tentativa" hint="Exemplo: 429, 500, 502, 503, 504">
              <Input value={draft.retryStatusCodes} onChange={(_, data) => update("retryStatusCodes", data.value)} />
            </Field>
          </div>
        </div>
      </details>
    </div>
  );
}
