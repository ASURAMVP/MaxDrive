import axios from 'axios';

// Backend API base URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://megamax-backend.onrender.com/api',
});

// Request presigned upload URL
export async function requestUploadUrl({ filename, contentType, size, userId }) {
  const resp = await API.post('/upload-url', { filename, contentType, size, userId });
  return resp.data;
}

// Confirm upload completion
export async function confirmUpload({ uploadId, size }) {
  const resp = await API.post('/confirm-upload', { uploadId, size });
  return resp.data;
}

// Get list of uploaded files
export async function listFiles() {
  const resp = await API.get('/files');
  return resp.data;
}

// Delete a file record
export async function deleteFile(id) {
  const resp = await API.delete(`/files/${id}`);
  return resp.data;
}
