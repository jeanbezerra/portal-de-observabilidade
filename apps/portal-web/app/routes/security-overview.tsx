import { Button, Card } from "@fluentui/react-components";
import { useIdentity } from "../features/security/identity-context";
import {
  RequireIdentity,
  useSecurityStyles,
} from "../features/security/security-ui";
import { securitySections } from "../features/security/security-model";
export const meta = () => [{ title: "Segurança | Portal de Observabilidade" }];
export default function SecurityOverview() {
  const styles = useSecurityStyles();
  const { identity } = useIdentity();
  return (
    <RequireIdentity>
      <div className={styles.page}>
        <header>
          <h1 className={styles.heading}>Segurança</h1>
          <p className={styles.lead}>
            Administre identidades e acessos da plataforma. Usuários, grupos e
            permissões são mantidos localmente por padrão.
          </p>
        </header>
        <div className={styles.grid}>
          {Object.entries(securitySections)
            .filter(
              ([, section]) =>
                !section.permission ||
                identity?.authorities.includes(section.permission),
            )
            .map(([key, section]) => (
              <Card key={key} className={styles.panel}>
                <h2>{section.title}</h2>
                <p className={styles.lead}>{section.description}</p>
                <div>
                  <Button as="a" href={"/seguranca/" + key}>
                    Abrir {section.title.toLocaleLowerCase("pt-BR")}
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </RequireIdentity>
  );
}
