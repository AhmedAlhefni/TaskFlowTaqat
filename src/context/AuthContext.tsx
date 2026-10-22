import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/src/lib/firebase";
import { UserProfile } from "@/src/types";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const authEventVersion = React.useRef(0);
  const activeAuthUid = React.useRef<string | null>(null);

  const inFlightSync = React.useRef<Map<string, Promise<UserProfile>>>(new Map());

  // Fast timeout promise wrapper
  const withTimeout = <T,>(promise: Promise<T>, ms = 3500, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  // Sync user profile to Firestore with fallback and deduplication
  const syncUserProfile = async (user: User, fallbackName?: string): Promise<UserProfile> => {
    const email = (user.email || "").toLowerCase().trim();
    const displayName = user.displayName || fallbackName || email.split("@")[0] || "User";

    const defaultProfile: UserProfile = {
      uid: user.uid,
      displayName,
      email,
      photoURL: user.photoURL || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Deduplicate concurrent sync calls for same user
    const existingSync = inFlightSync.current.get(user.uid);
    if (existingSync) return existingSync;

    const syncPromise = (async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await withTimeout(getDoc(userRef), 3000, null as any);

        if (!snap || !snap.exists()) {
          const newProfile: UserProfile = {
            ...defaultProfile,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
          };
          await setDoc(userRef, newProfile);
          if (email) {
            const lookupRef = doc(db, "user_lookups", email);
            await setDoc(lookupRef, {
              uid: user.uid,
              email,
              displayName,
            }, { merge: true });
          }
          return newProfile;
        } else {
          const data = snap.data() as UserProfile;
          if (user.displayName && data.displayName !== user.displayName) {
            await setDoc(userRef, { displayName: user.displayName, updatedAt: serverTimestamp() }, { merge: true });
            data.displayName = user.displayName;
          }

          if (email) {
            const lookupRef = doc(db, "user_lookups", email);
            await setDoc(lookupRef, {
              uid: user.uid,
              email,
              displayName,
            }, { merge: true });
          }

          return data;
        }
      } catch (err: any) {
        if (err?.code === "permission-denied") {
          window.dispatchEvent(new CustomEvent("taskflow_firestore_permission_denied"));
        }
        return defaultProfile;
      } finally {
        inFlightSync.current.delete(user.uid);
      }
    })();

    inFlightSync.current.set(user.uid, syncPromise);
    return syncPromise;
  };

  const adoptAuthenticatedUser = (user: User) => {
    if (activeAuthUid.current !== user.uid) {
      activeAuthUid.current = user.uid;
      setUserProfile(null);
      setLoading(true);
    }
    setCurrentUser(user);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const eventVersion = ++authEventVersion.current;
      if (user) {
        const userChanged = activeAuthUid.current !== user.uid;
        activeAuthUid.current = user.uid;
        if (userChanged) {
          setLoading(true);
          setUserProfile(null);
        }
        setCurrentUser(user);
        try {
          const profile = await syncUserProfile(user);
          if (authEventVersion.current === eventVersion) setUserProfile(profile);
        } catch {
          if (authEventVersion.current === eventVersion) {
            setUserProfile({
              uid: user.uid,
              displayName: user.displayName || user.email?.split("@")[0] || "User",
              email: (user.email || "").toLowerCase(),
              createdAt: new Date().toISOString(),
            });
          }
        }
      } else {
        activeAuthUid.current = null;
        setCurrentUser(null);
        setUserProfile(null);
      }
      if (authEventVersion.current === eventVersion) setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const userCred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    adoptAuthenticatedUser(userCred.user);
    const profile = await syncUserProfile(userCred.user);
    setUserProfile(profile);
    setLoading(false);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    adoptAuthenticatedUser(userCred.user);
    if (name.trim()) {
      await updateProfile(userCred.user, { displayName: name.trim() });
    }
    inFlightSync.current.delete(userCred.user.uid);
    const profile = await syncUserProfile(userCred.user, name.trim());
    setUserProfile(profile);
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    const userCred = await signInWithPopup(auth, googleProvider);
    adoptAuthenticatedUser(userCred.user);
    const profile = await syncUserProfile(userCred.user);
    setUserProfile(profile);
    setLoading(false);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await signOut(auth);
    activeAuthUid.current = null;
    setCurrentUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
