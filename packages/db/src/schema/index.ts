import { tenantMembershipsTable } from "./tenant-memberships";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

const schema = {
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
};

export { schema, tenantMembershipsTable, tenantsTable, usersTable };
