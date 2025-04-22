import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // In a real Next.js 14 app, you would use the signOut function client-side
    // This route is mostly for demonstration purposes
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Error logging out' },
      { status: 500 }
    );
  }
} 