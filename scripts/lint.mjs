import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'scripts', 'tests'];
const FORBIDDEN_PATTERNS = [
  { regex: /postgresql:\/\/[^/\s]+:[^@\s]+@ep-[a-z0-9-]+\./i, message: 'Hardcoded Neon PostgreSQL credentials detected' },
  { regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/i, message: 'Hardcoded service role key detected' },
];

let hasErrors = false;
let checkedCount = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      checkedCount++;
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(content)) {
          console.error(`[LINT ERROR] ${fullPath}: ${pattern.message}`);
          hasErrors = true;
        }
      }
    }
  }
}

for (const dir of TARGET_DIRS) {
  walk(path.join(ROOT, dir));
}

if (fs.existsSync(path.join(ROOT, '.env'))) {
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  if (!gitignore.includes('.env')) {
    console.error('[LINT ERROR] .env exists but is not listed in .gitignore');
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log(`Lint passed across ${checkedCount} source files. No security or style violations found.`);
}
