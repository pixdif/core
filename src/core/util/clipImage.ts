interface RawImage {
	readonly width: number;
	readonly height: number;
	readonly data: Buffer;
}

interface Rect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Clip an image.
 * @param img
 * @param rect clipping rectangle
 * @return clipped image
 */
export default function clipImage(img: RawImage, rect: Rect): Buffer {
	const iStep = img.width * 4;

	const dStep = rect.width * 4;
	const data = Buffer.alloc(dStep * rect.height);

	let i = rect.x * 4;
	let d = 0;
	for (let y = 0; y < rect.height; y++) {
		img.data.copy(data, d, i, i + dStep);
		i += iStep;
		d += dStep;
	}

	return data;
}
