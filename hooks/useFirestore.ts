import { useState, useEffect, useCallback } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, auth, onAuthStateChanged } from '../firebase';
import { Message, Role, Subject } from '../types';

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
    if (!userId) return;

    // We store chats in users/{userId}/chats/{subject}/messages
    // Using subject as ID for simplicity in this demo to keep one thread per subject
    // In a full app, you might generate unique session IDs
    const messagesRef = collection(db, `users/${userId}/chats/${subject}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Convert Firestore Timestamp to Date for UI
        timestamp: d.data().timestamp?.toDate() || new Date()
      })) as Message[];

      setMessages(msgs);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [userId, subject]);

  const addMessage = useCallback(async (text: string, role: Role) => {
    if (!userId) return;

    const messagesRef = collection(db, `users/${userId}/chats/${subject}/messages`);

    try {
      await addDoc(messagesRef, {
        role,
        content: text,
        timestamp: serverTimestamp()
      });
    } catch (dbError) {
      console.error("Firestore Write Error:", dbError);
      // Depending on requirements, we might want to rethrow or handle specific cases
      // For now, logging is the priority request.
    }
  }, [userId, subject]);

  const createNewChat = useCallback(async () => {
    // In a real app, we might create a new session ID here.
    // For this demo (one chat per subject), "New Chat" clears the current view.
    // We achieve this locally by just setting messages to empty, 
    // effectively "hiding" previous messages until reload or re-fetch.
    // To truly clear, we'd need to implementing deletion or sessioning in the mock DB.
    setMessages([]);

    // Optional: If we wanted to "Archive" the chat, we'd just switch session IDs.
  }, []);

  // Clear chat for subject
  const clearChat = useCallback(async () => {
    // Implementation skipped for brevity (would require batch delete)
    console.log("Clear chat requested (not implemented in this demo layer)");
  }, []);

  return { messages, addMessage, loadingHistory, userId, createNewChat };
};