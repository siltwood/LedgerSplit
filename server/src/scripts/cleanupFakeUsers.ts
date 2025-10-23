import { db } from '../config/database';

async function cleanupFakeUsers() {
  // Safety check: Don't run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ This script cannot be run in production!');
    process.exit(1);
  }

  console.log('🧹 Cleaning up fake users...\n');

  const fakeEmails = [
    'localtest9428@example.local',
    'localtest5831@example.local',
    'localtest7392@example.local'
  ];

  try {
    for (const email of fakeEmails) {
      const { error } = await db
        .from('users')
        .delete()
        .eq('email', email);

      if (error) {
        console.error(`Error deleting ${email}:`, error);
      } else {
        console.log(`✓ Deleted user: ${email}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupFakeUsers();
