import cron from 'node-cron';
import prisma from '../config/db';

export const initCronJobs = () => {
    // Schedule a task to run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running soft-delete user purge check...');
        try {
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
        } catch (error) {
            console.error('[Cron] Error purging soft-deleted users:', error);
        }
    });
};
