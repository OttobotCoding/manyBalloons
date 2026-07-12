/**
 * client/src/pages/admin/UserManagement.tsx
 * Create, view, edit roles, reset passwords, and delete users.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getAdminUsers, createAdminUser, updateUserRole, updateUserStatus, updateUserEmail,
  resetUserPassword, deleteAdminUser, CreateUserInput,
} from '../../services/api';
import Spinner from '../../components/Spinner';
import styles  from './UserManagement.module.css';
import { User, UserRole, UserStatus } from '../../types';

function formatDate(d: string | null | undefined): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const EMPTY_CREATE_FORM: CreateUserInput = { username: '', password: '', role: 'user', displayName: '', email: '' };

export default function UserManagement() {
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [showCreate,   setShowCreate]   = useState(false);
  const [resetTarget,  setResetTarget]  = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [emailTarget,  setEmailTarget]  = useState<User | null>(null);
  const [newPass,      setNewPass]      = useState('');
  const [newEmail,     setNewEmail]     = useState('');
  const [createForm,   setCreateForm]   = useState<CreateUserInput>(EMPTY_CREATE_FORM);

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  getAdminUsers,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => { toast.success('User created'); setShowCreate(false); setCreateForm(EMPTY_CREATE_FORM); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: doRoleChange } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
    onSuccess: () => { toast.success('Role updated'); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: doStatusChange } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => updateUserStatus(id, status),
    onSuccess: (_res, { status }) => { toast.success(status === 'approved' ? 'User approved' : 'User rejected'); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: doResetPassword, isPending: isResetting } = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetUserPassword(id, { newPassword: password }),
    onSuccess: () => { toast.success('Password reset'); setResetTarget(null); setNewPass(''); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: doUpdateEmail, isPending: isUpdatingEmail } = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => updateUserEmail(id, email),
    onSuccess: () => { toast.success('Email updated'); setEmailTarget(null); setNewEmail(''); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => { toast.success('User deleted'); setDeleteTarget(null); invalidate(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const users = res?.data ?? [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>User Management</h1>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          + New User
        </button>
      </div>

      {isLoading && <Spinner />}

      {/* ── User table ── */}
      {!isLoading && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Display name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={u._id === me?._id ? styles.meRow : ''}>
                  <td>
                    <span className={styles.username}>{u.username}</span>
                    {u._id === me?._id && <span className={styles.youBadge}>you</span>}
                  </td>
                  <td>{u.displayName || <span className={styles.empty}>—</span>}</td>
                  <td>{u.email || <span className={styles.empty}>—</span>}</td>
                  <td>
                    <select
                      className={styles.roleSelect}
                      value={u.role}
                      disabled={u._id === me?._id}
                      onChange={(e) => doRoleChange({ id: u._id, role: e.target.value as UserRole })}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[u.status]}`}>{u.status}</span>
                  </td>
                  <td className={styles.meta}>{formatDate(u.lastLogin)}</td>
                  <td className={styles.meta}>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      {u.status === 'pending' && (
                        <>
                          <button
                            className={styles.actionBtn}
                            onClick={() => doStatusChange({ id: u._id, status: 'approved' })}
                          >
                            Approve
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => doStatusChange({ id: u._id, status: 'rejected' })}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {u.status === 'rejected' && (
                        <button
                          className={styles.actionBtn}
                          onClick={() => doStatusChange({ id: u._id, status: 'approved' })}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        className={styles.actionBtn}
                        onClick={() => { setEmailTarget(u); setNewEmail(u.email || ''); }}
                      >
                        Edit email
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => { setResetTarget(u); setNewPass(''); }}
                      >
                        Reset password
                      </button>
                      {u._id !== me?._id && (
                        <button
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => setDeleteTarget(u)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create user modal ── */}
      {showCreate && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Create New User</h2>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>Username *</label>
                <input
                  type="text" value={createForm.username} placeholder="lowercase, letters/numbers/_"
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Display name</label>
                <input
                  type="text" value={createForm.displayName} placeholder="Optional"
                  onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input
                  type="email" value={createForm.email} placeholder="Optional — needed to receive notifications"
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Password * (min 8 chars)</label>
                <input
                  type="password" value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Role</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                disabled={isCreating}
                onClick={() => doCreate(createForm)}
              >
                {isCreating ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset password modal ── */}
      {resetTarget && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Reset password for <em>{resetTarget.username}</em></h2>
            <div className={styles.field}>
              <label>New password (min 8 chars)</label>
              <input
                type="password" value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setResetTarget(null)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                disabled={isResetting || newPass.length < 8}
                onClick={() => doResetPassword({ id: resetTarget._id, password: newPass })}
              >
                {isResetting ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit email modal ── */}
      {emailTarget && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Edit email for <em>{emailTarget.username}</em></h2>
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email" value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                Used for approval/rejection notices, and admin signup alerts if this user is an admin.
                Leave blank to remove.
              </span>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEmailTarget(null)}>Cancel</button>
              <button
                className={styles.confirmBtn}
                disabled={isUpdatingEmail}
                onClick={() => doUpdateEmail({ id: emailTarget._id, email: newEmail })}
              >
                {isUpdatingEmail ? 'Saving…' : 'Save email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete user modal ── */}
      {deleteTarget && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Delete <em>{deleteTarget.username}</em>?</h2>
            <p>This cannot be undone. Their friends will remain in the database.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className={`${styles.confirmBtn} ${styles.danger}`}
                disabled={isDeleting}
                onClick={() => doDelete(deleteTarget._id)}
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
