export interface FicChapter {
  index: number;
  title: string | null;
  htmlContent: string;
}

export interface FicImage {
  url: string;
  mimeType: string;
  data: ArrayBuffer;
}

export type FicStatus = "complete" | "in-progress" | "unknown";

export interface FicCore {
  title: string;
  author: string;
  summary: string | null;
  chapters: FicChapter[];
  images: FicImage[];
  tags: string[];
  status: FicStatus;
  wordCount: number | null;
  publishDate: Date | null;
  updateDate: Date | null;
  sourceUrl: string;
}

export interface AO3Metadata {
  fandoms: string[];
  relationships: string[];
  characters: string[];
  additionalTags: string[];
  warnings: string[];
  rating: string | null;
  kudos: number | null;
  bookmarks: number | null;
  hits: number | null;
  language: string | null;
  series: Array<{ name: string; part: number }>;
}

export interface FFNMetadata {
  genres: string[];
  universe: string | null;
  follows: number | null;
  favs: number | null;
  rating: string | null;
  language: string | null;
}

export interface RoyalRoadMetadata {
  tags: string[];
  followers: number | null;
  rating: number | null;
  views: number | null;
}

export interface TapasMetadata {
  genre: string | null;
}

export interface SpaceBattlesMetadata {
  threadUrl: string;
  subForum: string | null;
}

export interface SufficientVelocityMetadata {
  threadUrl: string;
  subForum: string | null;
}

export interface QuestionableQuestingMetadata {
  threadUrl: string;
  subForum: string | null;
}

export interface FanficsDotNetMetadata {
  fandom: string | null;
  rating: string | null;
}

export interface WattpadMetadata {
  genre: string | null;
  reads: number | null;
  votes: number | null;
}

export type FicData =
  | { site: "ao3"; core: FicCore; meta: AO3Metadata }
  | { site: "ffn"; core: FicCore; meta: FFNMetadata }
  | { site: "royalroad"; core: FicCore; meta: RoyalRoadMetadata }
  | { site: "tapas"; core: FicCore; meta: TapasMetadata }
  | { site: "spacebattles"; core: FicCore; meta: SpaceBattlesMetadata }
  | { site: "sufficientvelocity"; core: FicCore; meta: SufficientVelocityMetadata }
  | { site: "questionablequesting"; core: FicCore; meta: QuestionableQuestingMetadata }
  | { site: "fanficsdotnet"; core: FicCore; meta: FanficsDotNetMetadata }
  | { site: "wattpad"; core: FicCore; meta: WattpadMetadata };

export type SiteId = FicData["site"];

