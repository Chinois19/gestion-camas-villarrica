import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updatePassword
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const ROLE_LABELS = {
  superadmin: 'Super Administrador',
  administrador: 'Administrador',
  visor: 'Visor (Solo Lectura)',
  gestor_camas: 'Gestor de Camas',
  medico_general: 'Médico',
  personal_aseo: 'Personal de Aseo',
  medico_hodom: 'Médico HODOM',
  gestora_servicio: 'Gestora de Servicio Clínico'
};

export function getRoleLabel(role, existingRoleName) {
  const normalizedRole = (role || '').toLowerCase().trim();
  if (normalizedRole === 'superadmin') return 'Super Administrador';
  if (normalizedRole === 'administrador' || normalizedRole === 'admin') return 'Administrador';
  if (normalizedRole === 'gestor_camas') return 'Gestor de Camas';
  if (normalizedRole === 'medico_general') return 'Médico';
  if (normalizedRole === 'personal_aseo') return 'Personal de Aseo';
  if (normalizedRole === 'visor') return 'Visor';
  if (normalizedRole === 'medico_hodom') return 'Médico HODOM';
  if (normalizedRole === 'gestora_servicio') return 'Gestora de Servicio Clínico';
  if (existingRoleName === 'Médico General') return 'Médico';
  return existingRoleName || role || 'Visor';
}

export const DEFAULT_USERS = [
  { id: 1, name: 'Super Administrador', username: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'superadmin', roleName: 'Super Administrador', status: 'active' },
  { id: 2, name: 'Visor Institucional', username: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'visor', roleName: 'Visor Institucional', status: 'active' },
  { id: 3, name: 'Médico General', username: 'medico', email: 'medico@hospitalvillarrica.cl', role: 'medico_general', roleName: 'Médico', status: 'active' },
  { id: 4, name: 'Gestor de Camas', username: 'gestor', email: 'gestor@hospitalvillarrica.cl', role: 'gestor_camas', roleName: 'Gestor de Camas', status: 'active' },
  { id: 5, name: 'Médico HODOM', username: 'hodom', email: 'hodom@hospitalvillarrica.cl', role: 'medico_hodom', roleName: 'Médico HODOM', status: 'active' },
  { id: 6, name: 'Personal de Aseo', username: 'aseo', email: 'aseo@hospitalvillarrica.cl', role: 'personal_aseo', roleName: 'Personal de Aseo', status: 'active' }
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
  const trimmed = String(input).trim().toLowerCase().replace(/\s+/g, '');
  const username = trimmed.split('@')[0];
  return `${username}@hospitalvillarrica.cl`;
}

/**
 * Busca el perfil del usuario en la lista de usuarios priorizando coincidencia exacta
 * de username (del registro más reciente al más antiguo) antes de buscar por correo.
 */
export function findUserProfileInList(usersList, loginInput, canonicalEmail) {
  if (!Array.isArray(usersList) || usersList.length === 0) return null;
  const cleanLogin = String(loginInput || '').trim().toLowerCase();
  const cleanUsername = cleanLogin.split('@')[0];
  const email = canonicalEmail || formatAuthEmail(loginInput);
  const reversed = [...usersList].reverse();

  // 1. Prioridad máxima: Coincidencia exacta por username (evita colisiones por prefijo de correo)
  const byUsername = reversed.find(u => {
    if (!u || !u.username) return false;
    const uName = String(u.username).trim().toLowerCase();
    return uName === cleanLogin || uName === cleanUsername || formatAuthEmail(uName) === email;
  });
  if (byUsername) return byUsername;

  // 2. Segunda prioridad: Coincidencia exacta de correo electrónico completo
  const byExactEmail = reversed.find(u => {
    if (!u || !u.email) return false;
    const uEmail = String(u.email).trim().toLowerCase();
    return uEmail === cleanLogin || uEmail === email;
  });
  if (byExactEmail) return byExactEmail;

  // 3. Fallback: Prefijo de correo
  return reversed.find(u => u && u.email && formatAuthEmail(u.email) === email) || null;
}

/**
 * Inicia sesión en Firebase Auth y obtiene el perfil del usuario desde Firestore
 */
export async function authenticateUser(loginInput, rawPassword) {
  const email = formatAuthEmail(loginInput);
  const authPassword = formatAuthPassword(rawPassword);

  let firebaseUser;

  // 1. Intentar iniciar sesión en Firebase Auth
  try {
    const credential = await signInWithEmailAndPassword(auth, email, authPassword);
    firebaseUser = credential.user;
  } catch (authError) {
    // Si el usuario copió y pegó la contraseña con espacios al inicio o final, reintentar con trim()
    const trimmedRaw = typeof rawPassword === 'string' ? rawPassword.trim() : rawPassword;
    if (trimmedRaw && trimmedRaw !== rawPassword) {
      try {
        const retryCred = await signInWithEmailAndPassword(auth, email, formatAuthPassword(trimmedRaw));
        firebaseUser = retryCred.user;
      } catch {
        // Continuar al manejo de error estándar
      }
    }

    if (!firebaseUser) {
      if (
        authError.code === 'auth/user-not-found' || 
        authError.code === 'auth/wrong-password' ||
        authError.code === 'auth/invalid-credential' || 
        authError.code === 'auth/invalid-email'
      ) {
        throw new Error('Usuario o contraseña incorrectos', { cause: authError });
      }
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
      userProfile = findUserProfileInList(usersList, loginInput, email);
    }
  } catch (firestoreErr) {
    console.warn('[authService] Error al consultar perfil en Firestore:', firestoreErr);
  }

  // Fallback si es un usuario por defecto
  if (!userProfile) {
    userProfile = findUserProfileInList(DEFAULT_USERS, loginInput, email);
  }

  if (!userProfile) {
    userProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || loginInput,
      username: String(loginInput).trim().split('@')[0],
      email: email,
      role: 'visor',
      roleName: 'Visor Institucional'
    };
  }

  // Sanitizar: nunca retornar la propiedad password al estado ni a la vista
  const cleanProfile = { ...userProfile };
  delete cleanProfile.password;
  if (cleanProfile.username) {
    cleanProfile.username = String(cleanProfile.username).trim();
  }
  cleanProfile.roleName = getRoleLabel(cleanProfile.role, cleanProfile.roleName);

  return {
    ...cleanProfile,
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
 * Obtiene posibles contraseñas previas desde appState/users y appState/users_lastBackup
 * para poder autenticar en instancia secundaria y actualizar la contraseña cuando un usuario
 * previamente existente en Firebase Auth es recreado o restablecido por el Administrador.
 */
async function getCandidatePasswordsForUser(usernameKey) {
  const candidates = new Set();
  const normalizedKey = String(usernameKey || '').trim().toLowerCase();

  try {
    const [usersSnap, backupSnap] = await Promise.all([
      getDoc(doc(db, 'appState', 'users')).catch(() => null),
      getDoc(doc(db, 'appState', 'users_lastBackup')).catch(() => null)
    ]);

    for (const snap of [backupSnap, usersSnap]) {
      if (snap && snap.exists()) {
        const list = snap.data()?.data || [];
        for (const u of [...list].reverse()) {
          const uName = String(u?.username || '').trim().toLowerCase();
          if ((uName === normalizedKey || formatAuthEmail(uName) === `${normalizedKey}@hospitalvillarrica.cl`) && u?.password) {
            candidates.add(String(u.password));
            candidates.add(String(u.password).trim());
          }
        }
      }
    }
  } catch {
    // Ignorar errores de lectura de candidatos
  }

  candidates.add('admin123');
  candidates.add('123456');
  if (normalizedKey) {
    candidates.add(normalizedKey);
  }

  return Array.from(candidates).filter(Boolean);
}

/**
 * Guarda/actualiza la credencial de respaldo en appState/users_lastBackup para permitir
 * futuras actualizaciones o restablecimientos de contraseña por parte del Administrador.
 */
export async function saveUserBackupCredential(username, rawPassword, userMeta = {}) {
  if (!username || !rawPassword) return;
  const normalizedUsername = String(username).trim();
  const normalizedKey = normalizedUsername.toLowerCase();

  try {
    const backupRef = doc(db, 'appState', 'users_lastBackup');
    const snap = await getDoc(backupRef);
    const currentData = snap.exists() ? (snap.data() || {}) : {};
    const list = Array.isArray(currentData.data) ? [...currentData.data] : [];

    const existingIdx = list.findIndex(
      u => String(u?.username || '').trim().toLowerCase() === normalizedKey
    );

    if (existingIdx !== -1) {
      list[existingIdx] = {
        ...list[existingIdx],
        ...userMeta,
        username: normalizedUsername,
        password: rawPassword
      };
    } else {
      list.push({
        id: userMeta.id || Date.now(),
        name: userMeta.name || normalizedUsername,
        username: normalizedUsername,
        email: userMeta.email || `${normalizedKey}@hospitalvillarrica.cl`,
        role: userMeta.role || 'visor',
        status: 'active',
        password: rawPassword
      });
    }

    await setDoc(backupRef, {
      ...currentData,
      data: list,
      backedUpAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[authService] Aviso al actualizar respaldo de credencial:', err);
  }
}

/**
 * Crea o actualiza un usuario en Firebase Auth sin desloguear al administrador actual
 */
export async function createAuthUserBackground(email, rawPassword, options = {}) {
  const { preserveExisting = false, userMeta = {} } = options;
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || auth.app?.options?.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || auth.app?.options?.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || auth.app?.options?.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || auth.app?.options?.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || auth.app?.options?.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || auth.app?.options?.appId
  };

  const formattedEmail = formatAuthEmail(email);
  const formattedPassword = formatAuthPassword(rawPassword);
  const usernameKey = formattedEmail.split('@')[0];

  // Guardar respaldo de credencial primero para no perder la clave provisoria ante errores de red o límite de tasa
  await saveUserBackupCredential(usernameKey, rawPassword, userMeta);

  // Instancia secundaria para no afectar la sesión del admin
  const secondaryAppName = `SecondaryAuth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let secondaryApp;
  try {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formattedEmail, formattedPassword);
      await signOut(secondaryAuth);
      return userCredential.user;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        if (preserveExisting) {
          console.info(`[authService] Usuario ${formattedEmail} ya existe en Firebase Auth.`);
          return null;
        }
        // Intentar iniciar sesión con contraseñas previas conocidas para actualizar a la nueva contraseña generada
        const candidates = await getCandidatePasswordsForUser(usernameKey);
        for (const oldPwd of candidates) {
          try {
            const cred = await signInWithEmailAndPassword(secondaryAuth, formattedEmail, formatAuthPassword(oldPwd));
            await updatePassword(cred.user, formattedPassword);
            await signOut(secondaryAuth);
            await saveUserBackupCredential(usernameKey, rawPassword, userMeta);
            console.info(`[authService] Contraseña en Firebase Auth actualizada para ${formattedEmail}.`);
            return cred.user;
          } catch {
            // Intentar siguiente contraseña candidata
          }
        }
        console.info(`[authService] Usuario ${formattedEmail} ya existe en Firebase Auth.`);
        return null;
      }
      throw err;
    }
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignorar errores al limpiar instancia secundaria
      }
    }
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
