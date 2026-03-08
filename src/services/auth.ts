import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { AppUser } from '@/types'

export async function signIn(email: string, password: string): Promise<AppUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid))
  if (!userDoc.exists()) {
    throw new Error('Пользователь не найден в базе данных')
  }
  return { uid: credential.user.uid, ...userDoc.data() } as AppUser
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const userDoc = await getDoc(doc(db, 'users', uid))
  if (!userDoc.exists()) return null
  return { uid, ...userDoc.data() } as AppUser
}
