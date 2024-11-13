import { OrderProcess } from '@vendure/core';

export const Fulfill: OrderProcess<
  | 'outfordelivery'
  | 'partialrefund'
  | 'reschedulecollection'
  | 'rescheduledelivery'
  | 'readyforcollection'
  | 'collected'
  | 'refund'
  | 'notdelivered'
  | 'notcollected'
> = {
  transitions: {
    readyforcollection: {
      to: [
        'collected',
        'notcollected',
        'itemsrejected',
        'reschedulecollection',
      ],
      mergeStrategy: 'replace',
    },
    reschedulecollection: {
      to: ['collected', 'notcollected'],
      mergeStrategy: 'replace',
    },
    collected: { to: [], mergeStrategy: 'replace' },
    notcollected: {
      to: ['reschedulecollection', 'itemsreplaced', 'refund'],
      mergeStrategy: 'replace',
    },
    itemsreplaced: { to: ['refund'], mergeStrategy: 'replace' },
    outfordelivery: {
      to: ['orderdelivered', 'rescheduledelivery', 'notdelivered'],
      mergeStrategy: 'replace',
    },
    notdelivered: {
      to: ['rescheduledelivery', 'itemsreplaced', 'refund'],
      mergeStrategy: 'replace',
    },
    refund: { to: ['Cancelled'], mergeStrategy: 'replace' },
    Cancelled: { to: [], mergeStrategy: 'replace' },
    rescheduledelivery: { to: ['outfordelivery'], mergeStrategy: 'replace' },
    orderdelivered: { to: ['partialrefund'], mergeStrategy: 'replace' },
    partialrefund: { to: [], mergeStrategy: 'replace' },
  },
};

export const Preparations: OrderProcess<'awaitingprep' | 'preparing'> = {
  transitions: {
    PaymentSettled: { to: ['awaitingprep'], mergeStrategy: 'replace' },
    awaitingprep: { to: ['Cancelled', 'preparing'], mergeStrategy: 'replace' },
    preparing: { to: [], mergeStrategy: 'replace' },
  },
};
