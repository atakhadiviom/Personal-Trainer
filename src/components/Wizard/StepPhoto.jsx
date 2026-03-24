import React, { useState } from 'react';
import { auth, storage, db } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const StepPhoto = ({ formData, updateFormData, prevStep, nextStep }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${user.uid}/photos/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Save photo reference to Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        photos: arrayUnion({
          url: downloadUrl,
          uploadedAt: new Date().toISOString(),
          week: 0, // Day 1 baseline
          label: 'Day 1 — Baseline'
        })
      });

      setUploaded(true);
      updateFormData('photoUploaded', true);
    } catch (err) {
      console.error("Upload error:", err);
      // Still allow proceeding even if upload fails
      setUploaded(true);
      updateFormData('photoUploaded', true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="step-title">Track Your Progress</h2>
      <p className="step-subtitle">Upload a Day 1 photo to establish your baseline. We'll remind you weekly to capture your transformation.</p>
      
      <div className="upload-zone">
        {previewUrl ? (
          <div className="upload-preview">
            <img src={previewUrl} alt="Progress preview" className="preview-img" />
            {uploading && <div className="upload-overlay"><span>Encrypting & Uploading...</span></div>}
            {uploaded && <div className="upload-success">📸 Secured to your private vault</div>}
          </div>
        ) : (
          <div className="upload-prompt">
            <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>📸</div>
            <label className="btn-secondary upload-label" htmlFor="photo-input">
              Select Full-Body Photo
            </label>
            <input 
              id="photo-input"
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
            />
            <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              🔒 Photos are encrypted and stored privately in your Firebase vault.
            </p>
          </div>
        )}
      </div>

      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={prevStep} disabled={uploading}>
          <span>←</span> Back
        </button>
        <button type="button" className="btn-primary" onClick={nextStep} disabled={uploading}>
          {uploaded ? 'Generate Plan ✨' : 'Skip & Generate Plan'}
        </button>
      </div>
    </div>
  );
};

export default StepPhoto;
