import { prisma } from '../db/prisma.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantAId: userId },
          { participantBId: userId }
        ]
      },
      include: {
        participantA: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        },
        participantB: {
          select: { id: true, name: true, avatarUrl: true, city: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = conversations.map((c) => {
      const otherUser = c.participantAId === userId ? c.participantB : c.participantA;
      return {
        id: c.id,
        otherUser,
        lastMessage: c.messages[0] || null,
        updatedAt: c.updatedAt
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      throw new ValidationError('recipientId is required.');
    }

    if (recipientId === userId) {
      throw new ValidationError('You cannot message yourself.');
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      throw new NotFoundError('Recipient user not found.');
    }

    // Consistent ordering to hit the unique compound key
    const [partA, partB] = userId < recipientId ? [userId, recipientId] : [recipientId, userId];

    let conv;
    try {
      conv = await prisma.conversation.upsert({
        where: {
          participantAId_participantBId: {
            participantAId: partA,
            participantBId: partB
          }
        },
        update: {},
        create: {
          participantAId: partA,
          participantBId: partB
        },
        include: {
          participantA: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          },
          participantB: {
            select: { id: true, name: true, avatarUrl: true, city: true }
          }
        }
      });
    } catch (err) {
      // Prisma P2002 represents unique constraint conflict in high-concurrency scenarios
      if (err.code === 'P2002') {
        conv = await prisma.conversation.findUnique({
          where: {
            participantAId_participantBId: {
              participantAId: partA,
              participantBId: partB
            }
          },
          include: {
            participantA: {
              select: { id: true, name: true, avatarUrl: true, city: true }
            },
            participantB: {
              select: { id: true, name: true, avatarUrl: true, city: true }
            }
          }
        });
      } else {
        throw err;
      }
    }

    const otherUser = conv.participantAId === userId ? conv.participantB : conv.participantA;

    res.json({
      id: conv.id,
      otherUser,
      createdAt: conv.createdAt
    });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conv) {
      throw new NotFoundError('Conversation not found.');
    }

    if (conv.participantAId !== userId && conv.participantBId !== userId) {
      throw new ForbiddenError('You are not a participant in this conversation.');
    }

    // Mark unread messages from other user as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 50) : null;

    const total = await prisma.message.count({ where: { conversationId } });

    const findOptions = {
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    };

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 50;
      findOptions.skip = (p - 1) * l;
      findOptions.take = l;

      const messages = await prisma.message.findMany(findOptions);
      return res.json({
        messages,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    const messages = await prisma.message.findMany(findOptions);

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { body } = req.body;

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty.');
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conv) {
      throw new NotFoundError('Conversation not found.');
    }

    if (conv.participantAId !== userId && conv.participantBId !== userId) {
      throw new ForbiddenError('You are not a participant in this conversation.');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: body.trim()
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}
