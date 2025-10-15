import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://megamax.onrender.com'
});

export async function requestUploadUrl({ filename, contentType, size, userId }) {
  const resp = await API.post('/upload-url', { filename, contentType, size, userId });
  return resp.data;
}

export async function confirmUpload({ uploadId, size }) {
  const resp = await API.post('/confirm-upload', { uploadId, size });
  return resp.data;
}

export async function listFiles() {
  const resp = await API.get('/files');
  return resp.data;
}

export async function deleteFile(id) {
  const resp = await API.delete(`/files/${id}`);
  return resp.data;
}
