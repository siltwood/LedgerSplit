import { db } from '../config/database';

async function findEventTwoDebts() {
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

  // For each event, check if user owes money and calculate settlements
  for (const eventParticipant of events) {
    const eventId = eventParticipant.event_id;
    const eventName = (eventParticipant as any).events?.name;

    // Get splits for this event
    const { data: splits } = await db
      .from('splits')
      .select('split_id, title, amount, paid_by, split_participants(user_id)')
      .eq('event_id', eventId);

    if (!splits) continue;

    // Calculate balances for all participants
    const balances: Record<string, number> = {};

    for (const split of splits) {
      const participants = (split as any).split_participants || [];
      const participantCount = participants.length;

      if (participantCount === 0) continue;

      const amountPerPerson = split.amount / participantCount;

      // Initialize balances
      if (!balances[split.paid_by]) balances[split.paid_by] = 0;

      // Person who paid gets credit
      balances[split.paid_by] += split.amount;

      // Each participant owes their share
      for (const p of participants) {
        if (!balances[p.user_id]) balances[p.user_id] = 0;
        balances[p.user_id] -= amountPerPerson;
      }
    }

    const currentUserBalance = balances[user.user_id] || 0;

    // Only interested in events where user owes money
    if (currentUserBalance >= -0.01) continue;

    // Calculate settlements
    const creditors = Object.entries(balances)
      .filter(([id, bal]) => bal > 0.01 && id !== user.user_id)
      .map(([id, bal]) => ({ userId: id, amount: bal }))
      .sort((a, b) => b.amount - a.amount);

    const debtors = Object.entries(balances)
      .filter(([id, bal]) => bal < -0.01)
      .map(([id, bal]) => ({ userId: id, amount: Math.abs(bal) }))
      .sort((a, b) => b.amount - a.amount);

    const settlements: { from: string; to: string; amount: number }[] = [];
    const creditorsCopy = creditors.map(c => ({ ...c }));
    const debtorsCopy = debtors.map(d => ({ ...d }));

    for (const debtor of debtorsCopy) {
      let remainingDebt = debtor.amount;
      for (const creditor of creditorsCopy) {
        if (remainingDebt < 0.01 || creditor.amount < 0.01) continue;
        const paymentAmount = Math.min(remainingDebt, creditor.amount);
        settlements.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: paymentAmount
        });
        creditor.amount -= paymentAmount;
        remainingDebt -= paymentAmount;
      }
    }

    // Check if user owes to exactly 2 people
    const userSettlements = settlements.filter(s => s.from === user.user_id);

    if (userSettlements.length === 2) {
      console.log(`\n✅ Found event: ${eventName}`);
      console.log(`Event ID: ${eventId}`);
      console.log(`Balance: User owes $${Math.abs(currentUserBalance).toFixed(2)} total`);
      console.log(`\nDebts:`);
      for (const settlement of userSettlements) {
        console.log(`  → Owes $${settlement.amount.toFixed(2)} to user ${settlement.to}`);
      }
      process.exit(0);
    }
  }

  console.log('\n❌ No event found where user owes exactly 2 people');
  process.exit(0);
}

findEventTwoDebts();
