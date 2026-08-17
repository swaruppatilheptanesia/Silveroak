-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter', 'management', 'super_admin');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('placement', 'summer_internship', 'winter_internship', 'final_semester_internship', 'nep_internship', 'stipend_internship', 'dissertation');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(50),
    "logo_url" TEXT,
    "tagline" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "website" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "department" VARCHAR(100),
    "designation" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enrollment_number" VARCHAR(50) NOT NULL,
    "roll_number" VARCHAR(50),
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(20),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "department" VARCHAR(100) NOT NULL,
    "batch" VARCHAR(20) NOT NULL,
    "course" VARCHAR(100),
    "institute" VARCHAR(200),
    "linkedin_url" TEXT,
    "alternate_phone" VARCHAR(20),
    "residential_address" TEXT,
    "permanent_address" TEXT,
    "profile_photo_url" TEXT,
    "profile_completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "policy_accepted" BOOLEAN NOT NULL DEFAULT false,
    "policy_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_profiles" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "cgpa" DECIMAL(4,2),
    "tenth_percentage" DECIMAL(5,2),
    "twelfth_percentage" DECIMAL(5,2),
    "diploma_percentage" DECIMAL(5,2),
    "backlog_count" INTEGER NOT NULL DEFAULT 0,
    "active_backlogs" INTEGER NOT NULL DEFAULT 0,
    "semester" INTEGER,
    "year_of_study" INTEGER,
    "course_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills_profiles" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "technical_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "domain_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_projects" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "github_url" TEXT,
    "demo_url" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200) NOT NULL,
    "issue_date" DATE,
    "credential_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "ai_score" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_employment" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "is_currently_working" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" VARCHAR(50),
    "company_name" VARCHAR(200),
    "designation" VARCHAR(200),
    "duration" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acceptances" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "policy_read" BOOLEAN NOT NULL DEFAULT false,
    "rules_accepted" BOOLEAN NOT NULL DEFAULT false,
    "profile_sharing_consent" BOOLEAN NOT NULL DEFAULT false,
    "resume_sharing_consent" BOOLEAN NOT NULL DEFAULT false,
    "data_storage_consent" BOOLEAN NOT NULL DEFAULT false,
    "communication_consent" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(50),

    CONSTRAINT "policy_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_registrations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "interest_type" "InterestType" NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "users_tenant_id_is_active_idx" ON "users"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE INDEX "students_tenant_id_department_idx" ON "students"("tenant_id", "department");

-- CreateIndex
CREATE INDEX "students_tenant_id_batch_idx" ON "students"("tenant_id", "batch");

-- CreateIndex
CREATE INDEX "students_tenant_id_verification_status_idx" ON "students"("tenant_id", "verification_status");

-- CreateIndex
CREATE INDEX "students_profile_completion_percentage_idx" ON "students"("profile_completion_percentage");

-- CreateIndex
CREATE UNIQUE INDEX "students_tenant_id_enrollment_number_key" ON "students"("tenant_id", "enrollment_number");

-- CreateIndex
CREATE UNIQUE INDEX "academic_profiles_student_id_key" ON "academic_profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_profiles_student_id_key" ON "skills_profiles"("student_id");

-- CreateIndex
CREATE INDEX "student_projects_student_id_idx" ON "student_projects"("student_id");

-- CreateIndex
CREATE INDEX "certifications_student_id_idx" ON "certifications"("student_id");

-- CreateIndex
CREATE INDEX "resumes_student_id_idx" ON "resumes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "current_employment_student_id_key" ON "current_employment"("student_id");

-- CreateIndex
CREATE INDEX "policy_acceptances_student_id_idx" ON "policy_acceptances"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "interest_registrations_student_id_interest_type_key" ON "interest_registrations"("student_id", "interest_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_profiles" ADD CONSTRAINT "academic_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills_profiles" ADD CONSTRAINT "skills_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_employment" ADD CONSTRAINT "current_employment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acceptances" ADD CONSTRAINT "policy_acceptances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_registrations" ADD CONSTRAINT "interest_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
