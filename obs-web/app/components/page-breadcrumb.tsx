import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ChevronRightRegular } from "@fluentui/react-icons";

export type PageBreadcrumbItem = {
  label: string;
  href?: string;
};

const useStyles = makeStyles({
  root: {
    minWidth: 0,
    overflowX: "auto",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  list: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    width: "max-content",
    minWidth: "100%",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  item: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    whiteSpace: "nowrap",
  },
  compactHidden: {
    "@media (max-width: 520px)": {
      display: "none",
    },
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "32px",
    color: tokens.colorBrandForegroundLink,
    textDecorationLine: "none",
    "&:hover": {
      color: tokens.colorBrandForegroundLinkHover,
      textDecorationLine: "underline",
    },
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  current: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  separator: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  compactLeadingSeparator: {
    "@media (max-width: 520px)": {
      display: "none",
    },
  },
});

export function PageBreadcrumb({ items }: { items: PageBreadcrumbItem[] }) {
  const styles = useStyles();

  return (
    <nav className={styles.root} aria-label="Navegação estrutural">
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li
              className={mergeClasses(
                styles.item,
                index < items.length - 2 && styles.compactHidden,
              )}
              key={item.label}
            >
              {index > 0 ? (
                <ChevronRightRegular
                  className={mergeClasses(
                    styles.separator,
                    index === items.length - 2 &&
                      styles.compactLeadingSeparator,
                  )}
                  aria-hidden="true"
                />
              ) : null}
              {item.href && !isCurrent ? (
                <a className={styles.link} href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span
                  className={isCurrent ? styles.current : undefined}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
