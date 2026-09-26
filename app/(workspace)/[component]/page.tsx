import { componentIds } from "../../studio/tokens";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...componentIds, "colors", "spacing"].map((component) => ({ component }));
}

export default function ComponentDesignPage() {
  return null;
}
