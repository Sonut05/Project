import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.rentalRequest.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const alex = await prisma.user.create({
    data: {
      id: 'usr-alex-01',
      name: 'Alex Rivers',
      email: 'alex@rentit.local',
      passwordHash,
      phone: '+91 98765 43210',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      city: 'Bengaluru',
      privateAddress: 'Flat 402, Green Glen Heights, Indiranagar',
      latitude: 12.9784,
      longitude: 77.6408,
      onboardingUseMode: 'both',
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date()
    }
  });

  const priya = await prisma.user.create({
    data: {
      id: 'usr-priya-02',
      name: 'Priya Patel',
      email: 'priya@rentit.local',
      passwordHash,
      phone: '+91 98123 45678',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
      city: 'Bengaluru',
      privateAddress: '12th Main, 4th Block, Koramangala',
      latitude: 12.9352,
      longitude: 77.6245,
      onboardingUseMode: 'both',
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date()
    }
  });

  const marcus = await prisma.user.create({
    data: {
      id: 'usr-marcus-03',
      name: 'Marcus Chen',
      email: 'marcus@rentit.local',
      passwordHash,
      phone: '+91 97234 56789',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
      city: 'Bengaluru',
      privateAddress: 'Sector 2, HSR Layout',
      latitude: 12.9121,
      longitude: 77.6446,
      onboardingUseMode: 'both',
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date()
    }
  });

  const ananya = await prisma.user.create({
    data: {
      id: 'usr-ananya-04',
      name: 'Ananya Rao',
      email: 'ananya@rentit.local',
      passwordHash,
      phone: '+91 96345 67890',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
      city: 'Bengaluru',
      privateAddress: 'ITPL Main Road, Whitefield',
      latitude: 12.9698,
      longitude: 77.7500,
      onboardingUseMode: 'both',
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date()
    }
  });

  // 2. Create Items
  const itemDrill = await prisma.item.create({
    data: {
      id: 'itm-bosch-drill-01',
      lenderId: priya.id,
      name: 'Bosch Professional Cordless Hammer Drill 18V',
      description: 'Heavy duty brushless cordless hammer drill with 2 rechargeable batteries, charger, and a 50-piece masonry bit set. Ideal for home mounting and DIY projects.',
      category: 'Power Tools',
      dailyPrice: 250,
      depositAmount: 1500,
      condition: 'New',
      locationLabel: 'Koramangala 4th Block, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      listingStatus: 'Active',
      images: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=800'
      ]
    }
  });

  const itemCamera = await prisma.item.create({
    data: {
      id: 'itm-sony-a7-02',
      lenderId: marcus.id,
      name: 'Sony Alpha A7 III Full-Frame Mirrorless + 28-70mm Lens',
      description: '24.2 MP full frame sensor, 4K HDR video, high-speed continuous shooting. Comes with 64GB high speed SD card, two batteries, dual bay charger, and weather-sealed camera bag.',
      category: 'Photography',
      dailyPrice: 1200,
      depositAmount: 8000,
      condition: 'New',
      locationLabel: 'HSR Layout Sector 2, Bengaluru',
      latitude: 12.9121,
      longitude: 77.6446,
      listingStatus: 'Active',
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80&w=800'
      ]
    }
  });

  const itemTent = await prisma.item.create({
    data: {
      id: 'itm-quechua-tent-03',
      lenderId: ananya.id,
      name: 'Quechua 4-Person Waterproof Camping Tent + Mat',
      description: 'Fresh & Black blackout technology tent keeping the interior dark and cool. Fast pitch dome structure with ground tarp, stakes, and compact carry bag.',
      category: 'Outdoors',
      dailyPrice: 350,
      depositAmount: 1200,
      condition: 'Good',
      locationLabel: 'Whitefield, Bengaluru',
      latitude: 12.9698,
      longitude: 77.7500,
      listingStatus: 'Active',
      images: [
        'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=800'
      ]
    }
  });

  const itemProjector = await prisma.item.create({
    data: {
      id: 'itm-ankers-projector-04',
      lenderId: alex.id,
      name: 'Nebula Capsule Smart Portable Projector 1080p',
      description: 'Pocket cinema with built-in 360-degree speaker and Android TV. Great for movie nights, backyard screenings, and rooftop gatherings.',
      category: 'Electronics',
      dailyPrice: 600,
      depositAmount: 3000,
      condition: 'New',
      locationLabel: 'Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408,
      listingStatus: 'Active',
      images: [
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=800'
      ]
    }
  });

  const itemPressureWasher = await prisma.item.create({
    data: {
      id: 'itm-karcher-washer-05',
      lenderId: priya.id,
      name: 'Kärcher K3 High Pressure Washer (120 Bar)',
      description: 'Compact high-pressure washer for cleaning driveways, balconies, cars, and patio furniture. Includes dirt blaster lance, spray lance, and 6m pressure hose.',
      category: 'Home & Garden',
      dailyPrice: 400,
      depositAmount: 2000,
      condition: 'Good',
      locationLabel: 'Koramangala 4th Block, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      listingStatus: 'Active',
      images: [
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800'
      ]
    }
  });

  // 3. Create Sample Completed Rental & Review
  const completedRental = await prisma.rentalRequest.create({
    data: {
      id: 'req-seed-completed-01',
      itemId: itemDrill.id,
      lenderId: priya.id,
      borrowerId: alex.id,
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      totalDays: 2,
      rentalAmount: 500,
      depositAmount: 1500,
      totalAmount: 2000,
      status: 'Completed',
      message: 'Need this for putting up some shelves and bookshelf in my living room.',
      acceptedAt: new Date('2026-09-09T10:00:00Z'),
      completedAt: new Date('2026-09-12T18:00:00Z')
    }
  });

  // Reviews for the completed rental
  await prisma.review.create({
    data: {
      id: 'rev-item-01',
      requestId: completedRental.id,
      targetType: 'item',
      targetId: itemDrill.id,
      authorId: alex.id,
      rating: 5,
      comment: 'Super powerful drill, both batteries were fully charged. Finished all my shelving in an afternoon!'
    }
  });

  await prisma.review.create({
    data: {
      id: 'rev-user-01',
      requestId: completedRental.id,
      targetType: 'user',
      targetId: priya.id,
      authorId: alex.id,
      rating: 5,
      comment: 'Priya was very accommodating with pickup timing and explained all safety instructions clearly.'
    }
  });

  // Activities
  await prisma.activity.create({
    data: {
      userId: alex.id,
      type: 'RENTAL_COMPLETED',
      message: 'Completed rental for Bosch Cordless Hammer Drill 18V',
      entityType: 'request',
      entityId: completedRental.id
    }
  });

  await prisma.activity.create({
    data: {
      userId: priya.id,
      type: 'RENTAL_COMPLETED',
      message: 'Lent Bosch Cordless Hammer Drill 18V to Alex Rivers',
      entityType: 'request',
      entityId: completedRental.id
    }
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
