"use client";

import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

export function WorkspaceModal({
  title,
  description,
  closeHref,
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      router.replace(closeHref, { scroll: false });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      router.replace(closeHref, { scroll: false });
    };

    dialog?.addEventListener("cancel", handleCancel);
    document.addEventListener("keydown", handleKeyDown);
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.focus({ preventScroll: true });
    }
    return () => {
      dialog?.removeEventListener("cancel", handleCancel);
      document.removeEventListener("keydown", handleKeyDown);
      if (dialog?.open) dialog.close();
    };
  }, [closeHref, router]);

  function closeModal() {
    router.replace(closeHref, { scroll: false });
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeModal();
  }

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      className="workspace-modal workspace-team-picks-modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdropClick}
    >
      <div className="workspace-modal-surface">
        <header className="workspace-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label={`Close ${title}`}
          >
            <span aria-hidden="true">×</span>
            <span>Close</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
