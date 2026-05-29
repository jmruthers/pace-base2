#!/usr/bin/env node

/**
 * pace-base2 validate wrapper: runs local guardrails before pace-core validate.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = process.cwd();

function runStep(label, command, args) {
  console.log(`\n[validate-app] ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runStep('lint:no-disable', 'npm', ['run', 'lint:no-disable']);
runStep('lint:export-limit', 'npm', ['run', 'lint:export-limit']);

const paceCoreValidate = path.join(
  rootDir,
  'node_modules',
  '@solvera',
  'pace-core',
  'scripts',
  'validate.cjs'
);

runStep('pace-core validate', 'node', [paceCoreValidate]);
