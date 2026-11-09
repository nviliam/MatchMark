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
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { if (candidate) cancelRef.current?.focus(); }, [candidate]);

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
    {candidate && <section className="session-import-confirmation" role="alertdialog" aria-label="Replace current session?">
      <h3>Replace current session?</h3>
      <p>Importing this session will replace the current events and player roster. The current video will be detached.</p>
      <button ref={cancelRef} type="button" onClick={() => { setCandidate(null); launcherRef.current?.focus(); }}>Cancel</button>
      <button type="button" disabled={disabled} onClick={() => { if (!disabled) { onImport(candidate); setCandidate(null); } }}>Import session</button>
    </section>}
  </div>;
}
