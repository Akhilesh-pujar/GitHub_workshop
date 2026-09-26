#!/usr/bin/env node
/**
 * DevPulse Automated Validation Script
 * Used in CI/CD pipeline to test pull requests from students
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let hasErrors = false;
function logPass(msg) {
  console.log(`\x1b[32m  ✓ PASS:\x1b[0m ${msg}`);
}
function logFail(msg) {
  console.error(`\x1b[31m  ✗ FAIL:\x1b[0m ${msg}`);
  hasErrors = true;
}

console.log('\n========================================');
console.log(' DevPulse CI Automated Test Suite');
console.log('========================================\n');

// Detect base directory (root or GItHub folder)
const baseDir = fs.existsSync(path.join(__dirname, '../data'))
  ? path.join(__dirname, '..')
  : fs.existsSync(path.join(__dirname, '../GItHub/data'))
  ? path.join(__dirname, '../GItHub')
  : process.cwd();

const dataDir = path.join(baseDir, 'data');
const studentsDir = path.join(dataDir, 'students');
const registryFile = path.join(dataDir, 'registry.json');
const jsDir = path.join(baseDir, 'js');

// 1. Verify registry.json
console.log('1. Checking data/registry.json integrity...');
let registry = [];
if (!fs.existsSync(registryFile)) {
  logFail(`data/registry.json file does not exist at ${registryFile}`);
} else {
  try {
    const raw = fs.readFileSync(registryFile, 'utf8');
    registry = JSON.parse(raw);
    if (!Array.isArray(registry)) {
      logFail('data/registry.json must contain a JSON array of student filenames');
    } else {
      logPass(`data/registry.json is valid JSON with ${registry.length} registered entries`);
    }
  } catch (err) {
    logFail(`data/registry.json syntax error: ${err.message}`);
  }
}

// 2. Verify all registered student profiles
console.log('\n2. Verifying registered student profiles in data/students/...');
if (Array.isArray(registry)) {
  registry.forEach((filename) => {
    const filePath = path.join(studentsDir, filename);
    if (!fs.existsSync(filePath)) {
      logFail(`Profile listed in registry not found on disk: data/students/${filename}`);
      return;
    }

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const required = ['username', 'name', 'skills', 'stats'];
      const missing = required.filter((key) => !content[key]);

      if (missing.length > 0) {
        logFail(`data/students/${filename} missing required keys: [${missing.join(', ')}]`);
        return;
      }

      if (!Array.isArray(content.skills) || content.skills.length === 0) {
        logFail(`data/students/${filename} "skills" must be a non-empty array of strings`);
        return;
      }

      const statKeys = ['debugging', 'caffeine', 'promptCrafting', 'lateNightCoding'];
      for (const sk of statKeys) {
        if (typeof content.stats[sk] !== 'number' || content.stats[sk] < 0 || content.stats[sk] > 100) {
          logFail(`data/students/${filename} stat "${sk}" must be a number between 0 and 100`);
          return;
        }
      }

      logPass(`data/students/${filename} valid profile for @${content.username}`);
    } catch (err) {
      logFail(`data/students/${filename} JSON parse error: ${err.message}`);
    }
  });
}

// 3. Verify JavaScript syntax
console.log('\n3. Verifying JavaScript files syntax...');
const jsFiles = ['app.js', 'arcade.js', 'battle-arena.js', 'audio.js'];
jsFiles.forEach((file) => {
  const fullPath = path.join(jsDir, file);
  if (fs.existsSync(fullPath)) {
    try {
      execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
      logPass(`Syntax check passed for js/${file}`);
    } catch (err) {
      logFail(`Syntax check failed for js/${file}: ${err.message}`);
    }
  } else {
    logFail(`Expected JavaScript file not found: js/${file}`);
  }
});

console.log('\n========================================');
if (hasErrors) {
  console.error('\x1b[31m CI Test Suite Failed: Fix the issues above before merging.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m ✓ All CI Validation Checks Passed Successfully!\x1b[0m\n');
  process.exit(0);
}
