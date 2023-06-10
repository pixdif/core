import path from 'path';
import { TestCase } from '@pixdif/model';

export type BatchTaskProps = Omit<TestCase, 'status' | 'details'>;

export class BatchTask {
	protected readonly name: string;

	protected readonly path?: string | undefined;

	protected readonly expected: string;

	protected readonly actual: string;

	protected executionTime?: number | undefined;

	protected comment?: string | undefined;

	constructor(props: BatchTaskProps) {
		this.name = props.name;
		this.path = props.path;
		this.expected = props.expected;
		this.actual = props.actual;
		this.executionTime = props.executionTime;
		this.comment = props.comment;
	}

	getName(): string {
		return this.name;
	}

	getPath(): string | undefined {
		return this.path;
	}

	getUniqueDir(): string {
		if (this.path) {
			const { dir, name } = path.parse(this.path);
			return path.join(dir, name);
		}
		return this.name;
	}

	getExpected(): string {
		return this.expected;
	}

	getActual(): string {
		return this.actual;
	}

	getExecutionTime(): number | undefined {
		return this.executionTime;
	}

	setExecutionTime(time: number): void {
		this.executionTime = time;
	}

	getComment(): string | undefined {
		return this.comment;
	}

	setComment(comment: string): void {
		this.comment = comment;
	}
}

export default BatchTask;
