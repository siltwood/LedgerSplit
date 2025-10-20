import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createInvite() {
  try {
    // Get first event that doesn't have a share token yet
    const { data: events, error: eventsError } = await db
      .from('events')
      .select('event_id, name, share_token')
      .limit(5);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return;
    }

    if (!events || events.length === 0) {
      console.log('No events found. Run seed script first.');
      return;
    }

    // Find event without share token or use first one
    let event = events.find(e => !e.share_token) || events[0];

    // Always generate new share token (ignore existing)
    const token = randomUUID();
    const { error: updateError } = await db
      .from('events')
      .update({ share_token: token })
      .eq('event_id', event.event_id);

    if (updateError) {
      console.error('Error updating event with share token:', updateError);
      return;
    }

    console.log('\n✅ Invite created successfully!');
    console.log('Event:', event.name);
    console.log('Invite URL: http://localhost:5173/accept-invite?token=' + token);
    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

createInvite();
