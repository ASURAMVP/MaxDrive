# MEGA MAX Backend

## Startup
- Copy `.env.example` to `.env`
- `npm install`
- `npm run dev` (nodemon) or `npm start`

## Endpoints
- POST `/api/upload-url` { filename, contentType, size, userId } -> returns S3 presigned url+fields + uploadId
- POST `/api/confirm-upload` { uploadId, size } -> updates metadata
- GET `/api/files` -> list files metadata
- DELETE `/api/files/:id` -> delete metadata entry

Note: In production, implement authentication, strong validation, virus scanning, and actually delete S3 objects on file deletion.
