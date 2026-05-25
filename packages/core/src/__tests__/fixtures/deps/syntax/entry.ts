export * from "./reexport";
import type { X } from "./types-only";
import("./dynamic-literal");
const mod = "./dynamic-var";
import(mod);
export const dummy: X | null = null;
