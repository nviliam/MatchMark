import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { MatchMarkSession } from "../types/session";
import { readSessionFile } from "../utils/sessionImport";

type Props = { onImport: (session: MatchMarkSession) => void; disabled?: boolean };

export default function SessionImport({ onImport, disabled = false }: Props) {
  const [candidate, setCandidate] = useState<MatchMarkSession | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const request = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const confirmationWasOpen = useRef(false);
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { if (error) launcherRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!candidate) {
      if (confirmationWasOpen.current) launcherRef.current?.focus();
      confirmationWasOpen.current = false;
      return;
    }
    confirmationWasOpen.current = true;
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => { if (dialog?.open) dialog.close(); };
  }, [candidate]);

  function closeConfirmation() {
    dialogRef.current?.close();
    setCandidate(null);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || disabled) return;
    const current = ++request.current;
    setReading(true);
    setError("");
    setCandidate(null);
    const result = await readSessionFile(file);
    if (request.current !== current) return;
    setReading(false);
    if (result.valid) setCandidate(result.session);
    else setError(result.error.message);
  }

  return <div className="session-import">
    <button ref={launcherRef} type="button" disabled={disabled || reading || candidate !== null} onClick={() => inputRef.current?.click()}>Import session</button>
    <input ref={inputRef} type="file" accept=".json,application/json" aria-label="Import session JSON" hidden onChange={selectFile} />
    {reading && <p role="status">Reading session…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {candidate && <dialog ref={dialogRef} className="session-import-confirmation" aria-modal="true"
      aria-labelledby="session-import-title" aria-describedby="session-import-description"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); closeConfirmation(); }}>
      <h3 id="session-import-title">Replace current session?</h3>
      <p id="session-import-description">Importing this session will replace the current events and player roster. The current video will be detached.</p>
      <div className="session-import-confirmation-actions">
        <button ref={cancelRef} type="button" autoFocus onClick={closeConfirmation}>Cancel</button>
        <button className="button-primary" type="button" disabled={disabled} onClick={() => { if (!disabled) { dialogRef.current?.close(); onImport(candidate); setCandidate(null); } }}>Import session</button>
      </div>
    </dialog>}
  </div>;
}
