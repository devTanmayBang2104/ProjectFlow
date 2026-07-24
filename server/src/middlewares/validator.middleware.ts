import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

interface ValidationSchema {
  body?: AnyZodObject | ZodEffects<any>;
  query?: AnyZodObject | ZodEffects<any>;
  params?: AnyZodObject | ZodEffects<any>;
}

export const validateRequest = (schema: ValidationSchema): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
