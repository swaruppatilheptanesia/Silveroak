-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "TargetAudienceType" AS ENUM ('all', 'batch', 'department', 'eligible_for_posting');

-- CreateEnum
CREATE TYPE "CircularTemplateType" AS ENUM ('placement', 'internship', 'stipend_internship', 'nep_internship');

-- CreateEnum
CREATE TYPE "CircularTemplateStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ExitReason" AS ENUM ('employment', 'family_business', 'higher_studies');

-- CreateEnum
CREATE TYPE "NdcStatus" AS ENUM ('pending_review', 'under_review', 'approved', 'returned', 'rejected', 'issued');

-- CreateEnum
CREATE TYPE "PortfolioStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('xlsx', 'pdf');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('profile', 'policy', 'readiness', 'placement');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "internship_issues" (
    "id" TEXT NOT NULL,
    "internship_id" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "reported_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'medium',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'draft',
    "target_audience_type" "TargetAudienceType" NOT NULL DEFAULT 'all',
    "target_batches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_posting_id" TEXT,
    "requires_consent" BOOLEAN NOT NULL DEFAULT false,
    "linked_circular_id" TEXT,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "consent_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_receipts" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "has_consented" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3),

    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circular_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "CircularTemplateType" NOT NULL,
    "status" "CircularTemplateStatus" NOT NULL DEFAULT 'draft',
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circular_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_circulars" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_name" VARCHAR(300) NOT NULL,
    "role_name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "field_values" JSONB NOT NULL DEFAULT '{}',
    "generated_by" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_circulars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_dues_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "exit_reason" "ExitReason" NOT NULL,
    "company_name" VARCHAR(300),
    "designation" VARCHAR(200),
    "package_lpa" DECIMAL(10,2),
    "joining_date" DATE,
    "business_name" VARCHAR(300),
    "business_nature" VARCHAR(200),
    "business_address" TEXT,
    "institution_name" VARCHAR(300),
    "program_name" VARCHAR(200),
    "country" VARCHAR(100),
    "declaration_accepted" BOOLEAN NOT NULL DEFAULT false,
    "status" "NdcStatus" NOT NULL DEFAULT 'pending_review',
    "admin_remarks" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "ndc_number" VARCHAR(50),
    "issued_at" TIMESTAMP(3),
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_dues_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "PortfolioStatus" NOT NULL DEFAULT 'draft',
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "internship_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "role" VARCHAR(200),
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "github_url" TEXT,
    "live_url" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internship_showcases" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "company_name" VARCHAR(300) NOT NULL,
    "role" VARCHAR(200) NOT NULL,
    "duration_months" INTEGER,
    "start_date" DATE,
    "end_date" DATE,
    "key_outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proof_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "linked_internship_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internship_showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "effective_date" DATE,
    "updated_by" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_name" VARCHAR(200) NOT NULL,
    "company_name" VARCHAR(300),
    "min_cgpa" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "max_backlogs" INTEGER NOT NULL DEFAULT 0,
    "eligible_branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligible_batches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_tenth" DECIMAL(5,2),
    "min_twelfth" DECIMAL(5,2),
    "additional_criteria" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "posting_id" TEXT,
    "company_name" VARCHAR(300),
    "role_name" VARCHAR(200),
    "exported_by" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "record_count" INTEGER NOT NULL,
    "fields_included" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" VARCHAR(200),
    "action" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" TEXT,
    "details" TEXT,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" VARCHAR(30) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'low',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internship_issues_internship_id_idx" ON "internship_issues"("internship_id");

-- CreateIndex
CREATE INDEX "announcements_tenant_id_status_idx" ON "announcements"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "announcements_tenant_id_priority_idx" ON "announcements"("tenant_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_receipts_announcement_id_student_id_key" ON "announcement_receipts"("announcement_id", "student_id");

-- CreateIndex
CREATE INDEX "circular_templates_tenant_id_status_idx" ON "circular_templates"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "generated_circulars_tenant_id_idx" ON "generated_circulars"("tenant_id");

-- CreateIndex
CREATE INDEX "generated_circulars_template_id_idx" ON "generated_circulars"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "no_dues_requests_ndc_number_key" ON "no_dues_requests"("ndc_number");

-- CreateIndex
CREATE INDEX "no_dues_requests_student_id_idx" ON "no_dues_requests"("student_id");

-- CreateIndex
CREATE INDEX "no_dues_requests_tenant_id_status_idx" ON "no_dues_requests"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_student_id_key" ON "portfolios"("student_id");

-- CreateIndex
CREATE INDEX "portfolio_projects_portfolio_id_idx" ON "portfolio_projects"("portfolio_id");

-- CreateIndex
CREATE INDEX "internship_showcases_portfolio_id_idx" ON "internship_showcases"("portfolio_id");

-- CreateIndex
CREATE INDEX "policies_tenant_id_idx" ON "policies"("tenant_id");

-- CreateIndex
CREATE INDEX "eligibility_rules_tenant_id_is_active_idx" ON "eligibility_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "export_records_tenant_id_idx" ON "export_records"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_module_idx" ON "audit_logs"("tenant_id", "module");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_action_idx" ON "audit_logs"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenant_id_role_module_key" ON "role_permissions"("tenant_id", "role", "module");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "internship_issues" ADD CONSTRAINT "internship_issues_internship_id_fkey" FOREIGN KEY ("internship_id") REFERENCES "internships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_issues" ADD CONSTRAINT "internship_issues_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_posting_id_fkey" FOREIGN KEY ("target_posting_id") REFERENCES "postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_linked_circular_id_fkey" FOREIGN KEY ("linked_circular_id") REFERENCES "generated_circulars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_templates" ADD CONSTRAINT "circular_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_templates" ADD CONSTRAINT "circular_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_circulars" ADD CONSTRAINT "generated_circulars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_circulars" ADD CONSTRAINT "generated_circulars_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "circular_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_circulars" ADD CONSTRAINT "generated_circulars_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_circulars" ADD CONSTRAINT "generated_circulars_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_requests" ADD CONSTRAINT "no_dues_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_requests" ADD CONSTRAINT "no_dues_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_requests" ADD CONSTRAINT "no_dues_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_showcases" ADD CONSTRAINT "internship_showcases_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_showcases" ADD CONSTRAINT "internship_showcases_linked_internship_id_fkey" FOREIGN KEY ("linked_internship_id") REFERENCES "internships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_records" ADD CONSTRAINT "export_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_records" ADD CONSTRAINT "export_records_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_records" ADD CONSTRAINT "export_records_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
