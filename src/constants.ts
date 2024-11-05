import { PermissionDefinition } from '@vendure/core';

export const loggerCtx = 'VendureFulfillmentsDashboardPlugin';
export const PLUGIN_INIT_OPTIONS = Symbol('PLUGIN_INIT_OPTIONS');

export const tasksAndOrders = new PermissionDefinition({
  name: 'TasksAndOrder',
  description: 'Allows reading tasks and orders',
});
