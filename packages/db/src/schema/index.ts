import { conversationsTable } from "./conversations";
import { flowsTable } from "./flows";
import { sessionsTable } from "./sessions";
import { tenantMembershipsTable } from "./tenant-memberships";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { whatsappInstancesTable } from "./whatsapp-instances";

const schema = {
  conversationsTable,
  flowsTable,
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};

export {
  conversationsTable,
  flowsTable,
  schema,
  sessionsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};
