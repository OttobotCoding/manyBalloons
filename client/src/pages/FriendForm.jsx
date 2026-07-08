/**
 * client/src/pages/FriendForm.jsx
 * Handles both "Add Friend" (no :id in route) and "Edit Friend" (/friends/:id/edit).
 * Uses a multipart/form-data POST/PUT for photo uploads.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getFriendById, createFriend, updateFriend } from '../services/api';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import styles from './FriendForm.module.css';

const RELATIONSHIPS = ['friend', 'family', 'colleague', 'acquaintance', 'other'];

const EMPTY_FORM = {
  name: '',
  birthday: '',
  phone: '',
  email: '',
  address: '',
  relationship: 'friend',
  notes: '',
};

// Client-side validation — mirrors server validation
function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Name is required';
  if (!form.birthday) {
    errs.birthday = 'Birthday is required';
  } else if (new Date(form.birthday) > new Date()) {
    errs.birthday = 'Birthday cannot be in the future';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = 'Enter a valid email address';
  }
  if (form.phone && form.phone.length > 20) {
    errs.phone = 'Phone cannot exceed 20 characters';
  }
  return errs;
}

export default function FriendForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileRef = useRef(null);

  // ── Load existing data when editing ────────────────────────────────────────
  const { data: existingRes, isLoading: loadingFriend } = useQuery({
    queryKey: ['friend', id],
    queryFn: () => getFriendById(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingRes?.data) {
      const f = existingRes.data;
      setForm({
        name:         f.name || '',
        birthday:     f.birthday ? new Date(f.birthday).toISOString().split('T')[0] : '',
        phone:        f.phone || '',
        email:        f.email || '',
        address:      f.address || '',
        relationship: f.relationship || 'friend',
        notes:        f.notes || '',
      });
      if (f.photo) setPhotoPreview(f.photo);
    }
  }, [existingRes]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const onSuccess = (res) => {
    toast.success(isEdit ? 'Friend updated!' : 'Friend added!');
    qc.invalidateQueries({ queryKey: ['friends'] });
    qc.invalidateQueries({ queryKey: ['upcoming'] });
    if (isEdit) qc.invalidateQueries({ queryKey: ['friend', id] });
    navigate(`/friends/${res.data._id}`);
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: (payload) => (isEdit ? updateFriend(id, payload) : createFriend(payload)),
    onSuccess,
    onError: (err) => toast.error(err.message),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Photo must be under 4 MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields');
      return;
    }

    // Build FormData so we can attach the photo file
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photoFile) fd.append('photo', photoFile);

    save(fd);
  };

  if (isEdit && loadingFriend) return <Spinner />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEdit ? 'Edit Friend' : 'Add New Friend'}</h1>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* ── Photo upload ── */}
        <div className={styles.photoSection}>
          <Avatar name={form.name || '?'} photo={photoPreview} size={80} />
          <div>
            <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
            {photoPreview && (
              <button
                type="button"
                className={styles.removePhotoBtn}
                onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <p className={styles.hint}>JPEG, PNG, WebP or GIF · max 4 MB</p>
          </div>
        </div>

        {/* ── Two-column grid for fields ── */}
        <div className={styles.grid}>

          {/* Name */}
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="name">Full name *</label>
            <input
              id="name" name="name" type="text"
              value={form.name} onChange={handleChange}
              placeholder="e.g. Jane Smith"
              className={errors.name ? styles.inputError : ''}
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          {/* Birthday */}
          <div className={styles.field}>
            <label htmlFor="birthday">Birthday *</label>
            <input
              id="birthday" name="birthday" type="date"
              value={form.birthday} onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className={errors.birthday ? styles.inputError : ''}
            />
            {errors.birthday && <span className={styles.error}>{errors.birthday}</span>}
          </div>

          {/* Relationship */}
          <div className={styles.field}>
            <label htmlFor="relationship">Relationship</label>
            <select id="relationship" name="relationship" value={form.relationship} onChange={handleChange}>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className={styles.field}>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone" name="phone" type="tel"
              value={form.phone} onChange={handleChange}
              placeholder="+1 555 000 0000"
              className={errors.phone ? styles.inputError : ''}
            />
            {errors.phone && <span className={styles.error}>{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              value={form.email} onChange={handleChange}
              placeholder="jane@example.com"
              className={errors.email ? styles.inputError : ''}
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          {/* Address */}
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="address">Address</label>
            <input
              id="address" name="address" type="text"
              value={form.address} onChange={handleChange}
              placeholder="123 Main St, City, Country"
            />
          </div>

          {/* Notes */}
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes" name="notes" rows={4}
              value={form.notes} onChange={handleChange}
              placeholder="Favourite gifts, dietary restrictions, how you met…"
            />
            <span className={styles.charCount}>{form.notes.length} / 2000</span>
          </div>
        </div>

        {/* ── Submit / Cancel ── */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add friend'}
          </button>
        </div>
      </form>
    </div>
  );
}