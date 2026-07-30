import type { ReactNode } from "react";

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="workspace-page-header">
      <div>
        <p className="workspace-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="workspace-description">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function WorkspaceMetric({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="workspace-metric-label">{label}</p>
      <div className="workspace-metric-value">{value}</div>
      <p className="workspace-metric-detail">{detail}</p>
    </>
  );

  return href ? (
    <a href={href} className="workspace-metric workspace-metric-link">
      {content}
    </a>
  ) : (
    <article className="workspace-metric">{content}</article>
  );
}

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`workspace-panel ${className}`}>
      <div className="workspace-panel-header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
