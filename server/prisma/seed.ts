import { PrismaClient, WorkspaceRole, TaskStatus, TaskType, Priority, ProjectStatus, SprintStatus, ActivityAction } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    // Clear existing data (in reverse dependency order)
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.sprint.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Hash passwords for seed users
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // 1. Create Users
    const alex = await prisma.user.create({
        data: {
            id: 'user_1',
            name: 'Alex Smith',
            username: 'alexsmith',
            email: 'alexsmith@example.com',
            passwordHash: defaultPasswordHash,
            isEmailVerified: true,
            image: '', // default
            preferences: {
                create: {
                    theme: 'dark',
                    language: 'en',
                }
            }
        }
    });

    const john = await prisma.user.create({
        data: {
            id: 'user_2',
            name: 'John Warrel',
            username: 'johnwarrel',
            email: 'johnwarrel@example.com',
            passwordHash: defaultPasswordHash,
            isEmailVerified: true,
            image: '',
            preferences: {
                create: {
                    theme: 'light',
                    language: 'en',
                }
            }
        }
    });

    const oliver = await prisma.user.create({
        data: {
            id: 'user_3',
            name: 'Oliver Watts',
            username: 'oliverwatts',
            email: 'oliverwatts@example.com',
            passwordHash: defaultPasswordHash,
            isEmailVerified: true,
            image: '',
            preferences: {
                create: {
                    theme: 'dark',
                    language: 'en',
                }
            }
        }
    });

    console.log('Users created:', [alex.email, john.email, oliver.email]);

    // 2. Create Workspace
    const workspace = await prisma.workspace.create({
        data: {
            id: 'org_1',
            name: 'Corp Workspace',
            slug: 'corp-workspace',
            description: 'Corporate Workspace for Startups',
            ownerId: oliver.id,
            members: {
                create: [
                    { userId: alex.id, role: WorkspaceRole.ADMIN, message: 'Joined on initialization' },
                    { userId: john.id, role: WorkspaceRole.ADMIN, message: 'Joined on initialization' },
                    { userId: oliver.id, role: WorkspaceRole.ADMIN, message: 'Joined on initialization' }
                ]
            }
        }
    });

    console.log('Workspace created:', workspace.name);

    // Create Workspace Labels
    const featureLabel = await prisma.label.create({
        data: { name: 'Feature', color: '#3b82f6', workspaceId: workspace.id }
    });
    const bugLabel = await prisma.label.create({
        data: { name: 'Bug', color: '#ef4444', workspaceId: workspace.id }
    });
    const designLabel = await prisma.label.create({
        data: { name: 'Design', color: '#a855f7', workspaceId: workspace.id }
    });

    // 3. Create Projects
    const project1 = await prisma.project.create({
        data: {
            id: '4d0f6ef3-e798-4d65-a864-00d9f8085c51',
            name: 'LaunchPad CRM',
            description: 'A next-gen CRM for startups to manage customer pipelines, analytics, and automation.',
            priority: Priority.HIGH,
            status: ProjectStatus.ACTIVE,
            start_date: new Date('2025-10-10T00:00:00.000Z'),
            end_date: new Date('2026-02-28T00:00:00.000Z'),
            team_lead: oliver.id,
            workspaceId: workspace.id,
            progress: 65,
            members: {
                create: [
                    { userId: alex.id },
                    { userId: john.id },
                    { userId: oliver.id }
                ]
            }
        }
    });

    const project2 = await prisma.project.create({
        data: {
            id: 'e5f0a667-e883-41c4-8c87-acb6494d6341',
            name: 'Brand Identity Overhaul',
            description: 'Rebranding client products with cohesive color palettes and typography systems.',
            priority: Priority.MEDIUM,
            status: ProjectStatus.PLANNING,
            start_date: new Date('2025-10-18T00:00:00.000Z'),
            end_date: new Date('2026-03-10T00:00:00.000Z'),
            team_lead: oliver.id,
            workspaceId: workspace.id,
            progress: 25,
            members: {
                create: [
                    { userId: alex.id },
                    { userId: john.id },
                    { userId: oliver.id }
                ]
            }
        }
    });

    console.log('Projects created:', [project1.name, project2.name]);

    // Create a Sprint for Project 1
    const sprint1 = await prisma.sprint.create({
        data: {
            id: 'sprint_1',
            projectId: project1.id,
            name: 'Sprint 1 - Core Features',
            startDate: new Date('2025-10-10T00:00:00.000Z'),
            endDate: new Date('2025-10-24T00:00:00.000Z'),
            status: SprintStatus.COMPLETED
        }
    });

    const sprint2 = await prisma.sprint.create({
        data: {
            id: 'sprint_2',
            projectId: project1.id,
            name: 'Sprint 2 - Integrations',
            startDate: new Date('2025-10-25T00:00:00.000Z'),
            endDate: new Date('2025-11-08T00:00:00.000Z'),
            status: SprintStatus.ACTIVE
        }
    });

    // 4. Create Tasks for CRM Project
    const t1 = await prisma.task.create({
        data: {
            id: '24ca6d74-7d32-41db-a257-906a90bca8f4',
            projectId: project1.id,
            sprintId: sprint1.id,
            title: 'Design Dashboard UI',
            description: 'Create a modern, responsive CRM dashboard layout.',
            status: TaskStatus.IN_PROGRESS,
            type: TaskType.FEATURE,
            priority: Priority.HIGH,
            assigneeId: alex.id,
            due_date: new Date('2025-10-31T00:00:00.000Z'),
            labels: { connect: [{ id: designLabel.id }, { id: featureLabel.id }] }
        }
    });

    const t2 = await prisma.task.create({
        data: {
            id: '9dbd5f04-5a29-4232-9e8c-a1d8e4c566df',
            projectId: project1.id,
            sprintId: sprint2.id,
            title: 'Integrate Email API',
            description: 'Set up SendGrid integration for email campaigns.',
            status: TaskStatus.TODO,
            type: TaskType.TASK,
            priority: Priority.MEDIUM,
            assigneeId: john.id,
            due_date: new Date('2025-11-30T00:00:00.000Z'),
            labels: { connect: [{ id: featureLabel.id }] }
        }
    });

    const t3 = await prisma.task.create({
        data: {
            id: '0e6798ad-8a1d-4bca-b0cd-8199491dbf03',
            projectId: project1.id,
            title: 'Fix Duplicate Contact Bug',
            description: 'Duplicate records appear when importing CSV files.',
            status: TaskStatus.TODO,
            type: TaskType.BUG,
            priority: Priority.HIGH,
            assigneeId: alex.id,
            due_date: new Date('2025-12-05T00:00:00.000Z'),
            labels: { connect: [{ id: bugLabel.id }] }
        }
    });

    // Create Subtasks for Design Dashboard task
    await prisma.subtask.createMany({
        data: [
            { taskId: t1.id, title: 'Sketch dashboard layout', isCompleted: true },
            { taskId: t1.id, title: 'Build React components in Tailwind', isCompleted: false },
            { taskId: t1.id, title: 'Verify dark mode contrast values', isCompleted: false }
        ]
    });

    // 5. Create Tasks for Brand Overhaul Project
    await prisma.task.create({
        data: {
            id: 'a51bd102-6789-4e60-81ba-57768c63b7db',
            projectId: project2.id,
            title: 'Create New Logo Concepts',
            description: 'Sketch and finalize 3 logo concepts for client review.',
            status: TaskStatus.IN_PROGRESS,
            type: TaskType.FEATURE,
            priority: Priority.MEDIUM,
            assigneeId: john.id,
            due_date: new Date('2025-10-31T00:00:00.000Z')
        }
    });

    // 6. Create Activity Logs
    await prisma.activityLog.createMany({
        data: [
            {
                workspaceId: workspace.id,
                projectId: project1.id,
                userId: oliver.id,
                action: ActivityAction.CREATE,
                entityType: 'PROJECT',
                entityId: project1.id,
                details: 'created project LaunchPad CRM'
            },
            {
                workspaceId: workspace.id,
                projectId: project1.id,
                userId: alex.id,
                action: ActivityAction.CREATE,
                entityType: 'TASK',
                entityId: t1.id,
                details: 'created task Design Dashboard UI'
            }
        ]
    });

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
