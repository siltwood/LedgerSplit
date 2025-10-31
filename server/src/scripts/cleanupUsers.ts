import { config } from 'dotenv';
import { db } from '../config/database';

// Load environment variables
config();

const KEEP_EMAILS = ['ivarscraper@gmail.com', 'kastsiukavets.alena@gmail.com'];

async function cleanupUsers() {
  console.log('🧹 Starting user cleanup...');
  console.log(`Will keep users: ${KEEP_EMAILS.join(', ')}`);
  console.log('');

  try {
    // Get all users except the ones we want to keep
    const { data: usersToDelete, error: fetchError } = await db
      .from('users')
      .select('user_id, email, name, created_at')
      .not('email', 'in', `(${KEEP_EMAILS.map(e => `"${e}"`).join(',')})`)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    if (!usersToDelete || usersToDelete.length === 0) {
      console.log('✅ No users to delete. Database is clean!');
      return;
    }

    console.log(`Found ${usersToDelete.length} user(s) to delete:`);
    usersToDelete.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name}) - Created: ${new Date(user.created_at).toLocaleDateString()}`);
    });
    console.log('');

    // Confirm deletion
    console.log('⚠️  About to delete these users and ALL their associated data (cascade delete)...');
    console.log('⚠️  This includes: events created, event participations, bills, payments, etc.');
    console.log('');

    // Perform the deletion
    const userIds = usersToDelete.map(u => u.user_id);

    const { error: deleteError } = await db
      .from('users')
      .delete()
      .in('user_id', userIds);

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${usersToDelete.length} user(s) and all their associated data!`);
    console.log('');

    // Show remaining users
    const { data: remainingUsers } = await db
      .from('users')
      .select('email, name, created_at')
      .is('deleted_at', null);

    console.log('Remaining active users:');
    remainingUsers?.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name})`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupUsers();
