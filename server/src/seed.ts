import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

async function main() {
  console.log('🌱 Seeding ChatSphere demo database...');

  // Clear existing data
  await prisma.callRecord.deleteMany();
  await prisma.message.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Alice
  const alice = await prisma.user.create({
    data: {
      username: 'alice',
      displayName: 'Alice Morgan',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Design enthusiast & full-stack architect ✨',
      status: 'OFFLINE',
    },
  });

  // 2. Create Bob
  const bob = await prisma.user.create({
    data: {
      username: 'bob',
      displayName: 'Bob Vance',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Coffee lover, WebRTC enthusiast ☕',
      status: 'OFFLINE',
    },
  });

  // 3. Create Charlie
  const charlie = await prisma.user.create({
    data: {
      username: 'charlie',
      displayName: 'Charlie Day',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'Music producer and gamer 🎮',
      status: 'OFFLINE',
    },
  });

  // Seed Friendship between Alice and Bob
  await prisma.friendship.create({
    data: {
      user1Id: alice.id,
      user2Id: bob.id,
      status: 'ACTIVE',
    },
  });

  // Seed a pending Friend Request from Charlie to Alice
  await prisma.friendRequest.create({
    data: {
      senderId: charlie.id,
      receiverId: alice.id,
      status: 'PENDING',
    },
  });

  // Seed initial welcoming messages between Alice and Bob
  const msg1 = await prisma.message.create({
    data: {
      senderId: bob.id,
      receiverId: alice.id,
      content: 'Hey Alice! Welcome to ChatSphere 🚀',
      type: 'TEXT',
      status: 'SEEN',
    },
  });

  await prisma.message.create({
    data: {
      senderId: alice.id,
      receiverId: bob.id,
      content: 'Thanks Bob! The real-time messaging and audio/video calls look super smooth!',
      type: 'TEXT',
      replyToId: msg1.id,
      status: 'SEEN',
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Demo Accounts Created (Password for all: Password123!):');
  console.log('1. alice    (Friends with Bob, pending request from Charlie)');
  console.log('2. bob      (Friends with Alice)');
  console.log('3. charlie  (Sent request to Alice)');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
