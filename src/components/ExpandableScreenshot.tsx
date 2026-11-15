import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  src: string | undefined;
  alt: string;
  title: string;
};

export default function ExpandableScreenshot({ id, src, alt, title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previewId = `screenshot-preview-${id}`;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    // showModal places this preview above the help dialog in the native top layer.
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [isOpen]);

  function closePreview() {
    dialogRef.current?.close();
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  return <figure className="how-to-use-screenshot">
    {src ? <>
      <button className="how-to-use-screenshot-button" ref={buttonRef} type="button"
        aria-label={`Open larger image: ${title}`} aria-haspopup="dialog"
        aria-expanded={isOpen} aria-controls={isOpen ? previewId : undefined}
        onClick={() => setIsOpen(true)}>
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </button>
      {isOpen && <dialog className="screenshot-preview" id={previewId} ref={dialogRef}
        aria-modal="true" aria-label={`Larger image: ${title}`}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closePreview();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}>
        <header className="screenshot-preview-header">
          <p>{title}</p>
          <button className="screenshot-preview-close" type="button" autoFocus
            aria-label="Close image preview" onClick={closePreview}>Close</button>
        </header>
        <div className="screenshot-preview-content">
          <img className="screenshot-preview-image" src={src} alt={alt} decoding="async" />
        </div>
      </dialog>}
    </> : <figcaption className="how-to-use-screenshot-missing">
      {alt}
      <span>Screenshot to be added.</span>
    </figcaption>}
  </figure>;
}
