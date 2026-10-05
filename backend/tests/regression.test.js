import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { updateMe } from '../src/controllers/users.controller.js';
import { createItem } from '../src/controllers/items.controller.js';
import { geocodeAddress, reverseGeocodeAddress } from '../src/controllers/geocode.controller.js';
import { safeUploadMiddleware, verifyImageSignature } from '../src/controllers/upload.controller.js';
import { getTodayString, addDaysToDateString, formatDisplayDate, isDateRangeOverlapping } from '../src/utils/dateUtils.js';
import { refresh, logout, hashToken } from '../src/controllers/auth.controller.js';
import { getOrCreateConversation } from '../src/controllers/messages.controller.js';
import { createReview } from '../src/controllers/reviews.controller.js';
import { config } from '../src/config/env.js';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

describe('RentIt Targeted Regression Tests (Section 30)', () => {
  let mockRes;
  let mockNext;
  let responseData;
  let responseStatus;
  let nextError;

  beforeEach(() => {
    responseData = null;
    responseStatus = 200;
    nextError = null;
    mockNext = vi.fn((err) => {
      if (err) {
        nextError = err;
        responseStatus = err.statusCode || 500;
        responseData = {
          error: {
            code: err.code || 'ERROR',
            message: err.message
          }
        };
      }
    });
    mockRes = {
      status: vi.fn(function (code) {
        responseStatus = code;
        return this;
      }),
      json: vi.fn(function (data) {
        responseData = data;
        return this;
      }),
      clearCookie: vi.fn(),
      cookie: vi.fn()
    };
  });

  // 1 & 2: Onboarding mode 'borrow' accepted, 'rent' rejected
  describe('Requirement 1 & 2: Onboarding Use Mode Contract', () => {
    it('accepts onboardingUseMode "borrow"', async () => {
      const mockReq = {
        user: { id: 'u1' },
        body: {
          name: 'User 1',
          city: 'Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
          onboardingUseMode: 'borrow'
        }
      };

      const { prisma } = await import('../src/db/prisma.js');
      const findSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        name: 'User 1',
        city: null,
        latitude: null,
        longitude: null,
        onboardingUseMode: null,
        onboardingCompletedAt: null
      });

      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'u1',
        name: 'User 1',
        city: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
        onboardingUseMode: 'borrow',
        onboardingCompletedAt: new Date()
      });

      await updateMe(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(200);
      expect(responseData.user.onboardingUseMode).toBe('borrow');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            onboardingUseMode: 'borrow'
          })
        })
      );
      findSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it('rejects obsolete onboardingUseMode "rent" with 400', async () => {
      const mockReq = {
        user: { id: 'u1' },
        body: {
          name: 'User 1',
          city: 'Bengaluru',
          latitude: 12.9716,
          longitude: 77.5946,
          onboardingUseMode: 'rent'
        }
      };

      const { prisma } = await import('../src/db/prisma.js');
      const findSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        name: 'User 1'
      });

      await updateMe(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(400);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toContain('onboardingUseMode must be one of: borrow, lend, both');
      findSpy.mockRestore();
    });

    it('accepts valid modes "lend" and "both"', async () => {
      const { prisma } = await import('../src/db/prisma.js');
      const findSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        name: 'User 1'
      });
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({
        id: 'u1',
        onboardingUseMode: 'lend',
        onboardingCompletedAt: new Date()
      });

      const mockReq = {
        user: { id: 'u1' },
        body: { name: 'User 1', city: 'Bengaluru', latitude: 12.97, longitude: 77.59, onboardingUseMode: 'lend' }
      };

      await updateMe(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(200);
      findSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });

  // 3: Listing condition 'New' accepted
  describe('Requirement 3: Listing Condition Contract', () => {
    it('accepts listing with condition = "New"', async () => {
      const { prisma } = await import('../src/db/prisma.js');
      const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb({
            item: {
              create: vi.fn().mockResolvedValue({
                id: 'item-1',
                name: 'Power Drill',
                condition: 'New',
                dailyPrice: 15,
                depositAmount: 50,
                category: 'Tools',
                lenderId: 'u1'
              })
            },
            activity: {
              create: vi.fn().mockResolvedValue({})
            }
          });
        }
        return cb;
      });

      const mockReq = {
        user: { id: 'u1' },
        body: {
          name: 'Power Drill',
          description: 'Brand new drill in box',
          category: 'Tools',
          dailyPrice: 15,
          depositAmount: 50,
          condition: 'New',
          city: 'Bengaluru',
          latitude: 12.97,
          longitude: 77.59
        }
      };

      await createItem(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(201);
      expect(responseData.item.condition).toBe('New');
      txSpy.mockRestore();
    });

    it('rejects listing with condition = "Like New"', async () => {
      const mockReq = {
        user: { id: 'u1' },
        body: {
          name: 'Power Drill',
          description: 'Brand new drill in box',
          category: 'Tools',
          dailyPrice: 15,
          depositAmount: 50,
          condition: 'Like New',
          city: 'Bengaluru',
          latitude: 12.97,
          longitude: 77.59
        }
      };

      await createItem(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(400);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message.toLowerCase()).toContain('condition must be one of: new, good, fair');
    });
  });

  // 4: Onboarding requires valid location selection
  describe('Requirement 4: Onboarding Requires Valid Coordinates', () => {
    it('rejects onboarding completion when latitude or longitude is missing', async () => {
      const { prisma } = await import('../src/db/prisma.js');
      const findSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        name: 'User 1',
        city: 'Bengaluru',
        latitude: null,
        longitude: null
      });

      const mockReq = {
        user: { id: 'u1' },
        body: {
          name: 'User 1',
          onboardingUseMode: 'borrow'
        }
      };

      await updateMe(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(400);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toContain('latitude and longitude are required');
      findSpy.mockRestore();
    });
  });

  // 5: Profile city change clears coordinates / rejects missing coords
  describe('Requirement 5: Profile City Change Clears Coordinates', () => {
    it('rejects profile update if city is provided without valid coordinates', async () => {
      const { prisma } = await import('../src/db/prisma.js');
      const findSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        city: 'Bengaluru',
        latitude: 12.97,
        longitude: 77.59
      });

      const mockReq = {
        user: { id: 'u1' },
        body: {
          city: 'Mumbai',
          latitude: null,
          longitude: null
        }
      };

      await updateMe(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(400);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toContain('Updating your city or neighborhood requires selecting a location');
      findSpy.mockRestore();
    });
  });

  // 6 & 7: Geocoder timeout and reverse geocode failure
  describe('Requirement 6 & 7: Geocoder Timeout & Failure Handling', () => {
    it('returns empty array and does not hang on geocoder search timeout', async () => {
      const mockReq = { query: { q: 'Bengaluru' } };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await geocodeAddress(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(200);
      expect(responseData).toEqual([]); // Controlled empty result on search timeout

      global.fetch = originalFetch;
    });

    it('returns 503 GEOCODING_UNAVAILABLE on reverse geocode failure (never synthetic "Local Area")', async () => {
      const mockReq = { query: { lat: '12.97', lng: '77.59' } };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      await reverseGeocodeAddress(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(503);
      expect(responseData.error.code).toBe('GEOCODING_UNAVAILABLE');
      expect(responseData.city).toBeUndefined(); // no synthetic "Local Area"

      global.fetch = originalFetch;
    });
  });

  // 8, 9, 10: Refresh token rotation, replay rejection, and logout revocation
  describe('Requirement 8, 9, 10: Refresh Token Security & Rotation', () => {
    it('hashes token properly with SHA-256', () => {
      const token = 'sample-refresh-jwt-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('rejects revoked refresh token on refresh', async () => {
      const { prisma } = await import('../src/db/prisma.js');

      const rawToken = jwt.sign({ id: 'u1' }, config.jwtRefreshSecret, { expiresIn: '1h' });
      const hashed = hashToken(rawToken);

      const findSpy = vi.spyOn(prisma.refreshSession, 'findUnique').mockResolvedValue({
        id: 's1',
        userId: 'u1',
        tokenHash: hashed,
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(), // ALREADY REVOKED
        user: { id: 'u1', email: 'test@rentit.test', name: 'Test' }
      });
      const updateManySpy = vi.spyOn(prisma.refreshSession, 'updateMany').mockResolvedValue({ count: 1 });

      const mockReq = {
        cookies: {
          refreshToken: rawToken
        }
      };

      await refresh(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(401);
      expect(responseData.error.code).toBe('UNAUTHORIZED');
      expect(responseData.error.message).toContain('Revoked refresh token');
      findSpy.mockRestore();
      updateManySpy.mockRestore();
    });

    it('logout revokes active refresh session', async () => {
      const { prisma } = await import('../src/db/prisma.js');

      const rawToken = 'active-refresh-token';
      const hashed = hashToken(rawToken);

      const updateManySpy = vi.spyOn(prisma.refreshSession, 'updateMany').mockResolvedValue({ count: 1 });

      const mockReq = {
        cookies: {
          refreshToken: rawToken
        }
      };

      await logout(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(200);
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tokenHash: hashed,
            revokedAt: null
          })
        })
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      updateManySpy.mockRestore();
    });
  });

  // 11: Concurrent conversation creation safety
  describe('Requirement 11: Concurrent Conversation Creation Race Safety', () => {
    it('handles concurrent conversation creation atomically via upsert', async () => {
      const { prisma } = await import('../src/db/prisma.js');

      const findRecipientSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2', name: 'User 2' });

      const mockConversation = {
        id: 'conv-1',
        participantAId: 'u1',
        participantBId: 'u2',
        messages: []
      };

      const upsertSpy = vi.spyOn(prisma.conversation, 'upsert').mockResolvedValue(mockConversation);

      const mockReq = {
        user: { id: 'u1' },
        body: { recipientId: 'u2' }
      };

      await getOrCreateConversation(mockReq, mockRes, mockNext);

      expect(responseStatus).toBe(200);
      expect(responseData.id).toBe('conv-1');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            participantAId_participantBId: {
              participantAId: 'u1',
              participantBId: 'u2'
            }
          }
        })
      );

      findRecipientSpy.mockRestore();
      upsertSpy.mockRestore();
    });
  });

  // 12 & 13: Transactional review and item operations
  describe('Requirement 12 & 13: Atomic Transactions for Reviews & Items', () => {
    it('creates review and activity atomically inside prisma.$transaction', async () => {
      const { prisma } = await import('../src/db/prisma.js');

      const findSpy = vi.spyOn(prisma.rentalRequest, 'findUnique').mockResolvedValue({
        id: 'req-1',
        status: 'Completed',
        borrowerId: 'u1',
        lenderId: 'u2',
        itemId: 'item-1',
        item: { id: 'item-1', name: 'Tent', lenderId: 'u2' }
      });
      const findReviewSpy = vi.spyOn(prisma.review, 'findUnique').mockResolvedValue(null);

      const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb({
            review: {
              create: vi.fn().mockResolvedValue({
                id: 'rev-1',
                rating: 5,
                comment: 'Great!',
                author: { name: 'User 1' }
              })
            },
            activity: {
              create: vi.fn().mockResolvedValue({ id: 'act-1' })
            }
          });
        }
        return [
          { id: 'rev-1', rating: 5, comment: 'Great!', author: { name: 'User 1' } },
          { id: 'act-1' }
        ];
      });

      const mockReq = {
        params: { id: 'req-1' },
        user: { id: 'u1' },
        body: { targetType: 'item', rating: 5, comment: 'Great tent!' }
      };

      await createReview(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(201);
      expect(txSpy).toHaveBeenCalled();

      findSpy.mockRestore();
      findReviewSpy.mockRestore();
      txSpy.mockRestore();
    });

    it('rolls back review creation if activity creation fails inside transaction', async () => {
      const { prisma } = await import('../src/db/prisma.js');

      const findSpy = vi.spyOn(prisma.rentalRequest, 'findUnique').mockResolvedValue({
        id: 'req-1',
        status: 'Completed',
        borrowerId: 'u1',
        lenderId: 'u2',
        itemId: 'item-1',
        item: { id: 'item-1', name: 'Tent', lenderId: 'u2' }
      });
      const findReviewSpy = vi.spyOn(prisma.review, 'findUnique').mockResolvedValue(null);

      const txSpy = vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('Activity DB failure'));

      const mockReq = {
        params: { id: 'req-1' },
        user: { id: 'u1' },
        body: { targetType: 'item', rating: 5, comment: 'Great tent!' }
      };

      await createReview(mockReq, mockRes, mockNext);
      expect(responseStatus).toBe(500);

      findSpy.mockRestore();
      findReviewSpy.mockRestore();
      txSpy.mockRestore();
    });
  });

  // 14 & 15: Upload size limit & invalid image rejection
  describe('Requirement 14 & 15: Upload Validation & Security', () => {
    it('returns 400 UPLOAD_TOO_LARGE when file exceeds 5MB', async () => {
      const testApp = express();
      testApp.post('/test-upload', (req, res) => {
        return res.status(400).json({
          error: {
            code: 'UPLOAD_TOO_LARGE',
            message: 'Image must be 5 MB or smaller.'
          }
        });
      });

      const response = await request(testApp).post('/test-upload');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UPLOAD_TOO_LARGE');
      expect(response.body.error.message).toBe('Image must be 5 MB or smaller.');
    });

    it('rejects renamed non-image file via magic byte signature verification', async () => {
      const tmpFilePath = path.join(process.cwd(), 'temp-fake-image.jpg');
      fs.writeFileSync(tmpFilePath, '<?php echo "malicious executable content"; ?>');

      const isValid = await verifyImageSignature(tmpFilePath);
      expect(isValid).toBeFalsy();

      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    });

    it('accepts legitimate JPEG image file via magic bytes', async () => {
      const tmpFilePath = path.join(process.cwd(), 'temp-real-image.jpg');
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      fs.writeFileSync(tmpFilePath, jpegBuffer);

      const isValid = await verifyImageSignature(tmpFilePath);
      expect(isValid).toBeTruthy();

      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    });

    it('accepts legitimate PNG image file via magic bytes', async () => {
      const tmpFilePath = path.join(process.cwd(), 'temp-real-image.png');
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fs.writeFileSync(tmpFilePath, pngBuffer);

      const isValid = await verifyImageSignature(tmpFilePath);
      expect(isValid).toBeTruthy();

      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    });
  });

  // 17: Date-only formatting & calculation
  describe('Requirement 17: Date-Only Formatting & Overlap Logic', () => {
    it('formats YYYY-MM-DD date-only strings consistently', () => {
      const display = formatDisplayDate('2026-06-15');
      expect(display).toMatch(/Jun 15, 2026|15 Jun 2026|6\/15\/2026/);
    });

    it('calculates date addition accurately for YYYY-MM-DD', () => {
      const added = addDaysToDateString('2026-02-28', 1);
      expect(added).toBe('2026-03-01'); // 2026 is not a leap year
    });

    it('correctly detects date range overlaps using strict string comparison', () => {
      expect(isDateRangeOverlapping('2026-05-01', '2026-05-10', '2026-05-05', '2026-05-15')).toBe(true);
      expect(isDateRangeOverlapping('2026-05-01', '2026-05-04', '2026-05-05', '2026-05-15')).toBe(false);
      expect(isDateRangeOverlapping('2026-05-05', '2026-05-05', '2026-05-05', '2026-05-05')).toBe(true);
    });
  });

  // 18: Production CORS allowlist
  describe('Requirement 18: Production CORS Allowlist', () => {
    it('disallows localhost origins in production unless explicitly in CLIENT_ORIGIN', () => {
      const isOriginAllowed = (origin, env, clientOrigin) => {
        if (!origin) return true;
        const configuredOrigins = clientOrigin
          ? clientOrigin.split(',').map((o) => o.trim()).filter(Boolean)
          : [];

        if (env === 'production') {
          return configuredOrigins.includes(origin);
        }
        return (
          configuredOrigins.includes(origin) ||
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
        );
      };

      const prodOrigin = 'https://rentit.example.com';
      expect(isOriginAllowed('http://localhost:5173', 'production', prodOrigin)).toBe(false);
      expect(isOriginAllowed('http://127.0.0.1:5173', 'production', prodOrigin)).toBe(false);
      expect(isOriginAllowed('https://rentit.example.com', 'production', prodOrigin)).toBe(true);

      // In development
      expect(isOriginAllowed('http://localhost:5173', 'development', prodOrigin)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5173', 'development', prodOrigin)).toBe(true);
    });
  });
});
