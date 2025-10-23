import { db } from '../config/database';

async function findEvent() {
  // Get Test User Alpha's ID
  const { data: user } = await db
    .from('users')
    .select('user_id, name')
    .eq('email', 'localtest9428@example.local')
    .single();
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log(`Found user: ${user.name} (${user.user_id})`);
  
  // Get events where this user is a participant
  const { data: events } = await db
    .from('event_participants')
    .select('event_id, events(name)')
    .eq('user_id', user.user_id);
  
  if (!events || events.length === 0) {
    console.log('No events found');
    return;
  }
  
  // For each event, check if user owes money
  for (const eventParticipant of events) {
    const eventId = eventParticipant.event_id;
    const eventName = (eventParticipant as any).events?.name;
    
    // Get splits for this event
    const { data: splits } = await db
      .from('splits')
      .select('split_id, title, amount, paid_by, split_participants(user_id)')
      .eq('event_id', eventId);
    
    if (!splits) continue;
    
    let totalOwed = 0;
    let totalPaid = 0;
    
    for (const split of splits) {
      const participants = (split as any).split_participants || [];
      const participantCount = participants.length;
      
      if (participantCount === 0) continue;
      
      const amountPerPerson = split.amount / participantCount;
      
      // User paid this bill
      if (split.paid_by === user.user_id) {
        totalPaid += split.amount;
      }
      
      // User is a participant in this bill
      if (participants.some((p: any) => p.user_id === user.user_id)) {
        totalOwed += amountPerPerson;
      }
    }
    
    const balance = totalPaid - totalOwed;
    
    if (balance < -0.01) {
      console.log(`\nEvent: ${eventName}`);
      console.log(`Event ID: ${eventId}`);
      console.log(`Balance: User owes $${Math.abs(balance).toFixed(2)}`);
      console.log(`Total paid: $${totalPaid.toFixed(2)}`);
      console.log(`Total owed: $${totalOwed.toFixed(2)}`);
      break; // Found one, exit
    }
  }
  
  process.exit(0);
}

findEvent();
