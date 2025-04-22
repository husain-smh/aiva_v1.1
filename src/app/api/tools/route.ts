import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tools } = await request.json();

    // In a real application, you would save the tools to a database
    // For this example, we just log them
    console.log(`Tools connected for user ${session.user.id}:`, tools);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving tools:', error);
    return NextResponse.json(
      { error: 'Error saving tools' },
      { status: 500 }
    );
  }
} 