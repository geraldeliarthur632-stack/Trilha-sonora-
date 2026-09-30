import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (appInstance) return appInstance;
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return appInstance;
  } catch (err) {
    console.warn('Erro ao inicializar Firebase App:', err);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (dbInstance) return dbInstance;

  try {
    const app = getFirebaseApp();
    if (!app) return null;

    // Inicializa o Firestore com o Database ID configurado
    dbInstance =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);

    // Teste de conexão silencioso
    testConnection(dbInstance);

    return dbInstance;
  } catch (err) {
    console.warn('Erro ao inicializar Firebase Firestore:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (authInstance) return authInstance;

  try {
    const app = getFirebaseApp();
    if (!app) return null;
    authInstance = getAuth(app);
    return authInstance;
  } catch (err) {
    console.warn('Erro ao inicializar Firebase Auth:', err);
    return null;
  }
}

async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Aviso: Firestore cliente offline ou aguardando conexão.');
    }
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export class FirebaseService {
  static isAvailable(): boolean {
    return isFirebaseConfigured();
  }

  static getAuth(): Auth | null {
    return getFirebaseAuth();
  }

  static getCurrentUser(): FirebaseUser | null {
    const auth = getFirebaseAuth();
    return auth?.currentUser || null;
  }

  static onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
    const auth = getFirebaseAuth();
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }

  static usernameToInternalEmail(username: string): string {
    const clean = username
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_');
    return `${clean || 'estudante'}@trilhadosaber.app`;
  }

  static formatAuthErrorMessage(err: any): string {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Digite um e-mail válido.';
      case 'auth/missing-email':
        return 'Digite seu e-mail.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'E-mail ou senha incorretos.';
      case 'auth/user-not-found':
        return 'Não encontramos uma conta com esse e-mail.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Tente entrar.';
      case 'auth/weak-password':
      case 'auth/missing-password':
        return 'A senha precisa ter pelo menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Não foi possível conectar. Verifique sua internet.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação foi fechada antes de concluir o acesso.';
      case 'auth/operation-not-allowed':
        return 'O provedor de e-mail e senha não está ativado no Firebase Authentication.';
      default:
        return err?.message || 'Ocorreu um erro ao autenticar. Tente novamente.';
    }
  }

  static async registerWithUsername(
    username: string,
    password: string,
    displayName?: string
  ): Promise<FirebaseUser | null> {
    const internalEmail = this.usernameToInternalEmail(username);
    const finalName = displayName?.trim() || username.trim();
    return this.registerWithEmail(internalEmail, password, finalName);
  }

  static async loginWithUsername(
    username: string,
    password: string
  ): Promise<FirebaseUser | null> {
    const internalEmail = this.usernameToInternalEmail(username);
    return this.loginWithEmail(internalEmail, password);
  }

  static async loginWithUserOrEmail(
    identifier: string,
    password: string
  ): Promise<FirebaseUser | null> {
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return this.loginWithEmail(clean, password);
    }
    return this.loginWithUsername(clean, password);
  }

  static async loginWithGoogle(): Promise<FirebaseUser | null> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      return credential.user;
    } catch (err: any) {
      console.warn('Aviso no login do Google:', err?.message || err);
      throw err;
    }
  }

  static async loginWithEmail(email: string, password: string): Promise<FirebaseUser | null> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return credential.user;
    } catch (err: any) {
      if (err?.code === 'auth/network-request-failed') {
        // Tentativa de reconexão automática única após pequeno atraso
        try {
          await new Promise((res) => setTimeout(res, 800));
          const retryCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          return retryCredential.user;
        } catch {}
      }
      console.warn('Aviso no login com e-mail/senha:', err?.message || err);
      throw err;
    }
  }

  static async registerWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<FirebaseUser | null> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && credential.user) {
        try {
          await updateProfile(credential.user, { displayName });
        } catch (profileErr) {
          console.warn('Aviso ao atualizar displayName no perfil auth:', profileErr);
        }
      }
      return credential.user;
    } catch (err: any) {
      if (err?.code === 'auth/network-request-failed') {
        // Tentativa de reconexão automática única após pequeno atraso
        try {
          await new Promise((res) => setTimeout(res, 800));
          const retryCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          if (displayName && retryCredential.user) {
            try {
              await updateProfile(retryCredential.user, { displayName });
            } catch {}
          }
          return retryCredential.user;
        } catch {}
      }
      console.warn('Aviso no cadastro com e-mail/senha:', err?.message || err);
      throw err;
    }
  }

  static async sendPasswordReset(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado.');
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.warn('Aviso ao enviar e-mail de recuperação de senha:', err?.message || err);
      throw err;
    }
  }

  static async logout(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
  }

  static async syncProgress(userId: string, progressData: any): Promise<boolean> {
    const db = getDb();
    if (!db || !userId) return false;

    const path = `users/${userId}`;
    try {
      const sanitized: Record<string, any> = {};
      Object.entries(progressData || {}).forEach(([key, val]) => {
        if (val !== undefined) {
          sanitized[key] = val;
        }
      });
      sanitized.lastSyncedAt = new Date().toISOString();

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, sanitized, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async restoreProgress(userId: string): Promise<any | null> {
    const db = getDb();
    if (!db || !userId) return null;

    const path = `users/${userId}`;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return null;
    }
  }
}

