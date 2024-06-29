# Pixdif
[![Build Status](https://github.com/pixdif/pixdif/workflows/Node.js%20CI/badge.svg?branch=main)](https://github.com/pixdif/pixdif/actions?query=workflow%3ANode.js%20CI+branch%3Amain)
[![Npm Package](https://img.shields.io/npm/v/@pixdif/core.svg)](https://npmjs.org/package/@pixdif/core)

This is a project aimed to compare visual differences of files, originally created to compare PDF files in automated tests.

## License

[MIT](http://opensource.org/licenses/MIT)

### Features
- Compare 2 files and generate diff images.
- Search for files in 2 directories and compare them to generate a test report.
- Save caches for baselines to speed up tests.
- Update baselines just in test reports.
- Extensively support more formats with `@pixdif/***-parser` installed.

## Packages
- Core Modules: [@pixdif/core](https://npmjs.org/package/@pixdif/core)
- Typings: [@pixdif/model](https://npmjs.org/package/@pixdif/model)
- Parser Interface: [@pixdif/parser](https://npmjs.org/package/@pixdif/parser)

## Examples

Compare two PDF files.

```sh
npm install @pixdif/core @pixdif/pdf-parser
```

```ts
import { compare } from '@pixdif/core';

const diffs = await compare('expected.pdf', 'actual.pdf');
for (const { name, expected, actual, diff, ratio } of diffs) {
	console.log(`Page Name: ${name}`);
	console.log(`Expected: ${expected}`);
	console.log(`Actual: ${actual}`);
	console.log(`Diff Mask: ${diff}`);
	console.log(`Ratio: ${ratio}`);
}
```

Compare all PDF files in 2 directories and generate a test report in HTML format.

```sh
npm install @pixdif/core @pixdif/pdf-parser @pixdif/html-reporter
```

```ts
const reportDir = 'test-report';
const cmp = new BatchComparator(reportDir);

cmp.addTask(new BatchTask({
	name: 'task 1',
	expected: 'baseline/a.pdf',
	actual: 'output/b.pdf',
	extra: {
		executionTime: '2346.67ms',
	},
}));

cmp.addTask(new BatchTask({
	name: 'task 2',
	path: 'testCase/a.yaml', // This is optional. Just to mark your test case.
	expected: 'baseline/a.png',
	actual: 'output/b.png',
}));

const report = await cmp.exec();
await report.collect();
report.setFormat('@pixdif/html-reporter');
await report.save();
```
