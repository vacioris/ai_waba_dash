import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'fallback-change-me';
const COOKIE_NAME = 'tnzf_auth';
const SESSION_HOURS = 24 * 7;

function sign(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

export function makeAuthToken(): string {
  const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `valid:${expiry}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string | undefined): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (sign(payload) !== sig) return false;
  const [marker, expiryStr] = payload.split(':');
  if (marker !== 'valid') return false;
  const expiry = parseInt(expiryStr, 10);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
