/** @type {import('jest').Config} */
module.exports = {
 preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFiles: ['<rootDir>/src/__tests__/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  clearMocks: true,
  verbose: true,
  testTimeout: 15000,
};