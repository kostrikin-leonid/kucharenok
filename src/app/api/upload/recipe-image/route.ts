import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";
import {
  assertRecipeImageUpload,
  bufferToRecipeWebp,
} from "@/lib/images/recipe-image";
import { uk } from "@/lib/i18n/uk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Потрібна авторизація" },
      { status: 401 },
    );
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary не налаштовано" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: uk.aiImport.errors.invalidType },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: uk.aiImport.errors.invalidType },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    assertRecipeImageUpload(buf.length, file.type, file.name);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const msg =
      code === "FILE_TOO_LARGE"
        ? uk.aiImport.errors.fileTooLarge
        : uk.aiImport.errors.invalidType;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let webp: Buffer;
  try {
    webp = await bufferToRecipeWebp(buf, file.type || "", file.name);
  } catch {
    return NextResponse.json(
      { error: uk.aiImport.errors.invalidType },
      { status: 400 },
    );
  }

  try {
    const dataUri = `data:image/webp;base64,${webp.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "kucharenok/recipes",
      resource_type: "image",
    });

    return NextResponse.json({
      url: result.secure_url,
      secure_url: result.secure_url,
      publicId: result.public_id,
      public_id: result.public_id,
    });
  } catch {
    return NextResponse.json(
      { error: uk.upload.failed },
      { status: 502 },
    );
  }
}
