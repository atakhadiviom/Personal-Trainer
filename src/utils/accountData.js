import { collection, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { db, storage } from '../firebase';

// Everything the app stores for a user: users/{uid} plus users/{uid}/calorieLog/*.
const readUserData = async (uid) => {
  const profileSnap = await getDoc(doc(db, 'users', uid));
  const logSnap = await getDocs(collection(db, 'users', uid, 'calorieLog'));
  return {
    profile: profileSnap.exists() ? profileSnap.data() : null,
    calorieLog: logSnap.docs.map((d) => ({ date: d.id, ...d.data() })),
  };
};

export const exportUserData = async (user) => {
  const data = await readUserData(user.uid);
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { uid: user.uid, email: user.email ?? null },
    ...data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `novafit-data-${user.uid}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Storage has no client-side "delete folder": list every object under users/{uid} and delete each.
const deleteStorageFolder = async (path) => {
  const folder = ref(storage, path);
  const { items, prefixes } = await listAll(folder);
  await Promise.all(items.map((item) => deleteObject(item)));
  await Promise.all(prefixes.map((prefix) => deleteStorageFolder(prefix.fullPath)));
};

const deleteFirestoreData = async (uid) => {
  const logSnap = await getDocs(collection(db, 'users', uid, 'calorieLog'));
  await Promise.all(logSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', uid));
};

// Deletes Firestore data, Storage files, then the Auth user. Auth deletion can require a
// recent sign-in; Google accounts re-auth via popup, other providers must sign in again.
export const deleteAccount = async (user) => {
  const uid = user.uid;
  await deleteFirestoreData(uid);
  if (storage) await deleteStorageFolder(`users/${uid}`);
  try {
    await deleteUser(user);
  } catch (err) {
    if (err?.code !== 'auth/requires-recent-login') throw err;
    const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
    if (!isGoogle) throw new Error('Sign in again, then delete your account.');
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    await deleteUser(user);
  }
};
