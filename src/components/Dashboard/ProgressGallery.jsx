import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProgressGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const fetchPhotos = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().photos) {
        setPhotos(snap.data().photos.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt)));
      }
    };
    fetchPhotos();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const user = auth.currentUser;
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${user.uid}/photos/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      const weekNum = photos.length; // Simple week counter

      const newPhoto = {
        url: downloadUrl,
        uploadedAt: new Date().toISOString(),
        week: weekNum,
        label: weekNum === 0 ? 'Day 1 — Baseline' : `Week ${weekNum}`
      };

      await updateDoc(doc(db, 'users', user.uid), { photos: arrayUnion(newPhoto) });
      setPhotos(prev => [...prev, newPhoto]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const firstPhoto = photos[0];
  const lastPhoto = photos[photos.length - 1];

  return (
    <div className="animate-fade-in">
      <div className="section-card" style={{ borderTop: '4px solid var(--accent-green)' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'var(--accent-green)' }}>📸 Progress Gallery</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {photos.length >= 2 && (
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => setCompareMode(!compareMode)}>
                {compareMode ? 'Timeline View' : 'Before / After'}
              </button>
            )}
            <label className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer' }} htmlFor="gallery-upload">
              {uploading ? 'Uploading...' : '+ Upload This Week'}
            </label>
            <input id="gallery-upload" type="file" accept="image/*" capture="environment" onChange={handleUpload} style={{ display: 'none' }} />
          </div>
        </div>

        {photos.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷</div>
            <p>No photos uploaded yet. Upload your first progress photo to get started!</p>
          </div>
        ) : compareMode && photos.length >= 2 ? (
          /* Before / After View */
          <div className="compare-grid">
            <div className="compare-card">
              <span className="compare-label">BEFORE</span>
              <img src={firstPhoto.url} alt="Before" />
              <p>{firstPhoto.label}</p>
            </div>
            <div className="compare-card">
              <span className="compare-label latest">LATEST</span>
              <img src={lastPhoto.url} alt="Latest" />
              <p>{lastPhoto.label}</p>
            </div>
          </div>
        ) : (
          /* Timeline View */
          <div className="photo-timeline">
            {photos.map((photo, idx) => (
              <div key={idx} className="photo-timeline-item">
                <img src={photo.url} alt={photo.label} />
                <div className="photo-timeline-meta">
                  <strong>{photo.label}</strong>
                  <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressGallery;
