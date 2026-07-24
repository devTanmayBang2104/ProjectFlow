import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the stack trace in development or warning log in general
  console.error(`[Error] ${err.name || 'InternalError'}: ${err.message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  // 1. Zod Validation Schema Error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // 2. Custom App Error (Operational)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
      },
    });
    return;
  }

  // 3. Prisma Database Error Handlers (optional but clean)
  if (err.code && err.code.startsWith('P')) {
    // Prisma unique key violation
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          message: `Duplicate field value: ${err.meta?.target || 'unique constraint violation'}.`,
        },
      });
      return;
    }
  }

  // 4. Default Unknown Fallback Error
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: {
      message: isDev ? err.message : 'An internal server error occurred.',
      ...(isDev && { stack: err.stack }),
    },
  });
};
export default errorHandler;
