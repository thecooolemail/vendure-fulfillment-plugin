export const loggerCtx = 'VendureFulfillmentsDashboardPlugin';
import { PermissionDefinition } from '@vendure/core';

export const tasksAndOrders = new PermissionDefinition({
    name: 'TasksAndOrder',
    description: 'Allows reading tasks and orders'
});