import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";

import { isRemoteEmbeddingEnabled, requestRemoteEmbedding } from "@/lib/server/external-embedding-client";

export const runtime = "nodejs";

export async function HEAD(): Promise<Response> {
  if (!isRemoteEmbeddingEnabled()) {
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as { imageBase64?: string; mimeType?: string };
    const { imageBase64, mimeType } = payload ?? {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ message: "Falta el contenido de la imagen en base64." }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(imageBase64, "base64");
    } catch (_error) {
      return NextResponse.json({ message: "La imagen recibida no es válida." }, { status: 400 });
    }

    if (!isRemoteEmbeddingEnabled()) {
      return NextResponse.json({ message: "El servicio remoto de embeddings no está disponible." }, { status: 503 });
    }

    const vector = await requestRemoteEmbedding({
      buffer,
      mimeType,
      productId: "shoe-recognizer",
    });

    return NextResponse.json({ embedding: Array.from(vector) }, { status: 200 });
  } catch (error) {
    console.error("Error generando embedding para el reconocedor", error);
    return NextResponse.json(
      {
        message: "No se pudo generar el embedding para la imagen proporcionada.",
      },
      { status: 500 },
    );
  }
}
