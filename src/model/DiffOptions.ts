type RgbColor = [number, number, number];

export interface DiffOptions {
	/**
	 * Image-level threshold (ranges from 0 to 1).
	 * The two images are considered different
	 * if the number of different pixels > the total number of pixels * tolerance.
	 */
	tolerance: number;

	/**
	 * Pixel-level threshold (ranges from 0 to 1).
	 * Smaller values make the comparison more sensitive. 0.1 by default.
	 */
	sensitivity?: number;

	/**
	 * If true, disables detecting and ignoring anti-aliased pixels. false by default.
	 */
	includeAA?: boolean;

	/**
	* Blending factor of unchanged pixels in the diff output.
	Ranges from 0 for pure white to 1 for original brightness. 0.1 by default.
	*/
	alpha?: number;

	/**
	 * The color of anti-aliased pixels in the diff output in [R, G, B] format.
	 * [255, 255, 0] by default.
	 */
	aaColor?: RgbColor;

	/**
	 * The color of differing pixels in the diff output in [R, G, B] format.
	 * [255, 0, 0] by default.
	 */
	diffColor?: RgbColor;

	/**
	 * An alternative color to use for dark on light differences
	 * to differentiate between "added" and "removed" parts.
	 * If not provided, all differing pixels use the color specified by diffColor.
	 * null by default.
	 */
	diffColorAlt?: RgbColor;

	/**
	 * Draw the diff over a transparent background (a mask),
	 * rather than over the original image. Will not draw anti-aliased pixels (if detected).
	 */
	diffMask?: boolean;
}

export default DiffOptions;
