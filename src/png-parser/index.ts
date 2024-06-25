import fs from 'fs';

import { Parser, Outline, Page } from '@pixdif/parser';
import PngFrame from './PngFrame.js';

export default class PngParser extends Parser {
	#open = false;

	override async getPageNum(): Promise<number> {
		return this.#open ? 1 : 0;
	}

	async getPage(index: number): Promise<Page> {
		if (this.#open && index === 0) {
			return new PngFrame('Portable Network Graphics', this.filePath);
		}
		throw new Error(`Out of bound: ${index}`);
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
