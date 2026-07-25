import cron from 'node-cron';
import prisma from '../config/db';

export const initCronJobs = () => {
    // Schedule a task to run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        try {
            // 1. Purge soft-deleted users older than 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await prisma.user.deleteMany({
                where: {
                    deletedAt: {
                        lt: thirtyDaysAgo,
                    },
                },
            });

            if (result.count > 0) {
                console.log(`[Cron] Successfully purged ${result.count} soft-deleted user account(s) older than 30 days.`);
            }

            // 2. Purge unverified accounts older than 24 hours
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            const unverifiedResult = await prisma.user.deleteMany({
                where: {
                    isEmailVerified: false,
                    createdAt: {
                        lt: twentyFourHoursAgo,
                    },
                },
            });

            if (unverifiedResult.count > 0) {
                console.log(`[Cron] Successfully purged ${unverifiedResult.count} unverified user account(s) older than 24 hours.`);
            }
        } catch (error) {
            console.error('[Cron] Error in daily database cleanup:', error);
        }
    });
};
