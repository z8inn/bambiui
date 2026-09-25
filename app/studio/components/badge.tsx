import type { ComponentProps, ReactNode } from "react";
import { cx } from "../cx";
import type { Size, Tone } from "./types";
import styles from "./components.module.css";

export type BadgeProps = ComponentProps<"span"> & {
  /** Fill style. Defaults to `outline`, which uses the badge component tokens. */
  variant?: "solid" | "subtle" | "outline";
  /** Semantic color role. Defaults to `neutral`. */
  tone?: Tone;
  /** Defaults to `md`. */
  size?: Size;
  /** Shows a leading status dot. */
  dot?: boolean;
  /** Decorative icon before the label. */
  startIcon?: ReactNode;
};

export function Badge({
  variant = "outline",
  tone = "neutral",
  size = "md",
  dot = false,
  startIcon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(styles.badge, className)}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
    >
      {dot && <span className={styles.badgeDot} aria-hidden="true" />}
      {startIcon && (
        <span className={styles.decorativeIcon} aria-hidden="true">{startIcon}</span>
      )}
      {children}
    </span>
  );
}
