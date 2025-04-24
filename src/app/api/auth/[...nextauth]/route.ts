import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        await connectToDatabase();
        
        // Find or create the user in our database
        let dbUser = await User.findOne({ email: user.email });
        
        if (!dbUser) {
          // Create new user if not exists
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
          });
          console.log('Created new user with ID:', dbUser._id);
        }
        
        // Store MongoDB _id in the token
        token._id = dbUser._id.toString();
        console.log('JWT callback - Set token._id:', token._id);
      }
      
      return token;
    },
    async session({ session, token }) {
      // Ensure we always have the MongoDB _id in the session
      if (session.user && token._id) {
        session.user._id = token._id;
        console.log('Session callback - Set session.user._id:', session.user._id);
      } else if (session.user && session.user.email && !token._id) {
        // This is a fallback but shouldn't normally happen
        console.log('Session callback - Missing token._id, attempting to find by email');
        await connectToDatabase();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user._id = dbUser._id.toString();
          console.log('Session callback - Retrieved _id from DB:', session.user._id);
        }
      }
      
      return session;
    },
    async signIn({ user }) {
      try {
        // We now handle user creation in the JWT callback
        // This is just a safety check
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 