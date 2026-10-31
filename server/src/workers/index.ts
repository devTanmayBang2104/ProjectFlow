import queueService from '../services/queue.service';
import prisma from '../config/db';
import { ActivityLogService } from '../services/activity.service';
import { ActivityAction } from '@prisma/client';
import { sendVerificationEmail } from '../services/mail.service';

const activityLog = new ActivityLogService();

/**
 * Initializes and registers all background job workers.
 */
export function initBackgroundWorkers(): void {
  // 1. Sprint Completion Fanout Worker
  queueService.registerWorker<{
    sprintId: string;
    projectId: string;
    workspaceId: string;
    userId: string;
  }>('sprint-jobs', async (data, jobId) => {
    console.log(`[Worker:sprint-jobs] Processing job ${jobId} for completed sprint ${data.sprintId}...`);

    // Fetch sprint details and tasks
    const sprint = await prisma.sprint.findUnique({
      where: { id: data.sprintId },
      include: {
        tasks: {
          select: { id: true, title: true, status: true, assigneeId: true },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint with ID ${data.sprintId} not found.`);
    }

    const completedTasks = sprint.tasks.filter((t) => t.status === 'DONE');

    // Asynchronously log sprint completion activity
    await activityLog.log(
      data.workspaceId,
      data.userId,
      ActivityAction.UPDATE,
      'SPRINT',
      data.sprintId,
      `Sprint "${sprint.name}" completed. ${completedTasks.length}/${sprint.tasks.length} tasks completed.`,
      data.projectId
    );

    // Fetch project members for notification fan-out
    const members = await prisma.projectMember.findMany({
      where: { projectId: data.projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // In-app notifications fan-out
    if (members.length > 0) {
      const notificationRows = members.map((m) => ({
        userId: m.userId,
        title: 'Sprint Completed',
        message: `Sprint "${sprint.name}" has been completed! (${completedTasks.length}/${sprint.tasks.length} tasks closed)`,
        type: 'GENERAL' as const,
        entityType: 'SPRINT',
        entityId: data.sprintId,
      }));

      await prisma.notification.createMany({
        data: notificationRows,
      });
    }

    console.log(`[Worker:sprint-jobs] Finished sprint completion fanout for "${sprint.name}" to ${members.length} member(s).`);
    return { success: true, sprintId: data.sprintId, taskCount: sprint.tasks.length };
  });

  // 2. Asynchronous Email Delivery Worker
  queueService.registerWorker<{
    type: 'verification' | 'reset';
    email: string;
    name: string;
    token: string;
  }>('email-jobs', async (data, jobId) => {
    console.log(`[Worker:email-jobs] Sending ${data.type} email to ${data.email} (job: ${jobId})...`);

    if (data.type === 'verification') {
      await sendVerificationEmail(data.email, data.name, data.token);
    }

    return { sent: true, email: data.email };
  });

  console.log('[Workers] Background job workers initialized.');
}
