module.exports = {
	rules: {
		'no-undef': 'off',
		'import/no-extraneous-dependencies': [
			'error',
			{
				devDependencies: true,
				optionalDependencies: true,
				peerDependencies: true,
			},
		],
	},
};
