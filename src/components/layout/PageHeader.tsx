import type { ReactNode } from "react";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  meta,
  children,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        <div className="page-header__heading">
          {icon && <div className="page-header__icon">{icon}</div>}

          <div className="page-header__text">
            <div className="page-header__title-row">
              <h1 className="page-header__title">{title}</h1>

              {meta && <div className="page-header__meta">{meta}</div>}
            </div>

            {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          </div>
        </div>

        {children && <div className="page-header__content">{children}</div>}
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
