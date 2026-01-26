import { useState, useEffect, useCallback } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, auth, onAuthStateChanged, doc, setDoc } from '../firebase';
import { Message, Role, Subject, Attachment, ChatSession } from '../types';

export const useChatList = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u: any) => {
      setUserId(u ? u.uid : null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, `users/${userId}/chats`);
    const q = query(chatsRef, orderBy('createdAt', 'desc')); // Assuming createdAt or updatedAt

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        // Ensure subject is typed correctly or validated
      })) as ChatSession[];
      setSessions(chats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { sessions, loading };
}

export const useFirestore = (subject: Subject) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Initialize User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Listen to messages
  useEffect(() => {
    if (!userId) {
      setMessages([]); // Clear if no user
      return;
    }

    // We store chats in users/{userId}/chats/{subject}/messages
    const messagesRef = collection(db, `users/${userId}/chats/${subject}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate() || new Date(),
      })) as Message[];

      setMessages(msgs);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [userId, subject]);

  const addMessage = useCallback(async (text: string, role: Role, attachment?: Attachment) => {
    if (!userId) return;

    const messagesRef = collection(db, `users/${userId}/chats/${subject}/messages`);
    const chatDocRef = doc(db, `users/${userId}/chats/${subject}`);

    try {
      // 1. Add Message
      await addDoc(messagesRef, {
        role,
        content: text,
        timestamp: serverTimestamp(),
        ...(attachment ? { attachment } : {})
      });

      // 2. Update Chat Metadata (Upsert)
      // Only update if it's the last message (optimistic) or just always update
      // We want the sidebar to show "Math" and maybe last snippet? content is simplest.
      await setDoc(chatDocRef, {
        subject,
        createdAt: serverTimestamp(), // Ideally updatedAt, but Sidebar sorts by something. using createdAt for now as per plan/types? Types has createdAt. 
        userId,
        // Optional: lastMessage: text
      }, { merge: true });

    } catch (dbError) {
      console.error("Firestore Write Error:", dbError);
    }
  }, [userId, subject]);

  const createNewChat = useCallback(async () => {
    setMessages([]);
  }, []);

  return { messages, addMessage, loadingHistory, userId, createNewChat };
};