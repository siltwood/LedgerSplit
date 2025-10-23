import { db } from '../config/database';

async function deleteDeletedUsers() {
  // Safety check: Don't run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ This script cannot be run in production!');
    process.exit(1);
  }

  console.log('🗑️  Permanently deleting soft-deleted users...\n');

  try {
    // Find all users with "deleted_" prefix in their email
    const { data: deletedUsers, error: fetchError } = await db
      .from('users')
      .select('user_id, email, name')
      .like('email', 'deleted_%@ledgersplit.com');

    if (fetchError) {
      console.error('Error fetching deleted users:', fetchError);
      process.exit(1);
    }

    if (!deletedUsers || deletedUsers.length === 0) {
      console.log('No deleted users found');
      process.exit(0);
    }

    console.log(`Found ${deletedUsers.length} deleted user(s):\n`);
    deletedUsers.forEach((u: any) => {
      console.log(`  - ${u.email} (${u.name})`);
    });

    console.log('\nDeleting...\n');

    for (const user of deletedUsers) {
      const { error } = await db
        .from('users')
        .delete()
        .eq('user_id', user.user_id);

      if (error) {
        console.error(`✗ Error deleting ${user.email}:`, error);
      } else {
        console.log(`✓ Permanently deleted: ${user.email}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }

  process.exit(0);
}

deleteDeletedUsers();
