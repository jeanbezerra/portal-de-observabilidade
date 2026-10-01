import {
  Button,
  Checkbox,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  DeleteRegular,
  TextBulletListAddRegular,
} from "@fluentui/react-icons";
import { useId } from "react";

import type {
  HttpAuthentication,
  HttpRequestConfiguration,
  HttpRequestParameter,
} from "./scheduled-jobs-model";

export type HttpRequestParameterDraft = {
  id: string;
  name: string;
  value: string;
  valueType: "VALUE" | "SECRET";
};

export type HttpRequestDraft = {
  method: HttpRequestConfiguration["method"];
  url: string;
  queryParameters: HttpRequestParameterDraft[];
  headers: HttpRequestParameterDraft[];
  cookies: HttpRequestParameterDraft[];
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
  ignoreTlsValidation: boolean;
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
  queryParameters: [],
  headers: [
    {
      id: "default-accept-header",
      name: "Accept",
      value: "application/json",
      valueType: "VALUE",
    },
  ],
  cookies: [],
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
  ignoreTlsValidation: false,
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
  parameterSections: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  parameterEditor: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  parameterHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    flexWrap: "wrap",
  },
  parameterHeading: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    flexGrow: 1,
    flexBasis: "280px",
    minWidth: 0,
  },
  parameterActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    marginLeft: "auto",
    "@media (max-width: 760px)": {
      width: "100%",
    },
  },
  parameterTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  parameterHint: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  parameterTableFrame: {
    minWidth: 0,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  parameterTable: {
    minWidth: "640px",
  },
  parameterNameCell: {
    width: "30%",
  },
  parameterValueCell: {
    width: "40%",
  },
  parameterTypeCell: {
    width: "190px",
  },
  parameterActionCell: {
    width: "48px",
    textAlign: "center",
  },
  parameterInput: {
    width: "100%",
  },
  emptyParameterCell: {
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground2,
    textAlign: "center",
  },
  dangerAction: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: tokens.colorNeutralForegroundStaticInverted,
    ":hover": {
      backgroundColor: tokens.colorStatusDangerBackground3Hover,
      color: tokens.colorNeutralForegroundStaticInverted,
    },
    ":active": {
      backgroundColor: tokens.colorStatusDangerBackground3Pressed,
      color: tokens.colorNeutralForegroundStaticInverted,
    },
  },
  parameterError: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
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
  tlsOptions: {
    display: "grid",
    gap: tokens.spacingVerticalS,
    margin: 0,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tlsDescription: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
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
type HttpRequestParameterPreset = Omit<HttpRequestParameterDraft, "id">;

const standardHttpHeaders: readonly HttpRequestParameterPreset[] = [
  {
    name: "Accept",
    value: "application/json",
    valueType: "VALUE",
  },
  {
    name: "Content-Type",
    value: "application/json",
    valueType: "VALUE",
  },
];

let parameterRowSequence = 0;

function createParameterRowId(prefix: string) {
  parameterRowSequence += 1;
  return `${prefix}-${parameterRowSequence}`;
}

function parameterListError(
  parameters: HttpRequestParameterDraft[],
  label: string,
) {
  for (const parameter of parameters) {
    if (!parameter.name.trim() && !parameter.value.trim()) continue;
    if (!parameter.name.trim()) {
      return `${label}: informe o nome do parâmetro`;
    }
    if (
      parameter.valueType === "SECRET" &&
      !secretReferencePattern.test(parameter.value.trim())
    ) {
      return `${label}: a referência de segredo deve usar env:NOME_DA_VARIAVEL`;
    }
  }
  return undefined;
}

function toHttpRequestParameters(
  parameters: HttpRequestParameterDraft[],
): HttpRequestParameter[] {
  return parameters
    .filter((parameter) => parameter.name.trim() || parameter.value.trim())
    .map((parameter) => ({
      name: parameter.name.trim(),
      value: parameter.valueType === "VALUE" ? parameter.value : null,
      secretRef:
        parameter.valueType === "SECRET" ? parameter.value.trim() : null,
    }));
}

function toParameterDrafts(
  parameters: HttpRequestParameter[],
  prefix: string,
): HttpRequestParameterDraft[] {
  return parameters.map((parameter) => ({
    id: createParameterRowId(prefix),
    name: parameter.name,
    value: parameter.secretRef ?? parameter.value ?? "",
    valueType: parameter.secretRef ? "SECRET" : "VALUE",
  }));
}

function parametersToJson(parameters: HttpRequestParameter[]) {
  type JsonParameterValue = string | { secretRef: string };
  const values: Record<
    string,
    JsonParameterValue | JsonParameterValue[]
  > = {};

  for (const parameter of parameters) {
    const value: JsonParameterValue = parameter.secretRef
      ? { secretRef: parameter.secretRef }
      : (parameter.value ?? "");
    const current = values[parameter.name];
    if (current === undefined) values[parameter.name] = value;
    else if (Array.isArray(current)) current.push(value);
    else values[parameter.name] = [current, value];
  }

  return JSON.stringify(values, null, 2);
}

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

  for (const [parameters, label] of [
    [draft.queryParameters, "Query string"],
    [draft.headers, "Cabeçalhos"],
    [draft.cookies, "Cookies"],
  ] as const) {
    const error = parameterListError(parameters, label);
    if (error) errors.push(error);
  }

  for (const [value, label] of [
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
    numberError(draft.backoffMultiplier, "Fator de aumento da espera", 1, 5),
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
    queryParameters: toHttpRequestParameters(draft.queryParameters),
    headers: toHttpRequestParameters(draft.headers),
    cookies: toHttpRequestParameters(draft.cookies),
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
    ignoreTlsValidation: draft.ignoreTlsValidation,
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

export function toHttpRequestDraft(
  configuration: HttpRequestConfiguration,
): HttpRequestDraft {
  return {
    method: configuration.method,
    url: configuration.url,
    queryParameters: toParameterDrafts(
      configuration.queryParameters,
      "query-edit",
    ),
    headers: toParameterDrafts(configuration.headers, "header-edit"),
    cookies: toParameterDrafts(configuration.cookies, "cookie-edit"),
    authenticationType: configuration.authentication.type,
    username: configuration.authentication.username,
    passwordSecretRef: configuration.authentication.passwordSecretRef,
    tokenSecretRef: configuration.authentication.tokenSecretRef,
    apiKeyName: configuration.authentication.apiKeyName,
    apiKeyLocation: configuration.authentication.apiKeyLocation,
    tokenUrl: configuration.authentication.tokenUrl,
    clientId: configuration.authentication.clientId,
    clientSecretRef: configuration.authentication.clientSecretRef,
    scopes: configuration.authentication.scopes.join(" "),
    audience: configuration.authentication.audience,
    clientAuthenticationMethod:
      configuration.authentication.clientAuthenticationMethod,
    tokenParameters: parametersToJson(
      configuration.authentication.tokenParameters,
    ),
    bodyType: configuration.bodyType,
    body: configuration.body,
    formParameters: parametersToJson(configuration.formParameters),
    contentType: configuration.contentType,
    connectTimeoutSeconds: String(configuration.connectTimeoutSeconds),
    requestTimeoutSeconds: String(configuration.requestTimeoutSeconds),
    ignoreTlsValidation: Boolean(configuration.ignoreTlsValidation),
    redirectPolicy: configuration.redirectPolicy,
    httpVersion: configuration.httpVersion,
    expectedStatusCodes: configuration.expectedStatusCodes.join(", "),
    maxResponseBytes: String(configuration.maxResponseBytes),
    maxAttempts: String(configuration.retry.maxAttempts),
    initialDelayMillis: String(configuration.retry.initialDelayMillis),
    backoffMultiplier: String(configuration.retry.backoffMultiplier),
    retryStatusCodes: configuration.retry.statusCodes.join(", "),
  };
}

function ParameterListEditor({
  label,
  description,
  addLabel,
  addPresetLabel,
  presetParameters = [],
  idPrefix,
  parameters,
  showErrors,
  onChange,
}: {
  label: string;
  description: string;
  addLabel: string;
  addPresetLabel?: string;
  presetParameters?: readonly HttpRequestParameterPreset[];
  idPrefix: string;
  parameters: HttpRequestParameterDraft[];
  showErrors: boolean;
  onChange: (parameters: HttpRequestParameterDraft[]) => void;
}) {
  const styles = useStyles();
  const titleId = useId();
  const errorId = useId();
  const error = parameterListError(parameters, label);
  const parameterNames = new Set(
    parameters
      .map((parameter) => parameter.name.trim().toLocaleLowerCase("pt-BR"))
      .filter(Boolean),
  );
  const missingPresetParameters = presetParameters.filter(
    (parameter) =>
      !parameterNames.has(parameter.name.toLocaleLowerCase("pt-BR")),
  );

  function updateParameter(
    id: string,
    update: Partial<HttpRequestParameterDraft>,
  ) {
    onChange(
      parameters.map((parameter) =>
        parameter.id === id ? { ...parameter, ...update } : parameter,
      ),
    );
  }

  return (
    <section className={styles.parameterEditor} aria-labelledby={titleId}>
      <div className={styles.parameterHeader}>
        <div className={styles.parameterHeading}>
          <h3 id={titleId} className={styles.parameterTitle}>
            {label}
          </h3>
          <Text className={styles.parameterHint}>{description}</Text>
        </div>

        <div
          className={styles.parameterActions}
          role="group"
          aria-label={`Ações de ${label.toLocaleLowerCase("pt-BR")}`}
        >
          {addPresetLabel ? (
            <Button
              type="button"
              appearance="secondary"
              size="small"
              icon={<TextBulletListAddRegular />}
              disabled={missingPresetParameters.length === 0}
              onClick={() =>
                onChange([
                  ...parameters,
                  ...missingPresetParameters.map((parameter) => ({
                    ...parameter,
                    id: createParameterRowId(idPrefix),
                  })),
                ])
              }
            >
              {addPresetLabel}
            </Button>
          ) : null}

          <Button
            type="button"
            appearance="secondary"
            size="small"
            icon={<AddRegular />}
            onClick={() =>
              onChange([
                ...parameters,
                {
                  id: createParameterRowId(idPrefix),
                  name: "",
                  value: "",
                  valueType: "VALUE",
                },
              ])
            }
          >
            {addLabel}
          </Button>

          <Button
            className={parameters.length > 0 ? styles.dangerAction : undefined}
            type="button"
            appearance="primary"
            size="small"
            icon={<DeleteRegular />}
            disabled={parameters.length === 0}
            onClick={() => onChange([])}
          >
            Remover todos
          </Button>
        </div>
      </div>

      <div className={styles.parameterTableFrame}>
        <Table
          className={styles.parameterTable}
          size="small"
          aria-label={`${label} da requisição HTTP`}
          aria-describedby={showErrors && error ? errorId : undefined}
        >
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.parameterNameCell}>
                Nome
              </TableHeaderCell>
              <TableHeaderCell className={styles.parameterValueCell}>
                Valor
              </TableHeaderCell>
              <TableHeaderCell className={styles.parameterTypeCell}>
                Tipo do valor
              </TableHeaderCell>
              <TableHeaderCell className={styles.parameterActionCell}>
                Ações
              </TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parameters.length === 0 ? (
              <TableRow>
                <TableCell className={styles.emptyParameterCell} colSpan={4}>
                  Nenhum item adicionado
                </TableCell>
              </TableRow>
            ) : (
              parameters.map((parameter, index) => {
                const hasContent = Boolean(
                  parameter.name.trim() || parameter.value.trim(),
                );
                const invalidName = hasContent && !parameter.name.trim();
                const invalidSecret =
                  parameter.valueType === "SECRET" &&
                  !secretReferencePattern.test(parameter.value.trim());
                const itemName = `${label.toLocaleLowerCase("pt-BR")} ${index + 1}`;

                return (
                  <TableRow key={parameter.id}>
                    <TableCell>
                      <Input
                        className={styles.parameterInput}
                        value={parameter.name}
                        aria-label={`Nome de ${itemName}`}
                        aria-invalid={showErrors && invalidName}
                        aria-describedby={
                          showErrors && invalidName ? errorId : undefined
                        }
                        placeholder="Nome"
                        onChange={(_, data) =>
                          updateParameter(parameter.id, { name: data.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className={styles.parameterInput}
                        value={parameter.value}
                        aria-label={`Valor de ${itemName}`}
                        aria-invalid={showErrors && invalidSecret}
                        aria-describedby={
                          showErrors && invalidSecret ? errorId : undefined
                        }
                        placeholder={
                          parameter.valueType === "SECRET"
                            ? "env:NOME_DA_VARIAVEL"
                            : "Valor"
                        }
                        onChange={(_, data) =>
                          updateParameter(parameter.id, { value: data.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        className={styles.parameterInput}
                        value={parameter.valueType}
                        aria-label={`Tipo do valor de ${itemName}`}
                        onChange={(event) =>
                          updateParameter(parameter.id, {
                            valueType: event.target.value as HttpRequestParameterDraft["valueType"],
                          })
                        }
                      >
                        <option value="VALUE">Valor informado</option>
                        <option value="SECRET">Referência de segredo</option>
                      </Select>
                    </TableCell>
                    <TableCell className={styles.parameterActionCell}>
                      <Button
                        type="button"
                        appearance="subtle"
                        size="small"
                        icon={<DeleteRegular />}
                        aria-label={`Remover ${itemName}`}
                        onClick={() =>
                          onChange(
                            parameters.filter(
                              (current) => current.id !== parameter.id,
                            ),
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showErrors && error ? (
        <Text id={errorId} className={styles.parameterError} role="alert">
          {error}
        </Text>
      ) : null}
    </section>
  );
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
  const tlsDescriptionId = useId();
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
        <legend className={styles.legend}>Destino</legend>
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
          Adicione cada item em uma linha. Para valores sensíveis, selecione
          “Referência de segredo” e informe uma variável no formato
          env:NOME_DA_VARIAVEL.
        </Text>
        <div className={styles.parameterSections}>
          <ParameterListEditor
            label="Query string"
            description="Parâmetros enviados após o sinal de interrogação da URL, como page=1 ou tag=ops."
            addLabel="Adicionar parâmetro"
            idPrefix="query"
            parameters={draft.queryParameters}
            showErrors={showErrors}
            onChange={(parameters) => update("queryParameters", parameters)}
          />
          <ParameterListEditor
            label="Cabeçalhos"
            description="Metadados da requisição, como Accept, Content-Language ou uma chave de correlação."
            addLabel="Adicionar cabeçalho"
            addPresetLabel="Adicionar cabeçalhos padrão"
            presetParameters={standardHttpHeaders}
            idPrefix="header"
            parameters={draft.headers}
            showErrors={showErrors}
            onChange={(parameters) => update("headers", parameters)}
          />
          <ParameterListEditor
            label="Cookies"
            description="Cookies enviados ao servidor, como tenant=observabilidade."
            addLabel="Adicionar cookie"
            idPrefix="cookie"
            parameters={draft.cookies}
            showErrors={showErrors}
            onChange={(parameters) => update("cookies", parameters)}
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
        <legend className={styles.legend}>Body</legend>
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
            <Field label="Timeout de resposta (segundos)">
              <Input type="number" min={1} max={3600} value={draft.requestTimeoutSeconds} onChange={(_, data) => update("requestTimeoutSeconds", data.value)} />
            </Field>
            <Field label="Redirecionamentos">
              <Select value={draft.redirectPolicy} onChange={(event) => update("redirectPolicy", event.target.value as HttpRequestConfiguration["redirectPolicy"])}>
                <option value="NEVER">Não seguir</option>
                <option value="NORMAL">Seguir sem downgrade HTTPS</option>
              </Select>
            </Field>
            <Field label="Versão do protocolo HTTP">
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
            <Field
              label="Fator de aumento da espera"
              hint="Define quanto a espera cresce após cada falha. Com espera inicial de 1.000 ms e fator 2, as esperas serão de 1.000, 2.000 e 4.000 ms."
            >
              <Input type="number" min={1} max={5} step={0.1} value={draft.backoffMultiplier} onChange={(_, data) => update("backoffMultiplier", data.value)} />
            </Field>
            <Field label="Códigos de resposta HTTP que acionam uma nova tentativa" hint="Exemplo: 429, 500, 502, 503, 504">
              <Input value={draft.retryStatusCodes} onChange={(_, data) => update("retryStatusCodes", data.value)} />
            </Field>
          </div>

          <fieldset className={styles.tlsOptions}>
            <legend className={styles.legend}>Segurança da conexão</legend>
            <Checkbox
              checked={draft.ignoreTlsValidation}
              label="Ignorar validação SSL/TLS"
              aria-describedby={tlsDescriptionId}
              onChange={(_, data) =>
                update("ignoreTlsValidation", data.checked === true)
              }
            />
            <Text id={tlsDescriptionId} className={styles.tlsDescription}>
              Aceita certificados autoassinados, expirados, emitidos por uma
              autoridade não confiável ou com hostname diferente. Também se
              aplica ao endpoint OAuth 2.0.
            </Text>
            {draft.ignoreTlsValidation ? (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Use somente em destinos internos controlados. Esta opção
                  impede confirmar a identidade do servidor e deixa a conexão
                  vulnerável a interceptação.
                </MessageBarBody>
              </MessageBar>
            ) : null}
          </fieldset>
        </div>
      </details>
    </div>
  );
}
