const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverDir = path.resolve(__dirname, '..');
const defaultDbUrl = 'file:./dev.db';

// Provide a safe default for DATABASE_URL so Render builds never fail if env is unset
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || defaultDbUrl,
};

console.log('⚡ [ChatSphere Server Build] Starting build process...');
console.log(`📦 Using DATABASE_URL: ${process.env.DATABASE_URL ? '(custom configured in env)' : defaultDbUrl}`);

try {
  console.log('1️⃣ Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', env, cwd: serverDir });

  console.log('2️⃣ Pushing Database Schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env, cwd: serverDir });

  console.log('3️⃣ Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit', env, cwd: serverDir });

  console.log('✅ [ChatSphere Server Build] Completed successfully!');
} catch (error) {
  console.error('❌ [ChatSphere Server Build] Build failed:', error);
  process.exit(1);
}
