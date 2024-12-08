module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': [ '@swc/jest' ],
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx,js,jsx}',
        '!**/*.d.ts',
    ],
    testPathIgnorePatterns: [ '/lib/', '/node_modules/', '/dist/' ],
    moduleNameMapper: {
        '^@errors/(.*)$': '<rootDir>/src/errors/$1',
        '^@structs/(.*)$': '<rootDir>/src/structs/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
    },
};
