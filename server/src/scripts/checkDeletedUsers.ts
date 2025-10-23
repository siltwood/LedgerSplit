import { db } from '../config/database';

async function checkDeletedUsers() {
  console.log('🔍 Checking for deleted or test users...\n');

  try {
    // Get all users
    const { data: users, error } = await db
      .from('users')
      .select('user_id, email, name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('No users found in database');
      process.exit(0);
    }

    console.log(`Total users: ${users.length}\n`);

    console.log('All users:');
    users.forEach((u: any) => {
      console.log(`  - ${u.email} (${u.name || 'no name'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkDeletedUsers();
