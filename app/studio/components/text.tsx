import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";
import type { Size, Tone } from "./types";
import styles from "./components.module.css";

type TextElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
export type TextVariant = "heading" | "paragraph" | "label" | "caption";

export type TextProps<T extends TextElement = "p"> = Omit<ComponentPropsWithoutRef<T>, "as" | "size"> & {
  /** Typography style, independent of the rendered element. Defaults to `paragraph`. */
  variant?: TextVariant;
  /** Defaults to `md`. */
  size?: Size;
  /** Semantic text color. Defaults to `neutral`. */
  tone?: Tone;
  /** Native element. Defaults to `h2` for headings, `p` for paragraphs, and `span` otherwise. */
  as?: T;
};

export function Text<T extends TextElement = "p">({
  as,
  variant = "paragraph",
  size = "md",
  tone = "neutral",
  className,
  ...props
}: TextProps<T>) {
  const Element: TextElement = as ?? (variant === "heading" ? "h2" : variant === "paragraph" ? "p" : "span");

  return (
    <Element
      {...props}
      className={cx(styles.text, className)}
      data-variant={variant}
      data-size={size}
      data-tone={tone}
    />
  );
}
