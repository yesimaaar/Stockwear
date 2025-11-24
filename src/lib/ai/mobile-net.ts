import { normalizeL2 } from "./embedding-utils";

const EMBEDDING_ENDPOINT = "/api/recognizer/embed";

export type EmbeddableInput =
	| HTMLVideoElement
	| HTMLImageElement
	| HTMLCanvasElement
	| ImageBitmap
	| ImageData;

function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.floor(width));
	canvas.height = Math.max(1, Math.floor(height));
	return canvas;
}

function extractBase64(dataUrl: string): string {
	const commaIndex = dataUrl.indexOf(",");
	return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function drawInputToCanvas(input: EmbeddableInput): { canvas: HTMLCanvasElement; mimeType: string } {
	if (typeof window === "undefined") {
		throw new Error("El reconocimiento visual solo está disponible en el navegador.");
	}

	const targetMime = "image/jpeg";

	if (input instanceof HTMLCanvasElement) {
		return { canvas: input, mimeType: targetMime };
	}

	const width =
		input instanceof HTMLVideoElement
			? input.videoWidth || input.width || 1
			: input instanceof HTMLImageElement
				? input.naturalWidth || input.width || 1
				: input instanceof ImageBitmap
					? input.width || 1
					: input instanceof ImageData
						? input.width || 1
						: 1;

	const height =
		input instanceof HTMLVideoElement
			? input.videoHeight || input.height || 1
			: input instanceof HTMLImageElement
				? input.naturalHeight || input.height || 1
				: input instanceof ImageBitmap
					? input.height || 1
					: input instanceof ImageData
						? input.height || 1
						: 1;

	const canvas = createCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("No se pudo preparar un contexto de dibujo para la imagen.");
	}

	if (input instanceof ImageData) {
		context.putImageData(input, 0, 0);
	} else {
		context.drawImage(input as CanvasImageSource, 0, 0, canvas.width, canvas.height);
	}

	return { canvas, mimeType: targetMime };
}

async function encodeInputToBase64(input: EmbeddableInput): Promise<{ base64: string; mimeType: string }> {
	const { canvas, mimeType } = drawInputToCanvas(input);
	const quality = 0.92;
	let dataUrl: string;

	try {
		dataUrl = canvas.toDataURL(mimeType, quality);
	} catch (error) {
		console.error("No se pudo serializar la imagen a base64", error);
		throw new Error("No fue posible preparar la imagen para el reconocimiento.");
	}

	const base64 = extractBase64(dataUrl);
	if (!base64) {
		throw new Error("No se pudo preparar la imagen para el reconocimiento.");
	}

	return { base64, mimeType };
}

export async function preloadEmbeddingModel(): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}

	try {
		await fetch(EMBEDDING_ENDPOINT, { method: "HEAD" });
	} catch (_error) {
		// Ignoramos fallos silenciosos; la llamada real se encargará de reportar errores.
	}
}

export async function generateEmbedding(input: EmbeddableInput): Promise<Float32Array> {
	if (typeof window === "undefined") {
		throw new Error("El reconocimiento visual solo está disponible en el navegador.");
	}

	const { base64, mimeType } = await encodeInputToBase64(input);

	const response = await fetch(EMBEDDING_ENDPOINT, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ imageBase64: base64, mimeType }),
	});

	const responseText = await response.text();
	let parsed: { embedding?: number[]; message?: string } | null = null;
	if (responseText) {
		try {
			parsed = JSON.parse(responseText) as { embedding?: number[]; message?: string };
		} catch (_error) {
			parsed = null;
		}
	}

	if (!response.ok || !parsed?.embedding || !Array.isArray(parsed.embedding)) {
		const reason = parsed?.message || `El servicio remoto devolvió ${response.status}.`;
		throw new Error(reason);
	}

	const vector = Float32Array.from(parsed.embedding);
	return normalizeL2(vector);
}
