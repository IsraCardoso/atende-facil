import { conversationsTable } from "./conversations";
import { sessionsTable } from "./sessions";
import { tenantMembershipsTable } from "./tenant-memberships";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { whatsappInstancesTable } from "./whatsapp-instances";

const schema = {
  conversationsTable,
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};

export {
  conversationsTable,
  schema,
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};
