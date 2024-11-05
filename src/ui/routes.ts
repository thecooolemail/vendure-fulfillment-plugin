import { registerRouteComponent } from '@vendure/admin-ui/core';
import { FulfillmentsComponent } from './fulfillments.component';

export default [
  registerRouteComponent({
    component: FulfillmentsComponent,
    path: '',
    title: 'Fulfillments',
    breadcrumb: 'fulfillments',
  }),
];
