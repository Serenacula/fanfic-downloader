const WIDTH = 600;
const HEIGHT = 900;
const BG_COLOR = "#2c1e3d";
const TITLE_COLOR = "#f0e6ff";
const AUTHOR_COLOR = "#c9aff0";
const PADDING = 60;

function wrapText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateCoverImage(title: string, author: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative rule
  ctx.strokeStyle = AUTHOR_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, HEIGHT * 0.55);
  ctx.lineTo(WIDTH - PADDING, HEIGHT * 0.55);
  ctx.stroke();

  const maxTextWidth = WIDTH - PADDING * 2;

  // Title
  ctx.fillStyle = TITLE_COLOR;
  ctx.font = "bold 52px serif";
  ctx.textAlign = "center";
  const titleLines = wrapText(ctx, title, maxTextWidth);
  const titleLineHeight = 62;
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const titleStartY = HEIGHT * 0.55 - titleBlockHeight - 20;

  for (const [index, line] of titleLines.entries()) {
    ctx.fillText(line, WIDTH / 2, titleStartY + index * titleLineHeight);
  }

  // Author
  ctx.fillStyle = AUTHOR_COLOR;
  ctx.font = "32px serif";
  const authorLines = wrapText(ctx, author, maxTextWidth);
  const authorLineHeight = 42;
  const authorStartY = HEIGHT * 0.55 + 44;

  for (const [index, line] of authorLines.entries()) {
    ctx.fillText(line, WIDTH / 2, authorStartY + index * authorLineHeight);
  }

  return canvas.convertToBlob({ type: "image/png" });
}
