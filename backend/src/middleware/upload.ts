import multer from "multer";

// In-memory storage: we only ever need the raw text to parse, never persist the file.
const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      cb(new Error("Only .csv files are accepted"));
      return;
    }
    cb(null, true);
  },
});
