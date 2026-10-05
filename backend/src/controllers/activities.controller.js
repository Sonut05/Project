import { prisma } from '../db/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export async function getActivities(req, res, next) {
  try {
    const userId = req.user.id;
    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10) || 1) : null;
    const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 50) : null;

    const total = await prisma.activity.count({ where: { userId } });

    const findOptions = {
      where: { userId },
      orderBy: { createdAt: 'desc' }
    };

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 50;
      findOptions.skip = (p - 1) * l;
      findOptions.take = l;

      const activities = await prisma.activity.findMany(findOptions);
      return res.json({
        activities,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    findOptions.take = 50;
    const activities = await prisma.activity.findMany(findOptions);
    res.json(activities);
  } catch (err) {
    next(err);
  }
}

export async function deleteActivity(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      throw new NotFoundError('Activity not found.');
    }

    if (activity.userId !== userId) {
      throw new ForbiddenError('You cannot delete another user’s activity.');
    }

    await prisma.activity.delete({ where: { id } });
    res.json({ message: 'Activity removed.' });
  } catch (err) {
    next(err);
  }
}
