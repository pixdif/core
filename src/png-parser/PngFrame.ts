import fs from 'fs';
import { Readable } from 'stream';
import { Page } from '@pixdif/parser';

export default class PngFrame extends Page {
	protected title: string;

	protected content: string;

	constructor(title: string, content: string) {
		super();
		this.title = title;
		this.content = content;
	}

	getTitle(): string {
		return this.title;
	}

	isCached(): boolean {
		return fs.existsSync(this.content);
	}

	async render(): Promise<Readable> {
		return fs.createReadStream(this.content);
	}
}
