import { sessionsTable } from "./sessions";
import { tenantMembershipsTable } from "./tenant-memberships";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { whatsappInstancesTable } from "./whatsapp-instances";

const schema = {
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};

export {
  schema,
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};
