import { NextResponse } from 'next/server';

export async function POST(_request: Request) {
  // Clear the next-auth session token cookie so subsequent requests are unauthenticated
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' });
  return response;
}
