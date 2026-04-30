import type { FicData } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";

const NO_WARNING_VALUES = new Set([
  "No Archive Warnings Apply",
]);

function isVisible(fields: Partial<Record<string, boolean>> | undefined, key: string): boolean {
  return fields?.[key] !== false;
}

const TH = `style="text-align:left;font-weight:normal;vertical-align:top;padding:0.2em 1em 0.2em 0;color:#666"`;

function row(label: string, value: string | null | undefined, visible = true): string {
  if (!visible || value == null || value === "") return "";
  return `<tr><th ${TH}>${escHtml(label)}</th><td>${escHtml(value)}</td></tr>`;
}

function tagRow(label: string, tags: string[], visible = true): string {
  if (!visible || tags.length === 0) return "";
  return `<tr><th ${TH}>${escHtml(label)}</th><td>${tags.map(escHtml).join(", ")}</td></tr>`;
}

function linkRow(label: string, url: string, visible = true): string {
  if (!visible) return "";
  return `<tr><th ${TH}>${escHtml(label)}</th><td><a href="${escHtml(url)}">${escHtml(url)}</a></td></tr>`;
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function renderStoryInfoHtml(data: FicData, settings: Settings): string {
  const { core } = data;
  const fields = settings.storyInfoFields;

  let metaRows = "";

  metaRows += row("Status", core.status === "complete" ? "Complete" : core.status === "in-progress" ? "In Progress" : null, isVisible(fields, "status"));
  metaRows += row("Words", core.wordCount?.toLocaleString() ?? null, isVisible(fields, "wordCount"));
  metaRows += row("Published", formatDate(core.publishDate), isVisible(fields, "publishDate"));
  metaRows += row("Updated", formatDate(core.updateDate), isVisible(fields, "updateDate"));

  if (data.site === "ao3") {
    const { meta } = data;
    metaRows += tagRow("Fandom", meta.fandoms, isVisible(fields, "fandoms"));
    metaRows += row("Rating", meta.rating, isVisible(fields, "rating"));
    const shownWarnings = meta.warnings.filter((w) => !NO_WARNING_VALUES.has(w));
    metaRows += tagRow("Warnings", shownWarnings, isVisible(fields, "warnings"));
    metaRows += tagRow("Relationships", meta.relationships, isVisible(fields, "relationships"));
    metaRows += tagRow("Characters", meta.characters, isVisible(fields, "characters"));
    metaRows += tagRow("Additional Tags", meta.additionalTags, isVisible(fields, "tags"));
    metaRows += row("Language", meta.language, isVisible(fields, "language"));
    metaRows += row("Views", meta.hits?.toLocaleString() ?? null, isVisible(fields, "views"));
    if (meta.series.length > 0 && isVisible(fields, "series")) {
      const seriesText = meta.series.map((s) => `${s.name} (Part ${s.part})`).join(", ");
      metaRows += row("Series", seriesText);
    }
    metaRows += row("Kudos", meta.kudos?.toLocaleString() ?? null, isVisible(fields, "kudos"));
    metaRows += row("Bookmarks", meta.bookmarks?.toLocaleString() ?? null, isVisible(fields, "bookmarks"));
  } else if (data.site === "ffn") {
    const { meta } = data;
    metaRows += tagRow("Genre", meta.genres, isVisible(fields, "genres"));
    metaRows += row("Rating", meta.rating, isVisible(fields, "rating"));
    metaRows += row("Language", meta.language, isVisible(fields, "language"));
    metaRows += row("Follows", meta.follows?.toLocaleString() ?? null, isVisible(fields, "followers"));
    metaRows += row("Favourites", meta.favs?.toLocaleString() ?? null, isVisible(fields, "favorites"));
  } else if (data.site === "royalroad") {
    const { meta } = data;
    metaRows += tagRow("Tags", meta.tags, isVisible(fields, "tags"));
    metaRows += row("Overall Rating", meta.rating !== null ? meta.rating.toFixed(2) : null, isVisible(fields, "rating"));
    metaRows += row("Ratings", meta.ratingCount?.toLocaleString() ?? null, isVisible(fields, "ratingCount"));
    metaRows += row("Views", meta.views?.toLocaleString() ?? null, isVisible(fields, "views"));
    metaRows += row("Followers", meta.followers?.toLocaleString() ?? null, isVisible(fields, "followers"));
    metaRows += row("Favourites", meta.favorites?.toLocaleString() ?? null, isVisible(fields, "favorites"));
  } else if (data.site === "scribblehub") {
    const { meta } = data;
    metaRows += tagRow("Genres", meta.genres, isVisible(fields, "genres"));
    metaRows += tagRow("Tags", meta.tags, isVisible(fields, "tags"));
    metaRows += row("Rating", meta.rating, isVisible(fields, "rating"));
    metaRows += row("Views", meta.views?.toLocaleString() ?? null, isVisible(fields, "views"));
    metaRows += row("Favourites", meta.favorites?.toLocaleString() ?? null, isVisible(fields, "favorites"));
  } else if (data.site === "wattpad") {
    const { meta } = data;
    metaRows += row("Genre", meta.genre, isVisible(fields, "genres"));
    metaRows += row("Reads", meta.reads?.toLocaleString() ?? null, isVisible(fields, "views"));
    metaRows += row("Votes", meta.votes?.toLocaleString() ?? null, isVisible(fields, "votes"));
  } else if (data.site === "tapas") {
    const { meta } = data;
    metaRows += row("Genre", meta.genre, isVisible(fields, "genres"));
  } else if (
    data.site === "spacebattles" ||
    data.site === "sufficientvelocity" ||
    data.site === "questionablequesting"
  ) {
    const { meta } = data;
    metaRows += row("Forum", meta.subForum, isVisible(fields, "subForum"));
  }

  metaRows += linkRow("Source", core.sourceUrl, isVisible(fields, "sourceUrl"));

  const titleHtml = isVisible(fields, "title") ? `<h1>${escHtml(core.title)}</h1>` : "";
  const authorHtml = isVisible(fields, "author") ? `<p class="author"><em>by ${escHtml(core.author)}</em></p>` : "";
  const summaryHtml = core.summary && isVisible(fields, "summary")
    ? `<div class="summary"><h2>Summary</h2><div>${core.summary}</div></div>`
    : "";

  return `<div class="story-info">
  ${titleHtml}
  ${authorHtml}
  ${summaryHtml}
  ${metaRows ? `<table class="meta">${metaRows}</table>` : ""}
</div>`;
}

export function renderStoryInfoText(data: FicData, settings: Settings): string {
  const { core } = data;
  const fields = settings.storyInfoFields;
  const lines: string[] = [];

  lines.push(core.title);
  lines.push(`by ${core.author}`);
  lines.push("");

  if (core.summary) {
    const doc = new DOMParser().parseFromString(core.summary, "text/html");
    lines.push(doc.body.textContent?.trim() ?? "");
    lines.push("");
  }

  if (data.site === "ao3") {
    const { meta } = data;
    if (meta.fandoms.length > 0 && isVisible(fields, "fandoms")) {
      lines.push(`Fandom: ${meta.fandoms.join(", ")}`);
    }
    if (meta.rating && isVisible(fields, "rating")) lines.push(`Rating: ${meta.rating}`);
    if (meta.relationships.length > 0 && isVisible(fields, "relationships")) {
      lines.push(`Relationships: ${meta.relationships.join(", ")}`);
    }
  } else if (data.site === "ffn") {
    const { meta } = data;
    if (meta.genres.length > 0 && isVisible(fields, "genres")) {
      lines.push(`Genres: ${meta.genres.join(", ")}`);
    }
  }

  if (core.wordCount && isVisible(fields, "wordCount")) {
    lines.push(`Words: ${core.wordCount.toLocaleString()}`);
  }
  if (core.status !== "unknown") {
    lines.push(`Status: ${core.status === "complete" ? "Complete" : "In Progress"}`);
  }

  lines.push("");
  return lines.join("\n");
}
