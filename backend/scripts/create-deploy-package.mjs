import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'deploy');
const bundleName = 'silveroak_backend_distribution';
const bundleDir = path.join(outputRoot, bundleName);

const includedEntries = [
  '.env.example',
  'dist',
  'package.json',
  'package-lock.json',
  'prisma',
  'uploads',
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyEntry(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const targetPath = path.join(bundleDir, relativePath);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required path is missing: ${relativePath}`);
  }

  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    filter: (source) => !source.endsWith('.DS_Store'),
  });
}

function writeExecutable(relativePath, contents) {
  const targetPath = path.join(bundleDir, relativePath);
  fs.writeFileSync(targetPath, contents, 'utf8');
  fs.chmodSync(targetPath, 0o755);
}

function writeText(relativePath, contents) {
  fs.writeFileSync(path.join(bundleDir, relativePath), contents, 'utf8');
}

removePath(bundleDir);
ensureDir(outputRoot);
ensureDir(bundleDir);

for (const entry of includedEntries) {
  copyEntry(entry);
}

const uploadsDir = path.join(bundleDir, 'uploads');
ensureDir(uploadsDir);

const gitkeepPath = path.join(uploadsDir, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, '', 'utf8');
}

writeExecutable(
  'install.sh',
  `#!/usr/bin/env sh
set -eu

if [ ! -f ".env" ]; then
  echo "Missing .env file. Copy .env.example to .env and update the production values first."
  exit 1
fi

npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
`
);

writeExecutable(
  'start.sh',
  `#!/usr/bin/env sh
set -eu

NODE_ENV="\${NODE_ENV:-production}" npm start
`
);

writeText(
  'README_DEPLOY.md',
  `# Silveroak Backend Deployment Bundle

Generated at: ${new Date().toISOString()}

## Included
- Compiled backend in \`dist/\`
- Prisma schema and migrations in \`prisma/\`
- Runtime package manifests (\`package.json\`, \`package-lock.json\`)
- Environment template in \`.env.example\`
- Current upload storage in \`uploads/\`
- Helper scripts: \`install.sh\`, \`start.sh\`

## Deploy
1. Extract this bundle on the target server.
2. Copy \`.env.example\` to \`.env\`.
3. Update the production values in \`.env\`.
4. Run \`./install.sh\`.
5. Start the service with \`./start.sh\` or your process manager of choice.

## Notes
- \`node_modules\` is intentionally not bundled because dependency binaries can differ by deployment platform.
- \`UPLOAD_DIR\` defaults to \`./uploads\`, which is already included in this bundle.
- Database migrations are applied during \`./install.sh\`.
`
);

writeText(
  'bundle-manifest.json',
  JSON.stringify(
    {
      bundleName,
      createdAt: new Date().toISOString(),
      included: includedEntries,
      helperFiles: ['README_DEPLOY.md', 'install.sh', 'start.sh'],
    },
    null,
    2
  )
);

console.log(`Deployment bundle created at ${bundleDir}`);
