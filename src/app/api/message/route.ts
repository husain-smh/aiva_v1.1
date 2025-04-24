import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Message } from '@/models/Message';
import { Chat } from '@/models/Chat';
import openai from '@/lib/openai';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    console.log('Complete session object:', JSON.stringify(session));
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log all available session.user properties
    console.log('Session user email:', session.user.email);
    console.log('Session user _id:', session.user._id);
    console.log('All session.user properties:', Object.keys(session.user));

    const { content, chatId } = await request.json();
    await connectToDatabase();

    // If _id is missing, try to find the user by email
    if (!session.user._id && session.user.email) {
      console.log('Attempting to find user by email as fallback');
      const userFromDB = await User.findOne({ email: session.user.email });
      
      if (userFromDB) {
        console.log('Found user in DB by email:', userFromDB._id);
        // Assign the _id manually
        session.user._id = userFromDB._id.toString();
      }
    }

    let currentChatId = chatId;

    // If no chatId provided, create a new chat
    if (!currentChatId) {
      console.log('Creating new chat with userId:', session.user._id);
      
      // Use email as fallback if _id is still not available
      const userId = session.user._id || session.user.email;
      
      const newChat = await Chat.create({
        userId: userId,
        title: content.substring(0, 30) + '...',
      });
      currentChatId = newChat._id.toString();
    }

    // Save user message
    const userMessage = await Message.create({
      chatId: currentChatId,
      role: 'user',
      content,
    });

    // Get previous messages for context
    const previousMessages = await Message.find({ chatId: currentChatId })
      .sort({ createdAt: 1 })
      .limit(10);

    // Format messages for OpenAI
    const messages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Generate response from OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessageText = response.choices[0].message.content || 'I apologize, but I couldn\'t generate a response.';

      // Save assistant message
      const assistantMessage = await Message.create({
        chatId: currentChatId,
        role: 'assistant',
        content: assistantMessageText,
      });

      return NextResponse.json({
        userMessage,
        assistantMessage,
        chatId: currentChatId,
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Save a fallback message
      const fallbackMessage = 'I apologize, but I encountered an error processing your request. Please make sure your OpenAI API key is set up correctly.';
      
      const assistantMessage = await Message.create({
        chatId: currentChatId,
        role: 'assistant',
        content: fallbackMessage,
      });

      return NextResponse.json({
        userMessage,
        assistantMessage,
        chatId: currentChatId,
        openaiError: true,
      });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Error processing message' },
      { status: 500 }
    );
  }
} 