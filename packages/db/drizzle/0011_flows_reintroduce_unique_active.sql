-- Auditoria antes de recriar o indice (rodar manualmente se a migration falhar por violacao de unicidade):
-- SELECT tenant_id, COUNT(*) FROM flows WHERE status = 'active' AND deleted_at IS NULL GROUP BY tenant_id HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "flows_one_active_per_tenant" ON "flows" USING btree ("tenant_id") WHERE status = 'active' AND deleted_at IS NULL;
