import path from 'path';
import { Parser } from '@pixdif/parser';

export type ParserType = new(filePath: string) => Parser;

interface ParserModule extends ParserType {
	default?: ParserType;
}

export default async function parse(filePath: string): Promise<Parser> {
	const ext = path.extname(filePath).substring(1);
	try {
		const ParserModule = await import(`@pixdif/${ext}-parser`) as ParserModule;
		const ParserClass: ParserType = ParserModule.default ?? ParserModule;
		return new ParserClass(filePath);
	} catch (error) {
		throw new Error(`Failed to parse ${filePath}. Please install @pixdif/${ext}-parser and try again.`);
	}
}
