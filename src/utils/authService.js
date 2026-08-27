import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updatePassword,
  onAuthStateChanged
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const DEFAULT_USERS = [
  { id: 1, name: 'Super Administrador', username: 'admin', password: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'superadmin', roleName: 'Super Administrador', status: 'active' },
  { id: 2, name: 'Visor Institucional', username: 'visor', password: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'visor', roleName: 'Visor Institucional', status: 'active' },
  { id: 3, name: 'Médico General', username: 'medico', password: 'medico', email: 'medico@hospitalvillarrica.cl', role: 'medico_general', roleName: 'Médico', status: 'active' },
  { id: 4, name: 'Gestor de Camas', username: 'gestor', password: 'gestor', email: 'gestor@hospitalvillarrica.cl', role: 'gestor_camas', roleName: 'Gestor de Camas', status: 'active' },
  { id: 5, name: 'Médico HODOM', username: 'hodom', password: 'hodom', email: 'hodom@hospitalvillarrica.cl', role: 'medico_hodom', roleName: 'Médico HODOM', status: 'active' },
  { id: 6, name: 'Personal de Aseo', username: 'aseo', password: 'aseo', email: 'aseo@hospitalvillarrica.cl', role: 'personal_aseo', roleName: 'Personal de Aseo', status: 'active' }
];

/**
 * Asegura que la contraseña tenga mínimo 6 caracteres para cumplir con la política estricta de Firebase Auth
 */
export function formatAuthPassword(password) {
  if (!password) return '123456';
  if (password.length < 6) {
    return password.padEnd(6, '0');
  }
  return password;
}

/**
 * Normaliza cualquier identificador (username) al identificador canónico único de Firebase Auth
 */
export function formatAuthEmail(input) {
  if (!input) return '';
  const trimmed = input.trim().toLowerCase();
  const username = trimmed.split('@')[0];
  return `${username}@hospitalvillarrica.cl`;
}


/**
 * Inicia sesión en Firebase Auth y obtiene el perfil del usuario desde Firestore
 */
export async function authenticateUser(loginInput, rawPassword) {
  const email = formatAuthEmail(loginInput);
  const authPassword = formatAuthPassword(rawPassword);

  let firebaseUser = null;

  // 1. Intentar iniciar sesión en Firebase Auth
  try {
    const credential = await signInWithEmailAndPassword(auth, email, authPassword);
    firebaseUser = credential.user;
  } catch (authError) {
    // Si el usuario no existe en Firebase Auth aún (migración en primer ingreso), intentamos auto-registrarlo
    if (
      authError.code === 'auth/user-not-found' || 
      authError.code === 'auth/invalid-credential' || 
      authError.code === 'auth/invalid-email'
    ) {
      // Verificamos si coincide con los usuarios por defecto o lista conocida
      const fallbackUser = DEFAULT_USERS.find(
        u => (u.username.toLowerCase() === loginInput.toLowerCase() || u.email.toLowerCase() === email) && 
             u.password === rawPassword
      );

      if (fallbackUser) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email, authPassword);
          firebaseUser = newCred.user;
        } catch (createErr) {
          if (createErr.code === 'auth/email-already-in-use') {
            throw new Error('Contraseña incorrecta');
          }
          throw createErr;
        }
      } else {
        throw new Error('Usuario o contraseña incorrectos');
      }
    } else {
      throw authError;
    }
  }

  // 2. Con Firebase Auth activo (request.auth != null), leer el perfil completo desde Firestore
  let userProfile = null;
  try {
    const docRef = doc(db, 'appState', 'users');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const usersList = docSnap.data().data || [];
      userProfile = usersList.find(
        u => (u.email && u.email.toLowerCase() === email) || 
             (u.username && u.username.toLowerCase() === loginInput.toLowerCase()) ||
             (u.username && `${u.username.toLowerCase()}@hospitalvillarrica.cl` === email) ||
             (u.email && formatAuthEmail(u.email) === email)
      );
    }
  } catch (firestoreErr) {
    console.warn('[authService] Error al consultar perfil en Firestore:', firestoreErr);
  }

  // Fallback si es un usuario por defecto
  if (!userProfile) {
    userProfile = DEFAULT_USERS.find(
      u => (u.email && u.email.toLowerCase() === email) || 
           (u.username && u.username.toLowerCase() === loginInput.toLowerCase()) ||
           (u.username && `${u.username.toLowerCase()}@hospitalvillarrica.cl` === email)
    );
  }


  if (!userProfile) {
    userProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || loginInput,
      username: loginInput.split('@')[0],
      email: email,
      role: 'visor',
      roleName: 'Visor Institucional'
    };
  }

  return {
    ...userProfile,
    firebaseUid: firebaseUser.uid
  };
}

/**
 * Cierra la sesión en Firebase Auth
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[authService] Error al cerrar sesión:', err);
  }
}

/**
 * Crea un usuario en Firebase Auth sin desloguear al administrador actual
 */
export async function createAuthUserBackground(email, rawPassword) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  const formattedEmail = formatAuthEmail(email);
  const formattedPassword = formatAuthPassword(rawPassword);

  // Instancia secundaria para no afectar la sesión del admin
  const secondaryAppName = `SecondaryAuth-${Date.now()}`;
  let secondaryApp;
  try {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formattedEmail, formattedPassword);
    await signOut(secondaryAuth);
    return userCredential.user;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.info(`[authService] Usuario ${formattedEmail} ya existe en Firebase Auth.`);
      return null;
    }
    throw err;
  }
}

/**
 * Actualiza la contraseña en Firebase Auth para el usuario conectado
 */
export async function updateAuthPassword(newPassword) {
  if (!auth.currentUser) {
    throw new Error('No hay usuario autenticado en Firebase');
  }
  const formattedPassword = formatAuthPassword(newPassword);
  await updatePassword(auth.currentUser, formattedPassword);
}
