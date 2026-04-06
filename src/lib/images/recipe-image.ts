import sharp from "sharp";

/** Максимум 10 МБ (узгоджено з повідомленнями валідації) */
export const RECIPE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function isHeicLike(mime: string, filename: string): boolean {
  const m = mime.toLowerCase();
  if (m === "image/heic" || m === "image/heif") return true;
  const f = filename.toLowerCase();
  return f.endsWith(".heic") || f.endsWith(".heif");
}

function extensionLooksLikeImage(filename: string): boolean {
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(filename);
}

/**
 * Перевірка типу та розміру перед обробкою.
 * Коди помилок — перекладаються в API на українську.
 */
export function assertRecipeImageUpload(
  size: number,
  mime: string,
  filename: string,
): void {
  if (size > RECIPE_IMAGE_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const m = mime.toLowerCase();
  const allowedMime =
    m === "image/jpeg" ||
    m === "image/png" ||
    m === "image/webp" ||
    m === "image/gif" ||
    m === "image/heic" ||
    m === "image/heif" ||
    m === "application/octet-stream" ||
    m === "";
  if (!allowedMime && !extensionLooksLikeImage(filename)) {
    throw new Error("INVALID_TYPE");
  }
}

async function toSharpPipeline(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<sharp.Sharp> {
  let work = buffer;
  if (isHeicLike(mime, filename)) {
    const convert = (await import("heic-convert")).default;
    const out = await convert({
      buffer,
      format: "JPEG",
      quality: 1,
    });
    work = Buffer.from(out);
  }
  return sharp(work, { animated: false, failOn: "truncated" }).rotate();
}

/** Зберігання в public/uploads — WebP для вебу */
export async function bufferToRecipeWebp(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<Buffer> {
  const pipe = await toSharpPipeline(buffer, mime, filename);
  return pipe.webp({ quality: 86 }).toBuffer();
}

/** JPEG для Vision API (розпізнавання тексту на фото, без генерації зображень) */
export async function bufferToVisionJpeg(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<Buffer> {
  const pipe = await toSharpPipeline(buffer, mime, filename);
  return pipe.jpeg({ quality: 88 }).toBuffer();
}
