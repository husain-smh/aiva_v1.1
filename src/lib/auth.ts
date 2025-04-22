import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export async function getSession() {
  const session = await getServerSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/');
  }
  
  return user;
} 