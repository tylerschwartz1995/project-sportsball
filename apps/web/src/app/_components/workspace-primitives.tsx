import type { ReactNode } from "react";

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  descriptionClassName = "",
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  descriptionClassName?: string;
  action?: ReactNode;
}) {
  return (
    <header className="workspace-page-header">
      <div>
        <p className="workspace-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className={`workspace-description ${descriptionClassName}`}>
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className = "",
  width = "wide",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  width?: "compact" | "standard" | "wide";
}) {
  const widthClass =
    width === "wide" ? "" : `workspace-width-${width}`;

  return (
    <section className={`workspace-panel ${widthClass} ${className}`}>
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
