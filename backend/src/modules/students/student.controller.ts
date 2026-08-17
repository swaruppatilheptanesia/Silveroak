import { Request, Response, NextFunction } from 'express';
import * as studentService from './student.service';

// Profile
export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.getMyProfile(req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updatePersonal(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.updatePersonal(req.user!.id, req.validated!.body as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function uploadProfilePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Profile photo file is required' } });
      return;
    }

    const result = await studentService.uploadProfilePhoto(req.user!.id, {
      file_url: `/uploads/profile-photos/${req.file.filename}`,
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateAcademic(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.updateAcademic(req.user!.id, req.validated!.body as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.updateSkills(req.user!.id, req.validated!.body as any);
    res.json(result);
  } catch (err) { next(err); }
}

// Projects
export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await studentService.getProjects(req.user!.id);
    res.json({ projects });
  } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await studentService.createProject(req.user!.id, req.validated!.body as any);
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const project = await studentService.updateProject(req.user!.id, projectId!, req.validated!.body as any);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    await studentService.deleteProject(req.user!.id, projectId!);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
}

// Certifications
export async function getCertifications(req: Request, res: Response, next: NextFunction) {
  try {
    const certifications = await studentService.getCertifications(req.user!.id);
    res.json({ certifications });
  } catch (err) { next(err); }
}

export async function createCertification(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await studentService.createCertification(req.user!.id, req.validated!.body as any);
    res.status(201).json(cert);
  } catch (err) { next(err); }
}

export async function uploadCertificationDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Certification supporting document is required' } });
      return;
    }

    res.status(201).json({
      document_url: `/uploads/certification-documents/${req.file.filename}`,
      document_name: req.file.originalname,
      document_mime_type: req.file.mimetype,
      document_size: req.file.size,
    });
  } catch (err) { next(err); }
}

export async function deleteCertification(req: Request, res: Response, next: NextFunction) {
  try {
    const certId = Array.isArray(req.params.certId) ? req.params.certId[0] : req.params.certId;
    await studentService.deleteCertification(req.user!.id, certId!);
    res.json({ message: 'Certification deleted' });
  } catch (err) { next(err); }
}

// Employment (multiple entries)
export async function listEmployments(req: Request, res: Response, next: NextFunction) {
  try {
    const employments = await studentService.listEmployments(req.user!.id);
    res.json({ employments });
  } catch (err) { next(err); }
}

export async function createEmployment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'An offer letter document is required to add an employment' } });
      return;
    }
    const fileUrl = `/uploads/employment-documents/${req.file.filename}`;
    const employment = await studentService.createEmployment(req.user!.id, req.validated!.body as any, fileUrl);
    res.status(201).json(employment);
  } catch (err) { next(err); }
}

// Close an employment — the completion-proof document is mandatory.
export async function closeEmployment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'A completion proof document is required to close this employment' } });
      return;
    }
    const fileUrl = `/uploads/employment-documents/${req.file.filename}`;
    const employmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const employment = await studentService.closeEmployment(req.user!.id, employmentId, fileUrl, req.file.originalname);
    res.json(employment);
  } catch (err) { next(err); }
}

export async function deleteEmployment(req: Request, res: Response, next: NextFunction) {
  try {
    const employmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await studentService.deleteEmployment(req.user!.id, employmentId);
    res.json({ message: 'Employment deleted' });
  } catch (err) { next(err); }
}

// Resumes
export async function getResumes(req: Request, res: Response, next: NextFunction) {
  try {
    const resumes = await studentService.getResumes(req.user!.id);
    res.json({ resumes });
  } catch (err) { next(err); }
}

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Resume file is required' } });
      return;
    }

    const name = (req.body?.name as string) || req.file.originalname;
    const resume = await studentService.createResume(req.user!.id, {
      name,
      file_url: `/uploads/resumes/${req.file.filename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
    });
    res.status(201).json(resume);
  } catch (err) { next(err); }
}

export async function setDefaultResume(req: Request, res: Response, next: NextFunction) {
  try {
    const resumeId = Array.isArray(req.params.resumeId) ? req.params.resumeId[0] : req.params.resumeId;
    const result = await studentService.setDefaultResume(req.user!.id, resumeId!);
    res.json(result);
  } catch (err) { next(err); }
}

export async function deleteResume(req: Request, res: Response, next: NextFunction) {
  try {
    const resumeId = Array.isArray(req.params.resumeId) ? req.params.resumeId[0] : req.params.resumeId;
    await studentService.deleteResume(req.user!.id, resumeId!);
    res.json({ message: 'Resume deleted' });
  } catch (err) { next(err); }
}

// Policy
export async function acceptPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (Array.isArray(req.ip) ? req.ip[0] : req.ip) || req.socket.remoteAddress || '';
    const result = await studentService.acceptPolicy(req.user!.id, req.validated!.body as any, ip);
    res.json(result);
  } catch (err) { next(err); }
}

// Interests
export async function getInterests(req: Request, res: Response, next: NextFunction) {
  try {
    const interests = await studentService.getInterests(req.user!.id);
    res.json({ interests });
  } catch (err) { next(err); }
}

export async function registerInterests(req: Request, res: Response, next: NextFunction) {
  try {
    const interests = await studentService.registerInterests(req.user!.id, req.validated!.body as any);
    res.json({ interests });
  } catch (err) { next(err); }
}

// Placement preferences (opt-out)
export async function getPlacementPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.getPlacementPreferences(req.user!.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updateGlobalPlacementOptOut(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (Array.isArray(req.ip) ? req.ip[0] : req.ip) || req.socket.remoteAddress || '';
    const result = await studentService.updateGlobalPlacementOptOut(req.user!.id, req.validated!.body as any, ip);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updatePostingTypePreference(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (Array.isArray(req.ip) ? req.ip[0] : req.ip) || req.socket.remoteAddress || '';
    const result = await studentService.updatePostingTypePreference(req.user!.id, req.validated!.body as any, ip);
    res.json(result);
  } catch (err) { next(err); }
}
