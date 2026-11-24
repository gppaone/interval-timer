// Container entrypoint: bring the database up to date, make sure an admin
// exists, then start the server.
import { execFileSync } from 'node:child_process';
import { cpSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '../src/lib/server/credentials.js';

const prismaBin = './node_modules/.bin/prisma';
const run = (args) => execFileSync(prismaBin, args, { stdio: 'inherit' });

// /app/prisma is a persistent volume, so it still holds the schema and
// migrations from whenever it was first created. Refresh them from the image.
if (existsSync('/app/prisma-image')) {
	cpSync('/app/prisma-image/schema.prisma', '/app/prisma/schema.prisma');
	rmSync('/app/prisma/migrations', { recursive: true, force: true });
	cpSync('/app/prisma-image/migrations', '/app/prisma/migrations', { recursive: true });
}

const dbPath = (process.env.DATABASE_URL ?? '').replace(/^file:/, '');
const prisma = new PrismaClient();

// A database created by the old `prisma db push` has tables but no migration
// history. Back it up, then mark the baseline migration as already applied.
const tables = (
	await prisma.$queryRawUnsafe(
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('Routine', '_prisma_migrations')`
	)
).map((row) => row.name);
await prisma.$disconnect();

if (tables.includes('Routine') && !tables.includes('_prisma_migrations')) {
	if (dbPath && existsSync(dbPath)) {
		const backup = `${dbPath}.before-accounts`;
		copyFileSync(dbPath, backup);
		console.log(`Existing database detected. Backup written to ${backup}`);
	}
	run(['migrate', 'resolve', '--applied', '0_init', '--schema', 'prisma/schema.prisma']);
}

run(['migrate', 'deploy', '--schema', 'prisma/schema.prisma']);

// Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, only while there
// are no users at all.
const seed = new PrismaClient();
if ((await seed.user.count()) === 0) {
	const email = normalizeEmail(process.env.ADMIN_EMAIL);
	const password = process.env.ADMIN_PASSWORD;
	const problem = validateEmail(email) ?? validatePassword(password);
	if (problem) {
		console.error(`No users exist yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin. (${problem})`);
		process.exit(1);
	}
	await seed.user.create({ data: { email, passwordHash: await hashPassword(password), isAdmin: true } });
	console.log(`Created first admin: ${email}. You can remove ADMIN_PASSWORD from .env now.`);
}
await seed.$disconnect();

await import('../build/index.js');
