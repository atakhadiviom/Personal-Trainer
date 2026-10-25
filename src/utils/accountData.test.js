import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = [];
vi.mock('../firebase', () => ({ db: { name: 'db' }, storage: { name: 'storage' } }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...path) => ({ path })),
  doc: vi.fn((_db, ...path) => ({ path, ref: { path } })),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  getDocs: vi.fn(async () => ({ docs: [{ id: '2026-10-01', ref: { id: 'log1' }, data: () => ({ entries: [] }) }] })),
  deleteDoc: vi.fn(async (ref) => calls.push(['deleteDoc', ref.path ?? ref.id])),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn((_s, path) => ({ fullPath: path })),
  listAll: vi.fn(async () => ({ items: [{ fullPath: 'users/u1/photos/a.jpg' }], prefixes: [] })),
  deleteObject: vi.fn(async (item) => calls.push(['deleteObject', item.fullPath])),
}));
vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(async () => calls.push(['deleteUser'])),
  GoogleAuthProvider: vi.fn(),
  reauthenticateWithPopup: vi.fn(async () => calls.push(['reauth'])),
}));

const { deleteAccount } = await import('./accountData');
const { deleteUser } = await import('firebase/auth');

describe('deleteAccount', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.mocked(deleteUser).mockClear();
  });

  it('removes calorie logs, profile, storage files, then the auth user', async () => {
    await deleteAccount({ uid: 'u1', providerData: [{ providerId: 'password' }] });
    expect(calls).toEqual([
      ['deleteDoc', 'log1'],
      ['deleteDoc', ['users', 'u1']],
      ['deleteObject', 'users/u1/photos/a.jpg'],
      ['deleteUser'],
    ]);
  });

  it('re-authenticates with Google when deletion needs a recent sign-in', async () => {
    vi.mocked(deleteUser)
      .mockRejectedValueOnce(Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' }))
      .mockImplementationOnce(async () => calls.push(['deleteUser']));
    await deleteAccount({ uid: 'u1', providerData: [{ providerId: 'google.com' }] });
    expect(calls.map((c) => c[0])).toContain('reauth');
    expect(calls.at(-1)).toEqual(['deleteUser']);
  });

  it('asks non-Google users to sign in again when recent sign-in is required', async () => {
    vi.mocked(deleteUser).mockRejectedValueOnce(Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' }));
    await expect(deleteAccount({ uid: 'u1', providerData: [{ providerId: 'password' }] })).rejects.toThrow('Sign in again');
  });
});
