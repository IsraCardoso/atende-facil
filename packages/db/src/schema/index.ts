import { conversationsTable } from "./conversations";
import { flowSchedulesTable } from "./flow-schedules";
import { flowsTable } from "./flows";
import { sessionsTable } from "./sessions";
import { tenantIntegrationsTable } from "./tenant-integrations";
import { tenantMembershipsTable } from "./tenant-memberships";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";
import { whatsappInstancesTable } from "./whatsapp-instances";

const schema = {
  conversationsTable,
  flowSchedulesTable,
  flowsTable,
  sessionsTable,
  tenantIntegrationsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};

export {
  conversationsTable,
  flowSchedulesTable,
  flowsTable,
  schema,
  sessionsTable,
  tenantIntegrationsTable,
  tenantMembershipsTable,
  tenantsTable,
  usersTable,
  whatsappInstancesTable,
};
