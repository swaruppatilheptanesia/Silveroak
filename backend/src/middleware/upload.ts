import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { env } from '../config/env';
import { ValidationError } from '../shared/errors';

const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const PROFILE_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const SUPPORTING_DOCUMENT_MIME_TYPES = [
  ...RESUME_MIME_TYPES,
  ...PROFILE_PHOTO_MIME_TYPES,
];

const SPREADSHEET_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const PDF_MIME_TYPES = ['application/pdf'];

function ensureUploadDir(directory: string) {
  const uploadsDir = path.resolve(env.uploadDir, directory);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function createDiskUpload(options: {
  directory: string;
  allowedMimeTypes: string[];
  invalidTypeMessage: string;
}) {
  const uploadsDir = ensureUploadDir(options.directory);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: env.maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (options.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
      }

      cb(new ValidationError(options.invalidTypeMessage));
    },
  });
}

export const resumeUpload = createDiskUpload({
  directory: 'resumes',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const policyDocumentUpload = createDiskUpload({
  directory: 'policy-documents',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const internshipDocumentUpload = createDiskUpload({
  directory: 'internship-documents',
  allowedMimeTypes: SUPPORTING_DOCUMENT_MIME_TYPES,
  invalidTypeMessage: 'Only PDF, DOC, DOCX, JPG, PNG, and WEBP files are allowed',
});

export const certificationDocumentUpload = createDiskUpload({
  directory: 'certification-documents',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const employmentDocumentUpload = createDiskUpload({
  directory: 'employment-documents',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const noDuesProofUpload = createDiskUpload({
  directory: 'no-dues-documents',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const nocOfferLetterUpload = createDiskUpload({
  directory: 'noc-offer-letters',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const nocSupportingDocumentUpload = createDiskUpload({
  directory: 'noc-supporting-documents',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const nocCompletionCertificateUpload = createDiskUpload({
  directory: 'noc-completion-certificates',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const announcementAttachmentUpload = createDiskUpload({
  directory: 'announcement-attachments',
  allowedMimeTypes: [...PDF_MIME_TYPES, ...PROFILE_PHOTO_MIME_TYPES],
  invalidTypeMessage: 'Only PDF and image files (JPG, PNG, WEBP) are allowed',
});

export const postingJobDescriptionUpload = createDiskUpload({
  directory: 'posting-job-descriptions',
  allowedMimeTypes: PDF_MIME_TYPES,
  invalidTypeMessage: 'Only PDF files are allowed',
});

export const portfolioShowcaseProofUpload = createDiskUpload({
  directory: 'portfolio-showcase-proofs',
  allowedMimeTypes: SUPPORTING_DOCUMENT_MIME_TYPES,
  invalidTypeMessage: 'Only PDF, DOC, DOCX, JPG, PNG, and WEBP files are allowed',
});

export const spreadsheetUpload = createDiskUpload({
  directory: 'imports',
  allowedMimeTypes: SPREADSHEET_MIME_TYPES,
  invalidTypeMessage: 'Only CSV and XLSX files are allowed',
});

export const profilePhotoUpload = createDiskUpload({
  directory: 'profile-photos',
  allowedMimeTypes: PROFILE_PHOTO_MIME_TYPES,
  invalidTypeMessage: 'Only JPG, PNG, and WEBP images are allowed',
});
