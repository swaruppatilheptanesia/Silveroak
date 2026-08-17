ALTER TABLE "users" ADD COLUMN "crm_employee_code" VARCHAR(50);

CREATE UNIQUE INDEX "users_tenant_id_crm_employee_code_key" ON "users"("tenant_id", "crm_employee_code");
