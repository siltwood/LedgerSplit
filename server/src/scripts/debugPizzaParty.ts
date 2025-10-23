import { db } from '../config/database';

async function debugPizzaParty() {
  const eventId = 'bac2ccc4-9293-4b80-9f1d-81f19ff62cb6';

  // Get event details
  const { data: event } = await db
    .from('events')
    .select('*, event_participants(user_id, users(name, email))')
    .eq('event_id', eventId)
    .single();

  console.log('Event:', event?.name);
  console.log('Participants:');
  for (const p of event?.event_participants || []) {
    console.log(`  - ${(p as any).users.name} (${p.user_id})`);
  }

  // Get all splits
  const { data: splits } = await db
    .from('splits')
    .select('title, amount, paid_by, users(name), split_participants(user_id, users(name))')
    .eq('event_id', eventId);

  console.log('\nBills:');
  let totalAmount = 0;
  const userTotals: Record<string, { paid: number; owes: number; name: string }> = {};

  for (const split of splits || []) {
    console.log(`\n${split.title}: $${split.amount}`);
    console.log(`  Paid by: ${(split as any).users.name}`);
    console.log(`  Split between ${(split as any).split_participants.length} people`);

    totalAmount += split.amount;

    // Track who paid
    if (!userTotals[split.paid_by]) {
      userTotals[split.paid_by] = { paid: 0, owes: 0, name: (split as any).users.name };
    }
    userTotals[split.paid_by].paid += split.amount;

    // Track who owes
    const perPerson = split.amount / (split as any).split_participants.length;
    for (const p of (split as any).split_participants) {
      if (!userTotals[p.user_id]) {
        userTotals[p.user_id] = { paid: 0, owes: 0, name: p.users.name };
      }
      userTotals[p.user_id].owes += perPerson;
    }
  }

  console.log(`\n\nTotal bills: $${totalAmount.toFixed(2)}`);
  console.log(`\nBalances:`);
  for (const [userId, data] of Object.entries(userTotals)) {
    const balance = data.paid - data.owes;
    console.log(`  ${data.name}: paid $${data.paid.toFixed(2)}, owes $${data.owes.toFixed(2)}, balance: ${balance >= 0 ? '+' : ''}$${balance.toFixed(2)}`);
  }

  process.exit(0);
}

debugPizzaParty();
