import multer from "multer";

// PPT/PPTX only — the two mimetypes real browsers/OSes report for these
// extensions. Kept in memory (not disk) since the file is immediately
// streamed on to Google Drive, never written to this server's filesystem.
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

export const PPT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const pptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PPT_MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only .ppt or .pptx files are allowed"));
      return;
    }
    cb(null, true);
  },
});
