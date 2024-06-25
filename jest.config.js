/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
export default {
	testEnvironment: 'node',
	collectCoverageFrom: [
		'src/**/*.ts',
	],
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^@pixdif/(.*)\\.js$': '<rootDir>/src/$1',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: 'test/tsconfig.json',
			},
		],
	},
};
