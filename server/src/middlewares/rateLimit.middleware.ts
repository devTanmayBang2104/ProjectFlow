import rateLimit from 'express-rate-limit';

// General API rate limiter (15 minutes, max 150 requests per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for sensitive auth routes (15 minutes, max 15 requests per IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
