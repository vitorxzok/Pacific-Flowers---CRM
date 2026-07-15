import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    // We need the postgres connection string, not the REST URL
    // If we only have the REST URL, we can't connect directly via pg
    return NextResponse.json({ error: 'Need DB string' });
  } catch(e) {
    return NextResponse.json({ error: 'err' });
  }
}
