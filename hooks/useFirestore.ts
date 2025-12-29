import { useState, useEffect, useCallback } from 'react';
import { 
  db, 
  auth, 
  ensureUser, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  orderBy, 
  query, 
  serverTimestamp,
  addDoc
} from '../firebase';
import { Message, Role, Subject } from '../types';

export const useFirestore = (subject: Subject) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Initialize User
  useEffect(() => {
    ensureUser().then(user => {
      setUserId(user.uid);
    });
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
    
    await addDoc(messagesRef, {
      role,
      content: text,
      timestamp: serverTimestamp()
    });
  }, [userId, subject]);

  // Clear chat for subject
  const clearChat = useCallback(async () => {
     // Implementation skipped for brevity (would require batch delete)
     console.log("Clear chat requested (not implemented in this demo layer)");
  }, []);

  return { messages, addMessage, loadingHistory, userId };
};