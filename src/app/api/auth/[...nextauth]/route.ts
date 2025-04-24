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
        // Find the user in our database
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          // Add the MongoDB _id to the token
          token._id = dbUser._id.toString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Pass the MongoDB _id to the session
        session.user._id = token._id as string;
      }
      return session;
    },
    async signIn({ user }) {
      try {
        await connectToDatabase();
        
        // Check if user exists, if not, create new user
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
          });
        }
        
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 