import { config } from 'dotenv';
import { db } from '../config/database';

// Load environment variables
config();

async function cleanupDeletedRecords() {
  console.log('🧹 Starting cleanup of soft-deleted records...');
  console.log('');

  try {
    // Find all soft-deleted events
    const { data: deletedEvents, error: eventsError } = await db
      .from('events')
      .select('event_id, name, created_at, deleted_at')
      .not('deleted_at', 'is', null);

    if (eventsError) {
      console.error('❌ Error fetching deleted events:', eventsError);
      return;
    }

    // Find all soft-deleted splits
    const { data: deletedSplits, error: splitsError } = await db
      .from('splits')
      .select('split_id, title, amount, created_at, deleted_at')
      .not('deleted_at', 'is', null);

    if (splitsError) {
      console.error('❌ Error fetching deleted splits:', splitsError);
      return;
    }

    console.log('📊 FOUND SOFT-DELETED RECORDS:');
    console.log('');

    // Show deleted events
    if (deletedEvents && deletedEvents.length > 0) {
      console.log(`🗑️  Events to permanently delete: ${deletedEvents.length}`);
      deletedEvents.forEach((event, index) => {
        const deletedDate = new Date(event.deleted_at).toLocaleDateString();
        console.log(`  ${index + 1}. "${event.name}" - Deleted on: ${deletedDate}`);
      });
      console.log('');
    } else {
      console.log('✅ No soft-deleted events found');
      console.log('');
    }

    // Show deleted splits
    if (deletedSplits && deletedSplits.length > 0) {
      console.log(`🗑️  Splits/Bills to permanently delete: ${deletedSplits.length}`);
      deletedSplits.forEach((split, index) => {
        const deletedDate = new Date(split.deleted_at).toLocaleDateString();
        console.log(`  ${index + 1}. "${split.title}" ($${split.amount}) - Deleted on: ${deletedDate}`);
      });
      console.log('');
    } else {
      console.log('✅ No soft-deleted splits found');
      console.log('');
    }

    // Check if there's anything to delete
    const totalToDelete = (deletedEvents?.length || 0) + (deletedSplits?.length || 0);

    if (totalToDelete === 0) {
      console.log('🎉 Database is clean! No soft-deleted records to remove.');
      return;
    }

    console.log('⚠️  About to PERMANENTLY DELETE these records from the database...');
    console.log('⚠️  This will also cascade delete all related data (participants, payments, etc.)');
    console.log('');

    // Delete soft-deleted events
    if (deletedEvents && deletedEvents.length > 0) {
      const eventIds = deletedEvents.map(e => e.event_id);
      const { error: deleteEventsError } = await db
        .from('events')
        .delete()
        .in('event_id', eventIds);

      if (deleteEventsError) {
        console.error('❌ Error deleting events:', deleteEventsError);
        return;
      }

      console.log(`✅ Permanently deleted ${deletedEvents.length} event(s)`);
    }

    // Delete soft-deleted splits
    if (deletedSplits && deletedSplits.length > 0) {
      const splitIds = deletedSplits.map(s => s.split_id);
      const { error: deleteSplitsError } = await db
        .from('splits')
        .delete()
        .in('split_id', splitIds);

      if (deleteSplitsError) {
        console.error('❌ Error deleting splits:', deleteSplitsError);
        return;
      }

      console.log(`✅ Permanently deleted ${deletedSplits.length} split(s)`);
    }

    console.log('');
    console.log('🎉 Cleanup complete! All soft-deleted records have been permanently removed.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupDeletedRecords();
