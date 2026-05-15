// seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Student
  const student = await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      first_name: 'John',
      last_name: 'Doe',
      email: 'student@smartlab.edu',
      password_hash: await bcrypt.hash('password123', 10),
      student_number: '20230001',
      user_type: 'STUDENT',
      college: 'CAS',
      year_level: 2,
    }
  });

  // Create Staff
  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      first_name: 'Maria',
      last_name: 'Santos',
      email: 'staff@smartlab.edu',
      password_hash: await bcrypt.hash('password123', 10),
      user_type: 'LABORATORY_STAFF',
      college: 'CAS',
    }
  });

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@smartlab.edu',
      password_hash: await bcrypt.hash('admin123', 10),
      user_type: 'ADMIN',
    }
  });

  console.log('✅ Seeding completed!');
  console.log('Test Accounts:');
  console.log('Student → username: student | password: password123');
  console.log('Staff   → username: staff   | password: password123');
  console.log('Admin   → username: admin   | password: admin123');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());