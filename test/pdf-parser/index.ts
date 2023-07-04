import fs from 'fs';

import { Parser, Outline, Page } from '@pixdif/parser';
import PngFrame from '@pixdif/png-parser/PngFrame';

export default class PdfParser extends Parser {
	#open = false;

	override async getPageNum(): Promise<number> {
		if (!this.#open) {
			return 0;
		}
		return this.filePath.endsWith('logo.pdf') ? 2 : 1;
	}

	async getPage(index: number): Promise<Page> {
		const pageNum = await this.getPageNum();
		if (index >= pageNum) {
			throw new Error(`Out of bound: ${index}`);
		}

		const fileName = this.filePath.substring(0, this.filePath.length - 4);
		return new PngFrame(`Page ${index + 1}`, `${fileName}.png`);
	}

	// eslint-disable-next-line class-methods-use-this
	override async getOutline(): Promise<Outline[]> {
		return [];
	}

	protected override async openFile(): Promise<void> {
		if (fs.existsSync(this.filePath)) {
			this.#open = true;
		}
	}

	protected override async closeFile(): Promise<void> {
		if (this.#open) {
			this.#open = false;
		}
	}
}
