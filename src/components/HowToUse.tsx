import { useRef, useState } from "react";
import HowToUsePanel from "./HowToUsePanel";

export default function HowToUse() {
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  function closeHelp() {
    setIsHowToUseOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        className="how-to-use-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isHowToUseOpen}
        aria-controls={isHowToUseOpen ? "how-to-use-panel" : undefined}
        onClick={() => setIsHowToUseOpen(true)}
      >
        How to use
      </button>
      {isHowToUseOpen && <HowToUsePanel onClose={closeHelp} />}
    </>
  );
}
