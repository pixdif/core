import {
	Outline,
	OutlineProperties,
	Page,
} from '@pixdif/parser';
import SingleImage from './SingleImagePage';

interface Properties extends OutlineProperties {
	location: string;
}

export default class SingleImageOutline extends Outline {
	protected pageNum = 1;

	protected location: string;

	constructor(title: string, props: Properties) {
		super(title, props);
		this.location = props.location;
	}

	override async getPageNum(): Promise<number> {
		return this.pageNum;
	}

	override async getPage(index: number): Promise<Page> {
		if (index < 0 || index >= await this.getPageNum()) {
			throw new Error(`Invalid page index: ${index}`);
		}
		return new SingleImage('Page 1', this.location);
	}
}
