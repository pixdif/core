import path from 'path';
import Parser from '@pixdif/parser';

export type ParserType = new(filePath: string) => Parser;

export default function parse(filePath: string): Parser {
	const ext = path.extname(filePath).substring(1);
	try {
		/*
			eslint-disable-next-line
			import/no-dynamic-require,
			global-require,
			@typescript-eslint/no-var-requires
		*/
		const ParserModule = require(`@pixdif/${ext}-parser`);
		const ParserClass: ParserType = ParserModule.default ?? ParserModule;
		return new ParserClass(filePath);
	} catch (error) {
		throw new Error(`Failed to parse ${filePath}. Please install @pixdif/${ext}-parser and try again.`);
	}
}
