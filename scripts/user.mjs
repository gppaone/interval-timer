// Command-line account tools, mainly for recovery if the admin is locked out:
//   docker exec -it interval-timer node scripts/user.mjs create you@example.com 'password' --admin
//   docker exec -it interval-timer node scripts/user.mjs reset-password you@example.com 'new password'
import { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, validateEmail, validatePassword } from '../src/lib/server/credentials.js';

const [command, rawEmail, password, ...flags] = process.argv.slice(2);
const email = normalizeEmail(rawEmail);
const prisma = new PrismaClient();

function fail(message) {
	console.error(message);
	process.exit(1);
}

const problem = validateEmail(email) ?? validatePassword(password);
if (!['create', 'reset-password'].includes(command ?? '') || problem) {
	fail(`Usage: node scripts/user.mjs <create|reset-password> <email> <password> [--admin]\n${problem ?? ''}`);
}

const passwordHash = await hashPassword(password);

if (command === 'create') {
	await prisma.user.create({ data: { email, passwordHash, isAdmin: flags.includes('--admin') } });
	console.log(`Created ${email}`);
} else {
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) fail(`No user ${email}`);
	await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
	await prisma.session.deleteMany({ where: { userId: user.id } });
	console.log(`Password reset for ${email}`);
}
await prisma.$disconnect();
