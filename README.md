# AIVA - Virtual Assistant UI

A full-stack virtual assistant UI built with Next.js 14, Tailwind CSS, and TypeScript, mimicking the layout and functionality of CtrlCenter.ai.

## Features

- 🧠 AI assistant chat interface powered by OpenAI GPT-4
- 🔒 Google authentication
- 💬 Chat history and multiple conversations
- 🧩 External tools connection support
- 📱 Responsive design with collapsible sidebar
- 💾 MongoDB database integration

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, TypeScript
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4
- **Authentication**: NextAuth.js with Google provider
- **Database**: MongoDB with Mongoose
- **Styling**: TailwindCSS
- **Icons**: Lucide React

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env.local` file in the root directory and add your configuration variables
   - You'll need to create a Google OAuth application, get an OpenAI API key, and get MongoDB connection string
   - See `OPENAI_SETUP.md` for details on setting up the OpenAI integration

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/app`: Next.js App Router pages
- `/components`: React components
- `/lib`: Utility functions
- `/models`: MongoDB models
- `/app/api`: API routes

## Authentication

This project uses NextAuth.js for authentication with Google provider. Users must be logged in to access the chat features.

## Database Schema

- **Users**: `{ _id, name, email, image }`
- **Chats**: `{ _id, userId, title, createdAt }`
- **Messages**: `{ _id, chatId, role, content, createdAt }`

## API Routes

- `POST /api/message`: Send user message and get AI response from OpenAI
- `GET /api/chats`: Get user's chat history
- `GET /api/chats/:id`: Get messages for a specific chat
- `POST /api/tools`: Connect external tools
- `POST /api/logout`: Log out the user

## License

MIT
