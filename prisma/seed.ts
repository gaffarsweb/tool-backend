/**
 * Seed script — idempotent via upsert-by-slug / upsert-by-email.
 * Run: `npm run db:seed` (requires DATABASE_URL and a migrated DB).
 *
 * Seeds:
 *   - 8 Categories matching the public catalog
 *   - 3 Plans (Free / Pro / Business)
 *   - SiteSetting singleton
 *   - First admin user (from ADMIN_EMAIL + ADMIN_PASSWORD env)
 */
import { PrismaClient, Role, SubscriptionTier } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'pdf', name: 'PDF Tools', icon: 'picture_as_pdf', color: 'primary', orderIndex: 10, description: 'Merge, split, compress, convert, and sign PDFs — all client-side.' },
  { slug: 'image', name: 'Image Tools', icon: 'image', color: 'secondary', orderIndex: 20, description: 'Resize, compress, crop, and convert between popular image formats.' },
  { slug: 'text', name: 'Text Tools', icon: 'format_align_left', color: 'tertiary', orderIndex: 30, description: 'Word count, case conversion, diff, regex — everyday text utilities.' },
  { slug: 'developer', name: 'Developer Tools', icon: 'code', color: 'primary', orderIndex: 40, description: 'JSON, Base64, JWT, UUID, hashing — tools built for coders.' },
  { slug: 'calculators', name: 'Calculators', icon: 'calculate', color: 'secondary', orderIndex: 50, description: 'Percentage, age, loan, scientific calculators.' },
  { slug: 'converters', name: 'Converters', icon: 'compare_arrows', color: 'tertiary', orderIndex: 60, description: 'Unit, currency, timezone, and format converters.' },
  { slug: 'generators', name: 'Generators', icon: 'auto_awesome', color: 'primary', orderIndex: 70, description: 'Passwords, QR codes, UUIDs, lorem ipsum — one-click generators.' },
  { slug: 'web-seo', name: 'Web & SEO', icon: 'language', color: 'secondary', orderIndex: 80, description: 'Meta tag inspectors, robots.txt helpers, SEO sanity checks.' },
];

const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    tier: SubscriptionTier.FREE,
    priceMonthly: 0,
    priceAnnual: 0,
    features: ['Access to all free tools', 'Unlimited runs', 'No signup required for most tools'],
    limitsJson: { maxFileSizeMb: 20, maxApiCalls: 1000, maxSeats: 1 },
    orderIndex: 10,
  },
  {
    slug: 'pro',
    name: 'Pro',
    tier: SubscriptionTier.PRO,
    priceMonthly: 299,
    priceAnnual: 2999,
    features: ['Everything in Free', 'Pro-tier tools (OCR, batch, premium converters)', 'Priority processing', 'No ads'],
    limitsJson: { maxFileSizeMb: 100, maxApiCalls: 25000, maxSeats: 1 },
    orderIndex: 20,
  },
  {
    slug: 'business',
    name: 'Business',
    tier: SubscriptionTier.BUSINESS,
    priceMonthly: 999,
    priceAnnual: 9999,
    features: ['Everything in Pro', 'API access', 'Team seats (5)', 'Priority support', 'Audit log'],
    limitsJson: { maxFileSizeMb: 500, maxApiCalls: 250000, maxSeats: 5 },
    orderIndex: 30,
  },
];

async function main() {
  console.log('→ Seeding categories…');
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, description: c.description, icon: c.icon, color: c.color, orderIndex: c.orderIndex },
    });
  }

  console.log('→ Seeding plans…');
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      create: p,
      update: {
        name: p.name,
        tier: p.tier,
        priceMonthly: p.priceMonthly,
        priceAnnual: p.priceAnnual,
        features: p.features,
        limitsJson: p.limitsJson,
        orderIndex: p.orderIndex,
      },
    });
  }

  console.log('→ Seeding site settings…');
  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn(
      '⚠  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed. Set them in .env and re-run `npm run db:seed` to create the first admin.',
    );
  } else {
    console.log(`→ Seeding admin user ${adminEmail}…`);
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      create: {
        email: adminEmail.toLowerCase(),
        name: 'Admin',
        passwordHash,
        role: Role.ADMIN,
        emailVerifiedAt: new Date(),
      },
      update: {
        role: Role.ADMIN,
        emailVerifiedAt: new Date(),
      },
    });
  }

  console.log('✓ Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
