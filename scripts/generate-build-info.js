#!/usr/bin/env node
// Runs as `prebuild` before `next build`. Writes build-info.json to
// the project root so the runtime server can read framework version
// and build timestamp without embedding them in the bundle.
import { writeFileSync, readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./node_modules/next/package.json', 'utf8'));

const buildInfo = {
  version: pkg.version,
  buildTime: new Date().toISOString(),
};

writeFileSync('build-info.json', JSON.stringify(buildInfo, null, 2));
console.log('Generated build-info.json:', buildInfo);
