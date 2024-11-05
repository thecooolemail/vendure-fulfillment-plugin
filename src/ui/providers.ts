import { addNavMenuItem } from '@vendure/admin-ui/core';

export default [
  addNavMenuItem(
    {
      id: 'fulfillments',
      label: 'Fulfillments',
      routerLink: ['/extensions', 'fulfillments'],
      requiresPermission: 'TasksAndOrder',
      icon: 'star',
    },
    'catalog',
  ),
];
