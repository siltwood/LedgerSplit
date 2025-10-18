import { db } from '../config/database';
import bcrypt from 'bcrypt';

const FAKE_USER_1 = {
  email: 'fake45@gmail.com',
  password: 'fake45testemail',
  name: 'Fake User 45'
};

const FAKE_USER_2 = {
  email: 'fake46@gmail.com',
  password: 'fake46testemail',
  name: 'Fake User 46'
};

const EVENT_NAMES = [
  'Vegas Trip', 'Ski Weekend', 'Beach House', 'Road Trip', 'Concert Night',
  'Dinner Party', 'Game Night', 'Wine Tasting', 'Camping Trip', 'Boat Rental',
  'Music Festival', 'Golf Outing', 'Spa Day', 'Food Tour', 'Karaoke Night',
  'Brewery Tour', 'Hiking Adventure', 'Movie Marathon', 'Pizza Party', 'BBQ Bash',
  'Escape Room', 'Bowling Night', 'Art Gallery', 'Coffee Meetup', 'Brunch Squad',
  'Sunset Cruise', 'Trivia Night', 'Pool Party', 'Book Club', 'Dance Class'
];

const BILL_DESCRIPTIONS = [
  'Dinner at restaurant', 'Uber ride', 'Groceries', 'Hotel room', 'Concert tickets',
  'Coffee', 'Gas', 'Parking', 'Movie tickets', 'Snacks',
  'Breakfast', 'Lunch', 'Drinks', 'Entrance fee', 'Equipment rental',
  'Souvenirs', 'Tips', 'Taxi', 'Delivery', 'Supplies'
];

const CATEGORIES = ['Food', 'Transportation', 'Entertainment', 'Accommodation', 'Other'];

async function createOrGetUser(email: string, password: string, name: string) {
  // Check if user exists
  const { data: existingUser } = await db
    .from('users')
    .select('user_id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log(`User ${email} already exists`);
    return existingUser.user_id;
  }

  // Create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const { data: newUser, error } = await db
    .from('users')
    .insert({
      email,
      password_hash: hashedPassword,
      name,
      email_verified: true
    })
    .select('user_id')
    .single();

  if (error) {
    console.error(`Error creating user ${email}:`, error);
    throw error;
  }

  console.log(`Created user ${email}`);
  return newUser.user_id;
}

async function createEvent(name: string, user1Id: string, user2Id: string) {
  // Create event
  const { data: event, error: eventError } = await db
    .from('events')
    .insert({
      name,
      description: `Test event: ${name}`,
      created_by: user1Id
    })
    .select('event_id')
    .single();

  if (eventError) {
    console.error(`Error creating event ${name}:`, eventError);
    throw eventError;
  }

  // Add both users as participants
  const { error: participantsError } = await db
    .from('event_participants')
    .insert([
      { event_id: event.event_id, user_id: user1Id },
      { event_id: event.event_id, user_id: user2Id }
    ]);

  if (participantsError) {
    console.error(`Error adding participants to ${name}:`, participantsError);
    throw participantsError;
  }

  return event.event_id;
}

async function createBills(eventId: string, user1Id: string, user2Id: string, count: number) {
  const bills = [];

  for (let i = 0; i < count; i++) {
    // Alternate between users
    const paidBy = i % 2 === 0 ? user1Id : user2Id;
    const description = BILL_DESCRIPTIONS[Math.floor(Math.random() * BILL_DESCRIPTIONS.length)];
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const amount = (Math.random() * 200 + 10).toFixed(2); // Random amount between $10 and $210

    bills.push({
      event_id: eventId,
      title: `${description} #${i + 1}`,
      amount: parseFloat(amount),
      category,
      paid_by: paidBy,
      created_by: paidBy
    });
  }

  // Insert all bills
  const { data: insertedBills, error: billsError } = await db
    .from('splits')
    .insert(bills)
    .select('split_id, amount');

  if (billsError) {
    console.error('Error creating bills:', billsError);
    throw billsError;
  }

  // Create split participants (both users split each bill equally)
  const splitParticipants = [];
  for (const bill of insertedBills) {
    const amountOwed = (bill.amount / 2).toFixed(2);
    splitParticipants.push(
      { split_id: bill.split_id, user_id: user1Id, amount_owed: parseFloat(amountOwed) },
      { split_id: bill.split_id, user_id: user2Id, amount_owed: parseFloat(amountOwed) }
    );
  }

  const { error: participantsError } = await db
    .from('split_participants')
    .insert(splitParticipants);

  if (participantsError) {
    console.error('Error creating split participants:', participantsError);
    throw participantsError;
  }
}

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // Create or get users
    console.log('Creating users...');
    const user1Id = await createOrGetUser(FAKE_USER_1.email, FAKE_USER_1.password, FAKE_USER_1.name);
    const user2Id = await createOrGetUser(FAKE_USER_2.email, FAKE_USER_2.password, FAKE_USER_2.name);
    console.log('✅ Users ready\n');

    // Create events and bills
    console.log('Creating 30 events with 20 bills each...');
    for (let i = 0; i < 30; i++) {
      const eventName = EVENT_NAMES[i];
      console.log(`[${i + 1}/30] Creating event: ${eventName}`);

      const eventId = await createEvent(eventName, user1Id, user2Id);
      await createBills(eventId, user1Id, user2Id, 20);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nTest accounts:');
    console.log(`  Email: ${FAKE_USER_1.email}`);
    console.log(`  Password: ${FAKE_USER_1.password}`);
    console.log('');
    console.log(`  Email: ${FAKE_USER_2.email}`);
    console.log(`  Password: ${FAKE_USER_2.password}`);
    console.log('\nTotal: 30 events, 600 bills');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestData();
