// eslint-disable-next-line no-undef
module.exports = {
    verbose: true,
    testMatch: ["<rootDir>/tests/**/*.test.{js,ts}"],
    moduleNameMapper: {
        "^src/(.*)": "<rootDir>/src/$1"
    }
};
