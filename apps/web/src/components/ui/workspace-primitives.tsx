import type { ReactNode } from "react";

export type WorkspaceWidth = "compact" | "standard" | "wide";

export function WorkspacePageHeader({
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
        <h1>{title}</h1>
        {description ? <p className={`workspace-description ${descriptionClassName}`}>{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function WorkspacePanel({
  id,
  title,
  description,
  action,
  children,
  className = "",
  width = "wide",
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  width?: WorkspaceWidth;
}) {
  const widthClass =
    width === "wide" ? "" : `workspace-width-${width}`;

  return (
    <section id={id} className={`workspace-panel ${widthClass} ${className}`}>
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
