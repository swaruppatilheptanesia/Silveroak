-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CompanyClassification" AS ENUM ('preferred', 'normal', 'blacklisted');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('placement', 'internship', 'campus_visit', 'guest_lecture', 'workshop');

-- CreateEnum
CREATE TYPE "PostingType" AS ENUM ('job', 'internship', 'stipend_internship');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('onsite', 'remote', 'hybrid');

-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('applied', 'mock_round', 'shortlisted', 'test_scheduled', 'interview', 'hr_round', 'offer_released', 'rejected');

-- CreateEnum
CREATE TYPE "MockRoundResult" AS ENUM ('pending', 'passed', 'failed');

-- CreateEnum
CREATE TYPE "FeedbackDecision" AS ENUM ('shortlist', 'under_consideration', 'not_selected');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('job', 'internship');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending_student_action', 'accepted', 'rejected_by_admin');

-- CreateEnum
CREATE TYPE "JoiningStatus" AS ENUM ('pending', 'joined', 'did_not_join');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('compliant', 'blocked', 'override_enabled');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('campus_drive', 'ppt', 'test_assessment', 'internship_drive', 'workshop');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late');

-- CreateEnum
CREATE TYPE "NocType" AS ENUM ('internship', 'training', 'project');

-- CreateEnum
CREATE TYPE "NocProgram" AS ENUM ('summer_internship', 'winter_internship', 'final_semester_internship', 'nep_internship', 'stipend_internship', 'dissertation', 'industrial_training');

-- CreateEnum
CREATE TYPE "PlacementSource" AS ENUM ('university_drive', 'self_sourced');

-- CreateEnum
CREATE TYPE "NocStatus" AS ENUM ('pending_faculty', 'pending_tpo', 'pending_company_verification', 'approved', 'issued', 'rejected');

-- CreateEnum
CREATE TYPE "CompanyVerificationStatus" AS ENUM ('verified', 'pending', 'rejected');

-- CreateEnum
CREATE TYPE "InternshipType" AS ENUM ('paid', 'unpaid', 'stipend_based');

-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('ongoing', 'completed', 'discontinued');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "industry" VARCHAR(100),
    "address" TEXT,
    "website" TEXT,
    "description" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "classification" "CompanyClassification" NOT NULL DEFAULT 'normal',
    "internal_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "company_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "designation" VARCHAR(100),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_engagements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "visitor_type" "EngagementType" NOT NULL,
    "date" DATE NOT NULL,
    "remarks" TEXT,
    "students_hired" INTEGER NOT NULL DEFAULT 0,
    "packages_offered" TEXT,
    "academic_year" VARCHAR(20),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "PostingType" NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "role_name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "work_mode" "WorkMode" NOT NULL,
    "ctc" VARCHAR(100),
    "stipend" VARCHAR(100),
    "duration" VARCHAR(100),
    "bond_details" TEXT,
    "role_description" TEXT,
    "eligible_branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligible_batches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_cgpa" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "max_backlogs" INTEGER NOT NULL DEFAULT 0,
    "skill_requirements" TEXT,
    "has_written_test" BOOLEAN NOT NULL DEFAULT false,
    "written_test_details" TEXT,
    "has_gd" BOOLEAN NOT NULL DEFAULT false,
    "gd_details" TEXT,
    "technical_rounds" INTEGER NOT NULL DEFAULT 0,
    "hr_rounds" INTEGER NOT NULL DEFAULT 0,
    "additional_info" TEXT,
    "application_start_date" DATE,
    "application_end_date" DATE,
    "status" "PostingStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "posting_id" TEXT NOT NULL,
    "resume_id" TEXT,
    "current_stage" "ApplicationStage" NOT NULL DEFAULT 'applied',
    "mock_round_result" "MockRoundResult",
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_stage" VARCHAR(30),
    "to_stage" VARCHAR(30) NOT NULL,
    "changed_by" TEXT,
    "remarks" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_feedback" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "recruiter_id" TEXT NOT NULL,
    "decision" "FeedbackDecision" NOT NULL,
    "remarks" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "posting_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "role" VARCHAR(200) NOT NULL,
    "ctc" VARCHAR(100),
    "stipend" VARCHAR(100),
    "location" VARCHAR(200),
    "offer_date" DATE NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending_student_action',
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" VARCHAR(50),
    "rejection_remarks" TEXT,
    "rejected_by" TEXT,
    "joining_status" "JoiningStatus" NOT NULL DEFAULT 'pending',
    "joining_date" DATE,
    "dnj_reason" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "compliance_status" "ComplianceStatus" NOT NULL DEFAULT 'compliant',
    "applications_blocked" BOOLEAN NOT NULL DEFAULT false,
    "admin_override_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_audit" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by" TEXT,
    "details" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "posting_id" TEXT,
    "title" VARCHAR(300) NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "date" DATE NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "venue" VARCHAR(300) NOT NULL,
    "reporting_time" VARCHAR(10),
    "dress_code" VARCHAR(200),
    "instructions" TEXT,
    "documents_required" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faculty_coordinators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_panels" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "panel_name" VARCHAR(100) NOT NULL,
    "room" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "recruiters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_students" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "panel_id" TEXT,
    "slot_time" VARCHAR(10),
    "attendance" "AttendanceStatus",
    "marked_by" TEXT,
    "marked_at" TIMESTAMP(3),

    CONSTRAINT "event_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noc_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "noc_type" "NocType" NOT NULL,
    "program" "NocProgram" NOT NULL,
    "placement_source" "PlacementSource" NOT NULL,
    "drive_id" TEXT,
    "company_name" VARCHAR(300) NOT NULL,
    "company_address" TEXT,
    "company_city" VARCHAR(100),
    "company_state" VARCHAR(100),
    "company_pincode" VARCHAR(10),
    "company_verification_status" "CompanyVerificationStatus" NOT NULL DEFAULT 'pending',
    "contact_person_name" VARCHAR(200),
    "contact_person_designation" VARCHAR(100),
    "contact_person_phone" VARCHAR(20),
    "contact_person_email" VARCHAR(255),
    "reference_by" VARCHAR(50),
    "reference_details" TEXT,
    "role_title" VARCHAR(200) NOT NULL,
    "technology_domain" VARCHAR(200),
    "job_description" TEXT,
    "stipend_amount" DECIMAL(10,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "duration_weeks" INTEGER,
    "offer_letter_url" TEXT,
    "status" "NocStatus" NOT NULL DEFAULT 'pending_faculty',
    "faculty_approved_by" TEXT,
    "faculty_approved_at" TIMESTAMP(3),
    "faculty_remarks" TEXT,
    "tpo_approved_by" TEXT,
    "tpo_approved_at" TIMESTAMP(3),
    "tpo_remarks" TEXT,
    "noc_number" VARCHAR(50),
    "issued_at" TIMESTAMP(3),
    "certificate_url" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noc_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "company_id" TEXT,
    "company_name" VARCHAR(300) NOT NULL,
    "role" VARCHAR(200) NOT NULL,
    "department" VARCHAR(100),
    "internship_type" "InternshipType" NOT NULL,
    "status" "InternshipStatus" NOT NULL DEFAULT 'ongoing',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "stipend_amount" DECIMAL(10,2),
    "stipend_frequency" VARCHAR(20),
    "is_receiving_stipend" BOOLEAN NOT NULL DEFAULT false,
    "certificate_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "certificate_url" TEXT,
    "offer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_tenant_id_name_idx" ON "companies"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "companies_tenant_id_status_idx" ON "companies"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "companies_tenant_id_classification_idx" ON "companies"("tenant_id", "classification");

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_user_id_key" ON "recruiters"("user_id");

-- CreateIndex
CREATE INDEX "recruiters_company_id_idx" ON "recruiters"("company_id");

-- CreateIndex
CREATE INDEX "recruiters_verification_status_idx" ON "recruiters"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_tenant_id_email_key" ON "recruiters"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "company_engagements_company_id_idx" ON "company_engagements"("company_id");

-- CreateIndex
CREATE INDEX "postings_tenant_id_status_idx" ON "postings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "postings_tenant_id_type_idx" ON "postings"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "postings_company_id_idx" ON "postings"("company_id");

-- CreateIndex
CREATE INDEX "postings_tenant_id_academic_year_idx" ON "postings"("tenant_id", "academic_year");

-- CreateIndex
CREATE INDEX "applications_posting_id_current_stage_idx" ON "applications"("posting_id", "current_stage");

-- CreateIndex
CREATE INDEX "applications_student_id_idx" ON "applications"("student_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_current_stage_idx" ON "applications"("tenant_id", "current_stage");

-- CreateIndex
CREATE UNIQUE INDEX "applications_student_id_posting_id_key" ON "applications"("student_id", "posting_id");

-- CreateIndex
CREATE INDEX "application_stage_history_application_id_idx" ON "application_stage_history"("application_id");

-- CreateIndex
CREATE INDEX "offers_student_id_status_idx" ON "offers"("student_id", "status");

-- CreateIndex
CREATE INDEX "offers_company_id_idx" ON "offers"("company_id");

-- CreateIndex
CREATE INDEX "offers_posting_id_idx" ON "offers"("posting_id");

-- CreateIndex
CREATE INDEX "offers_tenant_id_status_idx" ON "offers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "offer_audit_offer_id_idx" ON "offer_audit"("offer_id");

-- CreateIndex
CREATE INDEX "events_tenant_id_date_idx" ON "events"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "events_tenant_id_status_idx" ON "events"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "events_company_id_idx" ON "events"("company_id");

-- CreateIndex
CREATE INDEX "event_panels_event_id_idx" ON "event_panels"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_students_event_id_student_id_key" ON "event_students"("event_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "noc_requests_noc_number_key" ON "noc_requests"("noc_number");

-- CreateIndex
CREATE INDEX "noc_requests_student_id_idx" ON "noc_requests"("student_id");

-- CreateIndex
CREATE INDEX "noc_requests_tenant_id_status_idx" ON "noc_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "internships_student_id_idx" ON "internships"("student_id");

-- CreateIndex
CREATE INDEX "internships_tenant_id_status_idx" ON "internships"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "internships_company_id_idx" ON "internships"("company_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_engagements" ADD CONSTRAINT "company_engagements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_engagements" ADD CONSTRAINT "company_engagements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_feedback" ADD CONSTRAINT "recruiter_feedback_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_feedback" ADD CONSTRAINT "recruiter_feedback_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_audit" ADD CONSTRAINT "offer_audit_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_audit" ADD CONSTRAINT "offer_audit_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_panels" ADD CONSTRAINT "event_panels_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_students" ADD CONSTRAINT "event_students_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_students" ADD CONSTRAINT "event_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_students" ADD CONSTRAINT "event_students_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "event_panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_students" ADD CONSTRAINT "event_students_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_faculty_approved_by_fkey" FOREIGN KEY ("faculty_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_tpo_approved_by_fkey" FOREIGN KEY ("tpo_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internships" ADD CONSTRAINT "internships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internships" ADD CONSTRAINT "internships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internships" ADD CONSTRAINT "internships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internships" ADD CONSTRAINT "internships_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
