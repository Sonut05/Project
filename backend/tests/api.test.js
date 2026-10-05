import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { getTodayString, addDaysToDateString } from '../src/utils/dateUtils.js';

describe('RentIt Backend API Test Suite', () => {
  let user1Token;
  let user1;
  let user2Token;
  let user2;
  let testItem;
  let testRequest;

  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbAvailable = true;
      // Clean up test data
      await prisma.review.deleteMany({ where: { comment: { contains: 'TEST' } } });
      await prisma.activity.deleteMany({ where: { message: { contains: 'TEST' } } });
      await prisma.rentalRequest.deleteMany({ where: { message: { contains: 'TEST' } } });
      await prisma.item.deleteMany({ where: { name: { contains: 'TEST' } } });
      await prisma.user.deleteMany({ where: { email: { in: ['test1@rentit.test', 'test2@rentit.test', 'test3@rentit.test'] } } });
    } catch {
      dbAvailable = false;
      console.warn('⚠️ PostgreSQL database is not reachable on localhost:5433. Skipping live DB integration tests in api.test.js.');
    }
  });

  beforeEach((ctx) => {
    const suiteName = ctx.task?.suite?.name || '';
    if (!dbAvailable && !suiteName.includes('Health and Readiness') && !suiteName.includes('CORS Security')) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      try {
        await prisma.review.deleteMany({ where: { comment: { contains: 'TEST' } } });
        await prisma.activity.deleteMany({ where: { message: { contains: 'TEST' } } });
        await prisma.rentalRequest.deleteMany({ where: { message: { contains: 'TEST' } } });
        await prisma.item.deleteMany({ where: { name: { contains: 'TEST' } } });
        await prisma.user.deleteMany({ where: { email: { in: ['test1@rentit.test', 'test2@rentit.test', 'test3@rentit.test'] } } });
        await prisma.$disconnect();
      } catch {
        // ignore disconnect error
      }
    }
  });

  describe('Health and Readiness', () => {
    it('GET /health returns 200 and ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /ready returns 200 when DB is up or 503 when DB is offline', async () => {
      const res = await request(app).get('/ready');
      if (dbAvailable) {
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
        expect(res.body.database).toBe('connected');
      } else {
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('unready');
        expect(res.body.database).toBe('disconnected');
      }
    });
  });

  describe('CORS Security', () => {
    it('allows requests with origin from CLIENT_ORIGIN', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('rejects requests from disallowed external origin', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-unauthorized-site.com');
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Not allowed by CORS');
    });
  });

  describe('Authentication and Authorization', () => {
    it('registers user 1 (Lender) successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Lender',
          email: 'test1@rentit.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: '+91 99999 11111',
          city: 'Bengaluru'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test1@rentit.test');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();

      user1 = res.body.user;
      user1Token = res.body.accessToken;
    });

    it('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Duplicate',
          email: 'test1@rentit.test',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('registers user 2 (Borrower) successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Borrower',
          email: 'test2@rentit.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: '+91 99999 22222',
          city: 'Bengaluru'
        });

      expect(res.status).toBe(201);
      user2 = res.body.user;
      user2Token = res.body.accessToken;
    });

    it('logs in successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@rentit.test',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@rentit.test',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me returns authenticated user details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user1.id);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects unauthenticated request to protected route', async () => {
      const res = await request(app).get('/api/requests/incoming');
      expect(res.status).toBe(401);
    });
  });

  describe('User Profile and Location Validation', () => {
    it('validates user coordinates and rejects out-of-range latitude', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ latitude: 95.5, longitude: 77.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Latitude must be between -90 and 90');
    });

    it('validates user coordinates and rejects out-of-range longitude', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ latitude: 12.5, longitude: 195 });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Longitude must be between -180 and 180');
    });

    it('accepts coordinate 0,0 safely without treating 0 as missing', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ latitude: 0, longitude: 0 });

      expect(res.status).toBe(200);
      expect(res.body.user.latitude).toBe(0);
      expect(res.body.user.longitude).toBe(0);
    });

    it('server controls onboardingCompletedAt and ignores fake client timestamp', async () => {
      const fakeDate = '1999-01-01T00:00:00.000Z';
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          phone: '+91 98765 43210',
          city: 'Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
          onboardingCompletedAt: fakeDate // Client trying to set arbitrary completion date
        });

      expect(res.status).toBe(200);
      expect(res.body.user.onboardingCompletedAt).toBeDefined();
      expect(res.body.user.onboardingCompletedAt).not.toBe(fakeDate);
    });

    it('updates user avatarUrl in profile edit section', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ avatarUrl: '/uploads/custom-avatar-pic.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toBe('/uploads/custom-avatar-pic.jpg');
    });

    it('supports search radius anywhere and calculates distanceKm without filtering out items', async () => {
      const res = await request(app)
        .get('/api/items')
        .query({ lat: 12.9716, lng: 77.5946, radius: 'anywhere' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('distanceKm');
        expect(typeof res.body[0].distanceKm).toBe('number');
      }
    });
  });

  describe('Item Listings, Contracts & Validation', () => {
    it('rejects item creation with disallowed condition', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'TEST Bad Condition Item',
          description: 'TEST Description',
          category: 'Power Tools',
          dailyPrice: 150,
          depositAmount: 500,
          condition: 'Like New', // disallowed (only New, Good, Fair)
          latitude: 12.9352,
          longitude: 77.6245
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Condition must be one of: New, Good, Fair');
    });

    it('rejects item creation with negative or invalid numeric values', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'TEST Negative Price Item',
          description: 'TEST Description',
          category: 'Power Tools',
          dailyPrice: -50,
          depositAmount: 500,
          condition: 'Good',
          latitude: 12.9352,
          longitude: 77.6245
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Daily price must be a valid positive');
    });

    it('creates a new item listing with valid fields', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'TEST Cordless Drill',
          description: 'TEST Description for drill',
          category: 'Power Tools',
          dailyPrice: 150,
          depositAmount: 500,
          condition: 'Good',
          locationLabel: 'Koramangala, Bengaluru',
          latitude: 12.9352,
          longitude: 77.6245,
          images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c']
        });

      expect(res.status).toBe(201);
      expect(res.body.item.id).toBeDefined();
      expect(typeof res.body.item.dailyPrice).toBe('number');
      expect(res.body.item.dailyPrice).toBe(150);
      expect(typeof res.body.item.depositAmount).toBe('number');
      expect(res.body.item.depositAmount).toBe(500);

      // Verify contract: root lenderId AND nested lender object
      expect(res.body.item.lenderId).toBe(user1.id);
      expect(res.body.item.lender).toBeDefined();
      expect(res.body.item.lender.id).toBe(user1.id);

      testItem = res.body.item;
    });

    it('GET /api/items returns lenderId at root level and nested lender object', async () => {
      const res = await request(app).get('/api/items');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const found = res.body.find((i) => i.id === testItem.id);
      expect(found).toBeDefined();
      expect(found.lenderId).toBe(user1.id);
      expect(found.lender).toBeDefined();
      expect(found.lender.id).toBe(user1.id);
      expect(found.availability).toBe('Available');
      expect(typeof found.dailyPrice).toBe('number');
      expect(typeof found.depositAmount).toBe('number');
    });

    it('GET /api/items/:id returns lenderId at root level and bookedRanges', async () => {
      const res = await request(app).get(`/api/items/${testItem.id}`);
      expect(res.status).toBe(200);
      expect(res.body.lenderId).toBe(user1.id);
      expect(res.body.lender.id).toBe(user1.id);
      expect(Array.isArray(res.body.bookedRanges)).toBe(true);
    });

    it('prevents non-owner from updating item', async () => {
      const res = await request(app)
        .patch(`/api/items/${testItem.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('allows owner to update item', async () => {
      const res = await request(app)
        .patch(`/api/items/${testItem.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'TEST Cordless Drill Updated' });

      expect(res.status).toBe(200);
      expect(res.body.item.name).toBe('TEST Cordless Drill Updated');
    });
  });

  describe('Rental Domain Integrity and Date Validation', () => {
    it('prevents user from renting their own item', async () => {
      const today = getTodayString();
      const futureStart = addDaysToDateString(today, 10);
      const futureEnd = addDaysToDateString(today, 12);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          itemId: testItem.id,
          startDate: futureStart,
          endDate: futureEnd,
          message: 'TEST Trying to rent own item'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot rent your own item');
    });

    it('rejects impossible calendar dates like 2026-02-31', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: '2026-02-31',
          endDate: '2026-03-05',
          message: 'TEST Impossible date'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('does not exist on the calendar');
    });

    it('rejects impossible calendar dates like 2026-04-31', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: '2026-04-31',
          endDate: '2026-05-02',
          message: 'TEST Impossible date 31st April'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('does not exist on the calendar');
    });

    it('prevents request with end date earlier than start date', async () => {
      const today = getTodayString();
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: addDaysToDateString(today, 15),
          endDate: addDaysToDateString(today, 10),
          message: 'TEST Invalid dates'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('End date cannot be earlier than start date');
    });

    it('creates a valid rental request with server-authoritative calculations', async () => {
      const today = getTodayString();
      const futureStart = addDaysToDateString(today, 10);
      const futureEnd = addDaysToDateString(today, 12);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: futureStart,
          endDate: futureEnd,
          message: 'TEST Legitimate future request'
        });

      expect(res.status).toBe(201);
      expect(res.body.request.status).toBe('Pending');
      expect(res.body.request.totalDays).toBe(3);
      expect(typeof res.body.request.rentalAmount).toBe('number');
      expect(res.body.request.rentalAmount).toBe(150 * 3); // 450
      expect(typeof res.body.request.depositAmount).toBe('number');
      expect(res.body.request.depositAmount).toBe(500);
      expect(typeof res.body.request.totalAmount).toBe('number');
      expect(res.body.request.totalAmount).toBe(450 + 500); // 950

      testRequest = res.body.request;
    });

    it('prevents borrower from accepting their own request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequest.id}/accept`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });

    it('allows lender to accept the pending request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequest.id}/accept`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('Accepted');
    });

    it('prevents overlapping booking request once accepted', async () => {
      const today = getTodayString();
      const overlapStart = addDaysToDateString(today, 11);
      const overlapEnd = addDaysToDateString(today, 13);

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: overlapStart,
          endDate: overlapEnd,
          message: 'TEST Overlapping request'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects early return of a future rental before it has started', async () => {
      // testRequest is for +10 to +12 days, so today < startDate
      const res = await request(app)
        .patch(`/api/requests/${testRequest.id}/return`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('the rental period has not started yet');
    });
  });

  describe('Current Rental, Return Rule and Atomic Transactions', () => {
    let activeRental;

    it('creates, accepts, and completes a rental that has started today', async () => {
      const today = getTodayString();
      const tomorrow = addDaysToDateString(today, 1);

      // Create request starting today
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: testItem.id,
          startDate: today,
          endDate: tomorrow,
          message: 'TEST Active rental starting today'
        });

      expect(reqRes.status).toBe(201);
      activeRental = reqRes.body.request;

      // Lender accepts
      const acceptRes = await request(app)
        .patch(`/api/requests/${activeRental.id}/accept`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.request.status).toBe('Accepted');

      // Return is permitted since today >= startDate
      const returnRes = await request(app)
        .patch(`/api/requests/${activeRental.id}/return`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(returnRes.status).toBe(200);
      expect(returnRes.body.request.status).toBe('Completed');

      // Attempting to return again fails
      const duplicateReturn = await request(app)
        .patch(`/api/requests/${activeRental.id}/return`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(duplicateReturn.status).toBe(400);
    });

    describe('Reviews and Ratings on Completed Rental', () => {
      it('allows borrower to review the rented item after completion via canonical POST /api/requests/:id/reviews', async () => {
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            targetType: 'item',
            rating: 5,
            comment: 'TEST Excellent tool, worked flawlessly!'
          });

        expect(res.status).toBe(201);
        expect(res.body.review.rating).toBe(5);
        expect(res.body.review.targetId).toBe(testItem.id);
        expect(res.body.review.authorId).toBe(user2.id);
      });

      it('prevents duplicate review for the same item by the same borrower', async () => {
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            targetType: 'item',
            rating: 4,
            comment: 'TEST Trying to review again'
          });

        expect(res.status).toBe(409);
      });

      it('allows borrower to review the lender on the same rental', async () => {
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            targetType: 'user',
            rating: 5,
            comment: 'TEST Great lender, very helpful!'
          });

        expect(res.status).toBe(201);
        expect(res.body.review.targetId).toBe(user1.id);
        expect(res.body.review.authorId).toBe(user2.id);
      });

      it('allows lender to also review the borrower on the same rental (both participants review each other)', async () => {
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            targetType: 'user',
            rating: 5,
            comment: 'TEST Excellent borrower, returned item on time in great shape!'
          });

        expect(res.status).toBe(201);
        expect(res.body.review.targetId).toBe(user2.id);
        expect(res.body.review.authorId).toBe(user1.id);
      });

      it('GET /api/items/:id/reviews returns reviews for the item', async () => {
        const res = await request(app).get(`/api/items/${testItem.id}/reviews`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].targetId).toBe(testItem.id);
      });

      it('rejects invalid rating outside integer range 1-5', async () => {
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            targetType: 'user',
            rating: 6,
            comment: 'TEST Invalid rating'
          });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toContain('Rating must be an integer between 1 and 5');
      });

      it('server determines targetId authoritatively and overrides client supplied targetId', async () => {
        // Even if client sends malicious targetId: 'arbitrary-hacker-id'
        // Server will set targetId to actual borrower/lender
        // Since lender already reviewed user, this should be conflict
        const res = await request(app)
          .post(`/api/requests/${activeRental.id}/reviews`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            targetType: 'user',
            targetId: 'arbitrary-hacker-id',
            rating: 5,
            comment: 'TEST Trying to review rogue target'
          });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toContain('arbitrary targetId');
      });
    });
  });

  describe('Concurrency-Safe Rental Acceptance', () => {
    it('prevents two concurrent acceptance attempts on overlapping requests from both succeeding', async () => {
      // Create a new item for concurrency test
      const itemRes = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'TEST Concurrency Item',
          description: 'Testing concurrency safety',
          category: 'Power Tools',
          dailyPrice: 100,
          depositAmount: 300,
          condition: 'New',
          locationLabel: 'Indiranagar, Bengaluru',
          latitude: 12.9784,
          longitude: 77.6408,
          images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c']
        });

      const concItem = itemRes.body.item;
      const today = getTodayString();
      const date1 = addDaysToDateString(today, 20);
      const date2 = addDaysToDateString(today, 25);
      const dateOverlap = addDaysToDateString(today, 22);
      const date3 = addDaysToDateString(today, 28);

      // Create Request 1: date1 to date2
      const req1Res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: concItem.id,
          startDate: date1,
          endDate: date2,
          message: 'TEST Request 1 for concurrency'
        });

      // Create Request 2: dateOverlap to date3 (overlaps with Request 1!)
      const req2Res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          itemId: concItem.id,
          startDate: dateOverlap,
          endDate: date3,
          message: 'TEST Request 2 for concurrency'
        });

      const req1Id = req1Res.body.request.id;
      const req2Id = req2Res.body.request.id;

      // Execute concurrent acceptances
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/requests/${req1Id}/accept`)
          .set('Authorization', `Bearer ${user1Token}`),
        request(app)
          .patch(`/api/requests/${req2Id}/accept`)
          .set('Authorization', `Bearer ${user1Token}`)
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (200) and the other must be rejected due to conflict (409)
      expect(statuses).toEqual([200, 409]);
    });
  });
});
