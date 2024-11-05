import path from 'path';

import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

import { adminApiExtensions } from './api/api-extensions';
import { DeliveryRoutesService } from './api/delivery-routes.service';
import { TasksResolver } from './api/tasks.resolver';
import { TasksService } from './api/tasks.service';
import { tasksAndOrders } from './constants';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [TasksService, DeliveryRoutesService],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [TasksResolver],
  },
  configuration: config => {
    config.customFields.Channel.push(
      { name: 'Logitude', type: 'string' },
      { name: 'Latitude', type: 'string' },
      { name: 'Address', type: 'string' },
      { name: 'Hours', type: 'string' },
      { name: 'Phone', type: 'string' },
      { name: 'google_place_id', type: 'string' },
    );
    config.customFields.Address.push(
      { name: 'Place_id', type: 'string' },
      { name: 'Long', type: 'string' },
      { name: 'Lat', type: 'string' },
    );
    config.customFields.Order.push(
      { name: 'Is_Delivery', type: 'boolean', defaultValue: false },
      { name: 'Delivery_Collection_Date', type: 'datetime' },
      { name: 'Time_Slot', type: 'string' },
      { name: 'Order_Note', type: 'string' },
      { name: 'Reschedule_Reason', type: 'string' },
      { name: 'Review', type: 'int' },
      { name: 'google_place_id', type: 'string' },
    );
    config.authOptions.customPermissions.push(tasksAndOrders);

    return config;
  },
})
export class VendureFulfillmentsDashboardPlugin {
  static ui: AdminUiExtension = {
    id: 'vendure-fulfillments-dashboard-ui',
    extensionPath: path.join(__dirname, 'ui'),
    routes: [{ route: 'fulfillments', filePath: 'routes.ts' }],
    providers: ['providers.ts'],
  };
}
