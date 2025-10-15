import React from 'react';
import { requestUploadUrl, confirmUpload, listFiles, deleteFile } from './api';

function humanSize(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  let x = bytes;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(2)} ${units[i]}`;
}

export default function App() {
  const [files, setFiles] = React.useState([]);
  const [q, setQ] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

  React.useEffect(() => {
    reloadFiles();
  }, []);

  async function reloadFiles() {
    try {
      const data = await listFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFiles(ev) {
    const list = Array.from(ev.target.files);
    if (list.length === 0) return;
    setUploading(true);
    for (const f of list) {
      try {
        // 1) ask backend for presigned fields
        const { uploadId, url, fields, key } = await requestUploadUrl({
          filename: f.name,
          contentType: f.type,
          size: f.size,
          userId: 'demo-user'
        });

        // 2) POST multipart/form-data to S3 (use form with returned fields)
        const fd = new FormData();
        Object.entries(fields || {}).forEach(([k, v]) => fd.append(k, v));
        fd.append('file', f);

        const res = await fetch(url, { method: 'POST', body: fd });
        if (!res.ok) {
          console.error('Upload failed', res.statusText);
          continue;
        }

        // 3) Confirm upload to backend so metadata size is updated
        await confirmUpload({ uploadId, size: f.size });
      } catch (err) {
        console.error('upload file error', err);
      }
    }
    setUploading(false);
    await reloadFiles();
  }

  async function handleDelete(id) {
    await deleteFile(id);
    reloadFiles();
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));

  // storage used quick calc
  const totalBytes = files.reduce((a, b) => a + (b.size || 0), 0);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto bg-white shadow rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">MM</div>
            <div>
              <h1 className="text-xl font-semibold">MEGA MAX</h1>
              <div className="text-sm text-gray-500">Prototype — demo only</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Free plan • 5,000 TB advertised*</div>
            <div className="text-xs text-gray-400">Used: {humanSize(totalBytes)} / 5,000 TB</div>
          </div>
        </header>

        <main className="p-6 grid grid-cols-3 gap-6">
          <aside className="col-span-1 border rounded-lg p-4">
            <label className="block text-xs font-medium text-gray-600">Upload files</label>
            <input type="file" multiple onChange={handleFiles} className="mt-2 block w-full" />
            <button disabled={uploading} onClick={reloadFiles} className="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white">
              {uploading ? 'Uploading...' : 'Refresh list'}
            </button>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600">Search files</label>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="mt-2 block w-full border rounded px-3 py-2" />
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>Note: This demo uses presigned POST to upload files to S3. Make sure your S3 bucket policy allows uploads and CORS.</p>
            </div>
          </aside>

          <section className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Files</h2>
              <div className="text-sm text-gray-600">{filtered.length} files</div>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[520px]">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-xs text-gray-500">Name</th>
                    <th className="p-3 text-xs text-gray-500">Size</th>
                    <th className="p-3 text-xs text-gray-500">Date</th>
                    <th className="p-3 text-xs text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className="border-t">
                      <td className="p-3">{f.name}</td>
                      <td className="p-3">{humanSize(f.size)}</td>
                      <td className="p-3">{new Date(f.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        <button onClick={() => handleDelete(f.id)} className="text-sm text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-400">No files found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </section>
        </main>

        <footer className="p-6 border-t text-sm text-gray-500">
          *This prototype shows an advertised free limit of 5,000 TB for demonstration. See docs for costs & feasibility.
        </footer>
      </div>
    </div>
  );
}
