import { Request, Response, NextFunction } from 'express';

export const mockUser = {
  id: 'user_1',
  name: 'Tanmay Bange',
  username: 'tanmaybange',
  email: 'alexsmith@example.com',
  role: 'ADMIN',
  isEmailVerified: true,
  image: '',
  preferences: {
    theme: 'light',
    language: 'en'
  }
};

let tasksList = [
  { id: 'task_1', title: 'Design Dashboard UI Component', priority: 'HIGH', status: 'IN_PROGRESS', type: 'FEATURE', due_date: '2026-11-15' },
  { id: 'task_2', title: 'Integrate Email Automation API', priority: 'MEDIUM', status: 'TODO', type: 'TASK', due_date: '2026-11-30' },
  { id: 'task_3', title: 'Fix Duplicate Workspace Contact Bug', priority: 'HIGH', status: 'TODO', type: 'BUG', due_date: '2026-12-05' },
  { id: 'task_4', title: 'Setup High-Performance Database Migrations', priority: 'LOW', status: 'COMPLETED', type: 'TASK', due_date: '2026-10-25' }
];

let projectsList = [
  {
    id: 'proj_1',
    name: 'LaunchPad CRM Platform',
    description: 'Next-gen enterprise CRM pipeline with automated sprint tracking and analytics.',
    priority: 'HIGH',
    status: 'ACTIVE',
    progress: 75,
    tasksCount: 4,
    workspaceId: 'org_1',
    members: [
      { id: 'mem_1', user: mockUser },
      { id: 'mem_2', user: { name: 'Oliver Watts', email: 'oliver@example.com' } }
    ],
    tasks: tasksList,
    end_date: '2026-12-31'
  },
  {
    id: 'proj_2',
    name: 'Brand Identity Overhaul',
    description: 'Corporate branding, typography redesign, and style guide generation.',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    progress: 40,
    tasksCount: 2,
    workspaceId: 'org_1',
    members: [
      { id: 'mem_1', user: mockUser }
    ],
    tasks: [],
    end_date: '2026-11-30'
  }
];

export const mockWorkspace = {
  id: 'org_1',
  name: 'ProjectFlow Workspace',
  slug: 'projectflow-workspace',
  description: 'Primary Engineering Workspace for ProjectFlow SaaS',
  ownerId: 'user_1',
  role: 'ADMIN',
  members: [
    { id: 'mem_1', userId: 'user_1', role: 'ADMIN', user: mockUser },
    { id: 'mem_2', userId: 'user_2', role: 'MEMBER', user: { id: 'user_2', name: 'Oliver Watts', email: 'oliverwatts@example.com' } },
    { id: 'mem_3', userId: 'user_3', role: 'MEMBER', user: { id: 'user_3', name: 'John Warrel', email: 'johnwarrel@example.com' } }
  ],
  projects: projectsList
};

export const devFallbackMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const url = req.path;
  const method = req.method;

  // 1. Auth routes
  if (url === '/auth/login' && method === 'POST') {
    res.cookie('accessToken', 'mock_access_token_123', { httpOnly: false });
    res.cookie('refreshToken', 'mock_refresh_token_123', { httpOnly: false });
    res.cookie('csrf-token', 'mock_csrf_token_123', { httpOnly: false });
    return res.status(200).json({
      success: true,
      data: {
        user: mockUser,
        accessToken: 'mock_access_token_123'
      }
    });
  }

  if (url === '/auth/refresh' && method === 'POST') {
    return res.status(200).json({
      success: true,
      data: {
        accessToken: 'mock_access_token_refreshed'
      }
    });
  }

  if (url === '/auth/me' && method === 'GET') {
    if (req.cookies && req.cookies.accessToken) {
      return res.status(200).json({
        success: true,
        data: mockUser
      });
    } else {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' }
      });
    }
  }

  if (url === '/auth/logout' && method === 'POST') {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  // 2. Workspace routes
  if (url === '/workspaces' && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [mockWorkspace]
    });
  }

  if (url.startsWith('/workspaces/') && url.includes('/activities') && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [
        { id: 'act_1', action: 'CREATE', entityType: 'TASK', details: 'created task Design Dashboard UI', createdAt: new Date() },
        { id: 'act_2', action: 'UPDATE', entityType: 'PROJECT', details: 'updated LaunchPad CRM progress to 75%', createdAt: new Date() }
      ],
      pagination: { total: 2, page: 1, limit: 15 }
    });
  }

  if (url.startsWith('/workspaces/') && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: mockWorkspace
    });
  }

  // 3. Project routes
  projectsList.forEach((proj) => {
    if (proj.tasks && proj.tasks.length > 0) {
      const doneCount = proj.tasks.filter((t: any) => t.status === 'DONE' || t.status === 'COMPLETED').length;
      proj.progress = Math.round((doneCount / proj.tasks.length) * 100);
    }
  });

  if (url.startsWith('/projects/workspace/') && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: projectsList
    });
  }

  if (url === '/projects' && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: projectsList
    });
  }

  if (url.startsWith('/projects/') && method === 'GET') {
    const projId = url.replace('/projects/', '').split('?')[0];
    const proj = projectsList.find(p => p.id === projId) || projectsList[0];
    return res.status(200).json({
      success: true,
      data: { ...proj, tasks: tasksList }
    });
  }

  // 4. Task routes
  if (url === '/tasks' && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: tasksList
    });
  }

  if (url.startsWith('/tasks/workspace/') && method === 'GET') {
    return res.status(200).json({
      success: true,
      data: tasksList
    });
  }

  if (url === '/tasks' && method === 'POST') {
    const newTask = {
      id: `task_${Date.now()}`,
      title: req.body.title || 'New Automated Task',
      priority: req.body.priority || 'MEDIUM',
      status: req.body.status || 'TODO',
      type: 'TASK',
      due_date: req.body.dueDate || '2026-11-20'
    };
    tasksList.push(newTask);
    return res.status(201).json({ success: true, data: newTask });
  }

  // Pass to real routes if not matched
  next();
};
