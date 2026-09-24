export function cx(...classNames: (string | false | null | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}
