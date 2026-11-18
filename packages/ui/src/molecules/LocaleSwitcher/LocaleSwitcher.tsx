// Selector de idioma (R24): links a la MISMA página en cada locale.
// El caller arma los hrefs (slugs localizados preservados) — este componente solo dibuja.
import { Link } from "../../atoms/Link/Link";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./LocaleSwitcher.module.scss";

export type LocaleOption = {
  readonly locale: string;
  readonly label: string;
  readonly href: string;
  readonly current: boolean;
};

type LocaleSwitcherProps = {
  options: readonly LocaleOption[];
  label: string;
};

export function LocaleSwitcher({ options, label }: LocaleSwitcherProps) {
  return (
    <div className={styles.sw}>
      <Icon name="globe" size="sm" />
      <span className="vh">{label}</span>
      <ul>
        {options.map((option) => (
          <li key={option.locale}>
            <Link
              href={option.href}
              hrefLang={option.locale}
              variant="quiet"
              aria-current={option.current ? true : undefined}
              className={option.current ? styles.current : undefined}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
