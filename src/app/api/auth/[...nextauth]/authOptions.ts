import { AuthOptions, SessionStrategy } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        await connectToDatabase();

        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
          });
          console.log('Created new user with ID:', dbUser._id);
        }

        token._id = dbUser._id.toString();
        console.log('JWT callback - Set token._id:', token._id);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token._id) {
        session.user._id = token._id;
        console.log('Session callback - Set session.user._id:', session.user._id);
      } else if (session.user?.email && !token._id) {
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
      return true;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 24 * 60 * 60, // 60 days
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 24 * 60 * 60,
      },
    },
  },
};
