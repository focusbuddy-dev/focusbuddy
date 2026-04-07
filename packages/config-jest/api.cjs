const baseConfig = require('./base.cjs');

module.exports = {
  ...baseConfig,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testEnvironment: 'node',
};
