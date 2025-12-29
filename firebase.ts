// Mock implementation of Firebase to fix "Module has no exported member" errors
// and allow the application to run with local persistence (localStorage).

const STORAGE_PREFIX = 'gemini-tutor-data:';

// Mock Auth
export const auth = {
  currentUser: { uid: 'local-user', isAnonymous: true },
};

export const ensureUser = async () => {
  return auth.currentUser;
};

export const getAuth = () => auth;
export const signInAnonymously = async () => ({ user: auth.currentUser });

// Mock Firestore
export const db = {};
export const getFirestore = () => db;
export const initializeApp = (config: any) => ({});

export const collection = (db: any, path: string) => ({ path });
export const doc = (db: any, path: string) => ({ path });

export const query = (ref: any, ...args: any[]) => ref;
export const orderBy = (field: string, direction?: string) => ({ type: 'orderBy', field, direction });
export const where = (field: string, op: string, val: any) => ({ type: 'where', field, op, val });

export const serverTimestamp = () => ({
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  toDate: () => new Date()
});

export const addDoc = async (ref: any, data: any) => {
  const key = STORAGE_PREFIX + ref.path;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  
  const timestamp = {
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0
  };

  const newDoc = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    ...data,
    timestamp
  };

  localStorage.setItem(key, JSON.stringify([...existing, newDoc]));
  
  // Dispatch event for local updates
  window.dispatchEvent(new CustomEvent('firestore-update', { detail: { path: ref.path } }));
  
  return newDoc;
};

export const setDoc = async (ref: any, data: any, options?: any) => {
  // Simplistic setDoc mock if needed
  console.log('Mock setDoc called', ref, data);
};

export const onSnapshot = (ref: any, callback: (snapshot: any) => void) => {
  const path = ref.path;
  const key = STORAGE_PREFIX + path;

  const load = () => {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    // Sort by timestamp
    raw.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

    const docs = raw.map((d: any) => ({
      id: d.id,
      data: () => ({
        ...d,
        timestamp: {
          ...d.timestamp,
          toDate: () => new Date((d.timestamp?.seconds || 0) * 1000)
        }
      })
    }));
    
    callback({ docs });
  };

  load();

  const handler = (e: any) => {
    if (e.detail.path === path) {
      load();
    }
  };

  window.addEventListener('firestore-update', handler);
  return () => window.removeEventListener('firestore-update', handler);
};