import fs from 'fs';
import { Parser, Outline, Page } from '@pixdif/parser';

import SingleImageOutline from './SingleImageOutline';
import SingleImage from './SingleImagePage';

export default class SingleImageParser extends Parser {
	override async openFile(): Promise<void> {
		// do nothing
	}

	override async closeFile(): Promise<void> {
		// do nothing
	}

	override async getPageNum(): Promise<number> {
		if (fs.existsSync(this.filePath)) {
			return 1;
		}
		return 0;
	}

	override async getPage(index: number): Promise<Page> {
		if (index < 0 || index >= await this.getPageNum()) {
			throw new Error(`Invalid page index: ${index}`);
		}
		return new SingleImage('Page 1', this.filePath);
	}

	override async getOutline(): Promise<Outline[]> {
		const outline = new SingleImageOutline('Heading 1', {
			location: this.filePath,
			children: [],
		});
		return [outline];
	}
}
