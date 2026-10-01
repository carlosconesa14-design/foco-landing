import { generatedIcon } from "../art/generated";

/** Stable assignment of the eight original generated portraits; saved executives stay unchanged. */
export function executivePortrait(name: string): string {
  const variant = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 8;
  return generatedIcon(`exec_${variant}`, "exec-portrait");
}
