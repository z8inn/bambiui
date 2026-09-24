import { cx } from "../cx";
import styles from "./components.module.css";

/** Decorative progress indicator. Announce loading on the owning control instead. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx(styles.spinner, className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
