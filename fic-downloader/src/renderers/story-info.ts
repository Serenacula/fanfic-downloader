import type { FicData } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";

type FieldConfig = { show?: boolean };
type SiteFields = Record<string, FieldConfig | undefined>;

function isVisible(fields: SiteFields | undefined, key: string): boolean {
  return fields?.[key]?.show !== false;
}

function row(label: string, value: string | null | undefined, visible = true): string {
  if (!visible || value == null || value === "") return "";
  return `<tr><th>${escHtml(label)}</th><td>${escHtml(value)}</td></tr>`;
}

function tagRow(label: string, tags: string[], visible = true): string {
  if (!visible || tags.length === 0) return "";
  return `<tr><th>${escHtml(label)}</th><td>${tags.map((tag) => `<span class="tag">${escHtml(tag)}</span>`).join(" ")}</td></tr>`;
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
  const siteFields = settings.storyInfoFields[data.site] as SiteFields | undefined;

  let metaRows = "";

  metaRows += row("Title", core.title);
  metaRows += row("Author", core.author);
  metaRows += row("Status", core.status === "complete" ? "Complete" : core.status === "in-progress" ? "In Progress" : null);
  metaRows += row("Words", core.wordCount?.toLocaleString() ?? null, isVisible(siteFields, "wordCount"));
  metaRows += row("Published", formatDate(core.publishDate), isVisible(siteFields, "publishDate"));
  metaRows += row("Updated", formatDate(core.updateDate), isVisible(siteFields, "updateDate"));

  if (data.site === "ao3") {
    const { meta } = data;
    metaRows += tagRow("Fandom", meta.fandoms, isVisible(siteFields, "fandoms"));
    metaRows += row("Rating", meta.rating, isVisible(siteFields, "rating"));
    metaRows += tagRow("Warnings", meta.warnings, isVisible(siteFields, "warnings"));
    metaRows += tagRow("Relationships", meta.relationships, isVisible(siteFields, "relationships"));
    metaRows += tagRow("Characters", meta.characters, isVisible(siteFields, "characters"));
    metaRows += tagRow("Additional Tags", meta.additionalTags, isVisible(siteFields, "additionalTags"));
    metaRows += row("Language", meta.language, isVisible(siteFields, "language"));
    if (meta.series.length > 0 && isVisible(siteFields, "series")) {
      const seriesText = meta.series.map((s) => `${s.name} (Part ${s.part})`).join(", ");
      metaRows += row("Series", seriesText);
    }
    metaRows += row("Kudos", meta.kudos?.toLocaleString() ?? null, isVisible(siteFields, "kudos"));
    metaRows += row("Bookmarks", meta.bookmarks?.toLocaleString() ?? null, isVisible(siteFields, "bookmarks"));
  } else if (data.site === "ffn") {
    const { meta } = data;
    metaRows += tagRow("Genre", meta.genres, isVisible(siteFields, "genres"));
    metaRows += row("Rating", meta.rating, isVisible(siteFields, "rating"));
    metaRows += row("Language", meta.language, isVisible(siteFields, "language"));
    metaRows += row("Follows", meta.follows?.toLocaleString() ?? null, isVisible(siteFields, "follows"));
    metaRows += row("Favourites", meta.favs?.toLocaleString() ?? null, isVisible(siteFields, "favs"));
  }

  const summaryHtml =
    core.summary
      ? `<div class="summary"><h2>Summary</h2><div>${core.summary}</div></div>`
      : "";

  return `<div class="story-info">
  <h1>${escHtml(core.title)}</h1>
  <p class="author">by ${escHtml(core.author)}</p>
  ${summaryHtml}
  ${metaRows ? `<table class="meta">${metaRows}</table>` : ""}
</div>`;
}

export function renderStoryInfoText(data: FicData, settings: Settings): string {
  const { core } = data;
  const siteFields = settings.storyInfoFields[data.site] as SiteFields | undefined;
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
    if (meta.fandoms.length > 0 && isVisible(siteFields, "fandoms")) {
      lines.push(`Fandom: ${meta.fandoms.join(", ")}`);
    }
    if (meta.rating && isVisible(siteFields, "rating")) lines.push(`Rating: ${meta.rating}`);
    if (meta.relationships.length > 0 && isVisible(siteFields, "relationships")) {
      lines.push(`Relationships: ${meta.relationships.join(", ")}`);
    }
  } else if (data.site === "ffn") {
    const { meta } = data;
    if (meta.genres.length > 0 && isVisible(siteFields, "genres")) {
      lines.push(`Genre: ${meta.genres.join(", ")}`);
    }
  }

  if (core.wordCount && isVisible(siteFields, "wordCount")) {
    lines.push(`Words: ${core.wordCount.toLocaleString()}`);
  }
  if (core.status !== "unknown") {
    lines.push(`Status: ${core.status === "complete" ? "Complete" : "In Progress"}`);
  }

  lines.push("");
  return lines.join("\n");
}
