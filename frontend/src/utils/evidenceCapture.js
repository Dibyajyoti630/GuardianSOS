const compressImage = (blob, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (compressedBlob) => {
          URL.revokeObjectURL(img.src);
          resolve(compressedBlob);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
  });
};

const captureFrameFromStream = (stream) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', ''); // required for iOS
    video.autoplay = true;

    video.onloadedmetadata = async () => {
      try {
        await video.play();
        // Wait 500ms for camera to focus and adjust exposure
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 1.0); // original before compression
        }, 500);
      } catch (err) {
        reject(err);
      }
    };
    
    video.onerror = (err) => reject(err);
  });
};

const uploadEvidence = async (userId, blob, cameraType, eventType) => {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('cameraType', cameraType);
  formData.append('eventType', eventType || 'SOS_TRIGGER');
  formData.append('evidence', blob, `evidence_${Date.now()}.jpg`);
  formData.append('timestamp', new Date().toISOString());

  // Try to get location, but don't block
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
    });
    if (pos && pos.coords) {
      formData.append('location', JSON.stringify({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }));
    }
  } catch (err) {
    console.log('Location not available for evidence upload', err);
  }

  try {
    console.log('📤 Uploading evidence...', {
      userId,
      cameraType,
      blobSize: blob.size,
      blobType: blob.type
    });

    // Make sure we use the configured VITE API URL if available
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/evidence/upload`, {
      method: 'POST',
      body: formData
      // Do NOT set Content-Type header - browser sets it automatically for FormData
    });

    console.log('📡 Upload response status:', response.status);
    console.log('📡 Upload response ok:', response.ok);

    const contentType = response.headers.get('content-type');
    console.log('📋 Response content-type:', contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed with status', response.status);
      console.error('❌ Error body:', errorText.substring(0, 500));
      throw new Error(`Upload failed: ${response.status}`);
    }

    // Check if response is JSON before parsing
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Evidence uploaded successfully:', data.evidenceId);
      return data;
    } else {
      const text = await response.text();
      console.error('❌ Expected JSON but got:', contentType);
      console.error('❌ Response body:', text.substring(0, 500));
      throw new Error('Server returned non-JSON response');
    }
    
  } catch (error) {
    console.error('❌ Evidence upload error:', error.message);
    console.error('❌ Full error:', error);
    // Don't throw - evidence upload failure shouldn't break SOS
    return { success: false, reason: error.message };
  }
};

let isCapturing = false;
let lastCaptureTime = 0;

export const captureEvidence = async (userId, eventType = 'SOS_TRIGGER', cameraType = 'environment') => {
  // Debounce: prevent captures within 2 seconds
  const now = Date.now();
  if (isCapturing || (now - lastCaptureTime < 2000)) {
    console.log('⚠️ Evidence capture debounced (too soon after last capture)');
    return { success: false, reason: 'debounced' };
  }

  isCapturing = true;
  lastCaptureTime = now;

  try {
    // 1. Check permission non-blocking
    if (!navigator.permissions || !navigator.mediaDevices) {
      return { success: false, reason: 'not_supported' };
    }
    
    const permission = await navigator.permissions.query({ name: 'camera' });
    if (permission.state === 'denied') {
      console.warn('⚠️ Camera permission not granted, skipping evidence');
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Request video stream
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: cameraType, // 'environment' (back) or 'user' (front)
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ]);

    // 3. Capture frame
    const blob = await captureFrameFromStream(stream);

    // 4. Stop all tracks immediately
    stream.getTracks().forEach(track => track.stop());

    // 5. Compress image
    const compressedBlob = await compressImage(blob, 0.7);

    // 6. Upload
    // Fire and forget upload
    uploadEvidence(userId, compressedBlob, cameraType, eventType)
      .then(res => console.log('Evidence uploaded', res))
      .catch(err => console.error('Background upload failed', err));

    return { 
      success: true, 
      originalSize: blob.size, 
      compressedSize: compressedBlob.size 
    };

  } catch (error) {
    console.error('Evidence capture failed:', error);
    return { success: false, reason: error.message };
  } finally {
    // Release lock after 1 second (allows camera to fully close)
    setTimeout(() => {
      isCapturing = false;
    }, 1000);
  }
};
