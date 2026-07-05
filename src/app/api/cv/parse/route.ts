import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is larger than 8 MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    let text = "";

    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported format. Upload a PDF, DOCX or TXT file." },
        { status: 415 }
      );
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (text.length < 100) {
      return NextResponse.json(
        {
          error:
            "Very little text came out of that file. If it is a scanned or image-based PDF, export a text-based version and try again.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, filename: file.name });
  } catch (err) {
    console.error("CV parse failed:", err);
    return NextResponse.json(
      { error: "Could not read that file. Try re-exporting it as PDF or DOCX." },
      { status: 500 }
    );
  }
}
