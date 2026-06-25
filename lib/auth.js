import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { connectDB } from "@/lib/mongodb";
import { getMongoClient } from "@/lib/mongo-client";
import User from "@/lib/models/User";

/**
 * NextAuth configuration.
 *
 * Providers:
 *   - Google OAuth — sign in with a Google account.
 *   - Email        — passwordless magic link sent via SMTP.
 *   - Credentials  — email + password (hashed via bcryptjs).
 *
 * Adapter:
 *   - MongoDBAdapter stores users, accounts, sessions, and verification
 *     tokens in MongoDB.
 *
 * Session strategy:
 *   - JWT (required when mixing Email provider with the database adapter).
 *
 * Role:
 *   - User.role (job_seeker | employer | admin) is read from the DB on first
 *     JWT creation, then carried on the JWT for fast access in callbacks.
 */
function buildAdapter() {
  if (!process.env.MONGODB_URI) return undefined;
  // Wrap async resolution in a lazy proxy — MongoDBAdapter calls client.db()
  // on first use, which is after our async getMongoClient() resolves.
  const clientP = getMongoClient();
  return MongoDBAdapter(clientP);
}

export const authOptions = {
  adapter: buildAdapter(),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select(
          "+password"
        );
        if (!user || !user.password) return null;
        if (user.banned) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/signin",
  },

  callbacks: {
    // Stamp role onto the JWT on first sign-in.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "job_seeker";
      }
      // For OAuth/Email users, look up role from DB on every JWT refresh.
      // (Credentials provider already sets it above.)
      if (!token.role && token.email) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }).lean();
          if (dbUser) token.role = dbUser.role;
        } catch {}
      }
      return token;
    },

    // Expose user id + role on the session.
    async session({ session, token }) {
      if (session.user) {
        if (token?.sub) session.user.id = token.sub;
        if (token?.id) session.user.id = token.id;
        session.user.role = token?.role || "job_seeker";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;

export async function ensureDB() {
  await connectDB();
}