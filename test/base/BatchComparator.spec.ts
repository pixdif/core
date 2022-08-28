import BatchComparator from '../../src/base/BatchComparator';

it('compares multiple files', async () => {
	const cmp = new BatchComparator('output/batch');
	cmp.addTask({
		name: 'shape to shape',
		path: 'test/sample/shape-to-shape.yaml',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/shape.pdf',
	});
	cmp.addTask({
		name: 'shape to square',
		path: 'test/sample/shape-to-square.yaml',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/square.pdf',
	});
	cmp.addTask({
		name: 'expected not found',
		path: 'test/sample/expected-not-found.yaml',
		expected: 'test/sample/not-found.pdf',
		actual: 'test/sample/square.pdf',
	});
	cmp.addTask({
		name: 'actual not found',
		path: 'test/sample/actual-not-found.yaml',
		expected: 'test/sample/shape.pdf',
		actual: 'test/sample/not-found.pdf',
	});
	const report = await cmp.exec();
	await report.save();
});
