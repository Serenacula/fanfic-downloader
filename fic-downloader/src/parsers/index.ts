import type { Parser } from "./common.js";
import { ao3Parser } from "./ao3.js";
import { ffnParser } from "./ffn.js";

const parsers: Parser[] = [ao3Parser, ffnParser];

export function detectParser(url: string): Parser | null {
  return parsers.find((parser) => parser.pattern.test(url)) ?? null;
}

export function isFicPage(url: string): boolean {
  return detectParser(url) !== null;
}

export { ao3Parser, ffnParser };
export type { Parser };
