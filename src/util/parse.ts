import path from 'path';
import Parser from '@pixdif/parser';

export type ParserType = new(filePath: string) => Parser;

export default function parse(filePath: string): Parser {
	const ext = path.extname(filePath).substring(1);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const ParserModule = require(`@pixdif/${ext}-parser`);
	const ParserClass: ParserType = ParserModule.default || ParserModule;
	return new ParserClass(filePath);
}
