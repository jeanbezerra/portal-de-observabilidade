import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Avatar,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Link,
  Spinner,
} from "@fluentui/react-components";
import {
  ArrowExitRegular,
  ArrowRightRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  KeyRegular,
  PersonRegular,
  ShieldCheckmarkRegular,
} from "@fluentui/react-icons";
import { useId, useState } from "react";
import { useIdentity } from "./identity-context";
import {
  errorMessage,
  identityRequest,
  IdentityServiceError,
} from "./identity-client";
import { useMyAccountStyles } from "./my-account-appearance";
import { EntryDialog, Notice } from "./security-ui";

function SessionTime({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))}
    </time>
  );
}

export function MyAccountPage() {
  const styles = useMyAccountStyles();
  const id = useId();
  const { identity, refresh, signOut } = useIdentity();
  const [changing, setChanging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  if (!identity) return null;
  const local = identity.providerId === "local";
  const provider = local
    ? "Conta local"
    : identity.providerId || "Provedor externo";
  return (
    <div className={styles.stack}>
      {error && <Notice message={error} onDismiss={() => setError("")} />}
      <Card className={styles.profile} focusMode="off">
        <Avatar
          name={identity.displayName}
          size={72}
          color="brand"
          aria-hidden="true"
        />
        <div className={styles.identity}>
          <h2 className={styles.name}>{identity.displayName}</h2>
          <p className={styles.subtitle}>@{identity.username}</p>
          <div className={styles.badges}>
            <Badge appearance="tint" color="brand">
              {local ? "Conta local" : "Conta externa"}
            </Badge>
            <Badge
              appearance="tint"
              color="success"
              icon={<CheckmarkCircleRegular />}
            >
              Conectado
            </Badge>
          </div>
        </div>
      </Card>

      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card
            className={styles.card}
            focusMode="off"
            aria-labelledby={id + "-details"}
          >
            <CardHeader
              image={
                <span className={styles.icon}>
                  <PersonRegular />
                </span>
              }
              header={
                <h2 id={id + "-details"} className={styles.title}>
                  Dados da conta
                </h2>
              }
              description="Informações da sua identidade na plataforma."
            />
            <dl className={styles.details}>
              <div className={styles.detail}>
                <dt>Nome</dt>
                <dd>{identity.displayName}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Usuário</dt>
                <dd>{identity.username}</dd>
              </div>
              <div className={styles.detail}>
                <dt>E-mail</dt>
                <dd>{identity.email || "Não informado"}</dd>
              </div>
              <div className={styles.detail}>
                <dt>Forma de acesso</dt>
                <dd>{provider}</dd>
              </div>
            </dl>
            <p className={styles.muted}>
              Para atualizar seus dados ou acessos, procure a administração da
              plataforma.
            </p>
          </Card>

          <Card
            className={styles.card}
            focusMode="off"
            aria-labelledby={id + "-access"}
          >
            <CardHeader
              image={
                <span className={styles.icon}>
                  <ShieldCheckmarkRegular />
                </span>
              }
              header={
                <h2 id={id + "-access"} className={styles.title}>
                  Seus acessos
                </h2>
              }
              description="Perfis e permissões concedidos à sua conta."
            />
            <section
              className={styles.accessGroup}
              aria-labelledby={id + "-roles"}
            >
              <h3 className={styles.label} id={id + "-roles"}>
                Perfis de acesso
              </h3>
              {identity.roles.length ? (
                <ul className={styles.chips}>
                  {identity.roles.map((role) => (
                    <li key={role}>
                      <span className={styles.chip}>{role}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>Nenhum perfil concedido.</p>
              )}
            </section>
            <Accordion collapsible className={styles.accordion}>
              <AccordionItem value="permissions">
                <AccordionHeader
                  as="h3"
                  expandIconPosition="end"
                  button={{ className: styles.accordionButton }}
                >
                  Permissões ({identity.permissions.length})
                </AccordionHeader>
                <AccordionPanel className={styles.accordionPanel}>
                  {identity.permissions.length ? (
                    <ul
                      className={styles.chips}
                      aria-label="Permissões efetivas"
                    >
                      {identity.permissions.map((permission) => (
                        <li key={permission}>
                          <span className={styles.chip}>{permission}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>Nenhuma permissão concedida.</p>
                  )}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <div className={styles.stack}>
          <Card
            className={styles.card}
            focusMode="off"
            aria-labelledby={id + "-password"}
          >
            <CardHeader
              image={
                <span className={styles.icon}>
                  <KeyRegular />
                </span>
              }
              header={
                <h2 id={id + "-password"} className={styles.title}>
                  Senha e acesso
                </h2>
              }
              description={
                local
                  ? "Sua senha protege o acesso ao portal."
                  : "Acesso gerenciado pelo seu provedor externo."
              }
            />
            <p className={styles.description}>
              {local
                ? "Use uma senha exclusiva. Você precisará informar sua senha atual para alterá-la."
                : "Para alterar sua senha, use os canais do seu provedor de identidade."}
            </p>
            {local && (
              <CardFooter>
                <Button
                  className={styles.button}
                  appearance="primary"
                  icon={<KeyRegular />}
                  onClick={() => setChanging(true)}
                >
                  Alterar senha
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card
            className={styles.card}
            focusMode="off"
            aria-labelledby={id + "-session"}
          >
            <CardHeader
              image={
                <span className={styles.icon}>
                  <ClockRegular />
                </span>
              }
              header={
                <h2 id={id + "-session"} className={styles.title}>
                  Sessão atual
                </h2>
              }
              description="Controle o acesso usado neste navegador."
            />
            {identity.session ? (
              <>
                <dl className={styles.sessionDetails}>
                  <div className={styles.detail}>
                    <dt>Expira por inatividade</dt>
                    <dd>
                      <SessionTime value={identity.session.expiresAt} />
                    </dd>
                  </div>
                  <div className={styles.detail}>
                    <dt>Limite de duração da sessão</dt>
                    <dd>
                      <SessionTime value={identity.session.absoluteExpiresAt} />
                    </dd>
                  </div>
                </dl>
                <p className={styles.muted}>
                  Horários de Brasília. O prazo por inatividade é renovado
                  durante o uso do portal.
                </p>
              </>
            ) : (
              <p className={styles.description}>
                Os dados de duração não estão disponíveis para este acesso.
              </p>
            )}
            {identity.authorities.includes("session:read") && (
              <div>
                <Link className={styles.link} href="/seguranca/sessoes">
                  Consultar sessões ativas{" "}
                  <ArrowRightRegular aria-hidden="true" />
                </Link>
              </div>
            )}
            <CardFooter className={styles.footer}>
              <p className={styles.muted}>
                Ao sair, você precisará entrar novamente.
              </p>
              <Button
                className={styles.button}
                disabled={leaving}
                icon={leaving ? <Spinner size="tiny" /> : <ArrowExitRegular />}
                onClick={async () => {
                  setLeaving(true);
                  setError("");
                  try {
                    await signOut();
                  } catch (reason) {
                    setError(errorMessage(reason));
                  } finally {
                    setLeaving(false);
                  }
                }}
              >
                {leaving ? "Saindo…" : "Sair da conta"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      {changing && (
        <ChangePasswordDialog
          onClose={() => setChanging(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function ChangePasswordDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => Promise<boolean>;
}) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const tooLong = new TextEncoder().encode(password).length > 72;
  const mismatch = !!confirmation && password !== confirmation;
  const type = visible ? "text" : "password";
  return (
    <EntryDialog
      open
      title="Alterar minha senha"
      saveLabel="Alterar senha"
      onClose={onClose}
      onSave={async () => {
        if (tooLong)
          throw new IdentityServiceError(
            "A nova senha deve ter no máximo 72 bytes.",
            400,
          );
        if (password !== confirmation)
          throw new IdentityServiceError(
            "As senhas informadas não coincidem.",
            400,
          );
        await identityRequest("/me/password", "POST", {
          currentPassword: current,
          newPassword: password,
        });
        setCurrent("");
        setPassword("");
        setConfirmation("");
        await onChanged();
      }}
    >
      <p>
        Ao alterar a senha, todas as suas sessões serão encerradas. Entre
        novamente com a nova senha.
      </p>
      <Field label="Senha atual" required>
        <Input
          type={type}
          required
          value={current}
          autoComplete="current-password"
          onChange={(_, state) => setCurrent(state.value)}
        />
      </Field>
      <Field
        label="Nova senha"
        required
        hint="Pelo menos 12 caracteres; máximo de 72 bytes."
        validationState={tooLong ? "error" : "none"}
        validationMessage={
          tooLong
            ? "A senha ultrapassa o limite de 72 bytes. Use menos caracteres."
            : undefined
        }
      >
        <Input
          type={type}
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(_, state) => setPassword(state.value)}
        />
      </Field>
      <Field
        label="Confirmar nova senha"
        required
        validationState={mismatch ? "error" : "none"}
        validationMessage={mismatch ? "As senhas não coincidem." : undefined}
      >
        <Input
          type={type}
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          value={confirmation}
          onChange={(_, state) => setConfirmation(state.value)}
        />
      </Field>
      <Checkbox
        label="Mostrar senhas"
        checked={visible}
        onChange={(_, state) => setVisible(!!state.checked)}
      />
    </EntryDialog>
  );
}
