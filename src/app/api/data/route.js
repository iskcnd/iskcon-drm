import { NextResponse } from 'next/server';
import { currentUser, can } from '@/lib/session';
import { runOp, capabilityFor } from '@/lib/ops';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const { op, payload } = body || {};
  const cap = capabilityFor(op);
  if (cap === undefined) return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });
  if (!can(user, cap)) {
    return NextResponse.json(
      { error: `Your role (${user.role}) is not permitted to do this` }, { status: 403 });
  }

  try {
    const data = await runOp(op, payload, user);
    return NextResponse.json({ data });
  } catch (err) {
    // Postgres constraint violations are useful to the operator; anything else is not.
    const friendly = {
      '23505': 'That value already exists — receipt numbers and category slugs must be unique.',
      '23503': 'Related record missing.',
      '23514': 'A value failed validation. Check date format (YYYY-MM-DD), PAN (ABCDE1234F) or sex (M/F/O).',
      '22P02': 'A value was the wrong type — usually a malformed date or number.',
    }[err.code];
    console.error(`[op:${op}]`, err.message);
    return NextResponse.json({ error: friendly || err.message || 'Something went wrong' }, { status: 400 });
  }
}
