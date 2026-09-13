import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';

export const validateRequest = (schema: ZodType<any> | any): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema && typeof schema.parseAsync === 'function') {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
