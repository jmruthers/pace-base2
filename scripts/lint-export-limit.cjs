#!/usr/bin/env node

/**
 * Guardrail for pace-core-compliance/max-named-exports on feature configuration modules.
 * Fails when any feature configuration.ts under src/features exceeds the export limit.
 * Warns when watch-list modules approach the limit (>= 9 exports).
 */

const fs = require('fs');
const path = require('path');

const MAX_NAMED_EXPORTS = 10;
const WARN_THRESHOLD = 9;
const WATCH_FILES = [
  'src/features/formsAuthoring/configuration.ts',
  'src/features/registrationSetup/configuration.ts',
  'src/features/scanningSetup/configuration.ts',
];

function findConfigurationFiles(rootDir) {
  const featuresDir = path.join(rootDir, 'src', 'features');
  if (!fs.existsSync(featuresDir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const configPath = path.join(featuresDir, entry.name, 'configuration.ts');
    if (fs.existsSync(configPath)) {
      files.push(configPath);
    }
  }
  return files.sort();
}

function countNamedExports(source) {
  let count = 0;
  const exportDeclaration =
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\b/gm;
  const exportFrom = /^export\s*\{([^}]+)\}\s*(?:from\s+['"][^'"]+['"])?;?/gm;

  for (const match of source.matchAll(exportDeclaration)) {
    count += 1;
    void match;
  }

  for (const match of source.matchAll(exportFrom)) {
    const specifiers = match[1]
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !part.startsWith('//'));
    count += specifiers.length;
  }

  return count;
}

function main() {
  const rootDir = process.cwd();
  const configFiles = findConfigurationFiles(rootDir);
  const failures = [];
  const warnings = [];

  for (const absolutePath of configFiles) {
    const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');
    const source = fs.readFileSync(absolutePath, 'utf8');
    const exportCount = countNamedExports(source);

    if (exportCount > MAX_NAMED_EXPORTS) {
      failures.push(
        `${relativePath}: ${exportCount} named exports (max ${MAX_NAMED_EXPORTS}). Split queries, mutations, or helpers into separate modules.`
      );
      continue;
    }

    if (WATCH_FILES.includes(relativePath) && exportCount >= WARN_THRESHOLD) {
      warnings.push(
        `${relativePath}: ${exportCount}/${MAX_NAMED_EXPORTS} named exports — split before adding more exports.`
      );
    }
  }

  if (warnings.length > 0) {
    console.warn('Export-limit watch (approaching max-named-exports):');
    for (const warning of warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('Export-limit check failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Export-limit check passed (${configFiles.length} configuration module${configFiles.length === 1 ? '' : 's'}).`
  );
}

main();
