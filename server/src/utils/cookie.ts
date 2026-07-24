import { Response } from 'express';

/**
 * Sets secure, httpOnly cookies for access and refresh tokens.
 */
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

/**
 * Clears access and refresh token cookies from the browser.
 */
export const clearAuthCookies = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('strict' as const) : ('lax' as const),
    path: '/',
  };

  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
  res.clearCookie('csrf-token', { path: '/' });
};
