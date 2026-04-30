import type { Parser } from "./common.js";
import { ao3Parser } from "./ao3.js";
import { ffnParser } from "./ffn.js";
import { royalRoadParser } from "./royalroad.js";
import { tapasParser } from "./tapas.js";
import { scribbleHubParser } from "./scribblehub.js";
import { wattpadParser } from "./wattpad.js";
import { spaceBattlesParser, sufficientVelocityParser, questionableQuestingParser } from "./xenforo.js";

const parsers: Parser[] = [
  ao3Parser,
  ffnParser,
  royalRoadParser,
  tapasParser,
  scribbleHubParser,
  wattpadParser,
  spaceBattlesParser,
  sufficientVelocityParser,
  questionableQuestingParser,
];

export function detectParser(url: string): Parser | null {
  return parsers.find((parser) => parser.pattern.test(url)) ?? null;
}

export function isFicPage(url: string): boolean {
  return detectParser(url) !== null;
}

export {
  ao3Parser,
  ffnParser,
  royalRoadParser,
  tapasParser,
  scribbleHubParser,
  wattpadParser,
  spaceBattlesParser,
  sufficientVelocityParser,
  questionableQuestingParser,
};
export type { Parser };
