import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create super admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ai-analytics.com' },
    update: {},
    create: {
      email: 'admin@ai-analytics.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create demo user
  const demoHashedPassword = await bcrypt.hash('demo123', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: demoHashedPassword,
      name: 'Demo User',
      role: 'USER',
      isActive: true,
    },
  });

  console.log('Created demo user:', demoUser.email);

  // Create sample site for demo user
  const site = await prisma.site.upsert({
    where: { domain: 'demo.example.com' },
    update: {},
    create: {
      userId: demoUser.id,
      domain: 'demo.example.com',
      name: 'Demo Website',
      description: 'Sample website for demonstration purposes',
      isActive: true,
    },
  });

  console.log('Created sample site:', site.name);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });