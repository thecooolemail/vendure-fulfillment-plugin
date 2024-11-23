import { OrderProcess, OrderState } from '@vendure/core';

declare module '@vendure/core' {
  interface CustomOrderStates {
    awaitingprep: OrderState;
    preparing: OrderState;
    readyfordelivery: OrderState;
    outfordelivery: OrderState;
    orderdelivered: OrderState;
    partialrefund: OrderState;
    reschedule: OrderState;
    readyforcollection: OrderState;
    collected: OrderState;
    notcollected: OrderState;
    itemsreplaced: OrderState;
    itemsrejected: OrderState; // New state for rejected items
  }
}

export const PreparationsProcess: OrderProcess<
  | 'awaitingprep'
  | 'preparing'
  | 'readyfordelivery'
  | 'outfordelivery'
  | 'orderdelivered'
  | 'partialrefund'
  | 'rescheduledelivery'
  | 'notdelivered'
  | 'reschedulecollection'
  | 'readyforcollection'
  | 'collected'
  | 'refund'
  | 'notcollected'
  | 'itemsreplaced'
  | 'itemsrejected'
> = {
  transitions: {
    awaitingprep: { to: ['Cancelled', 'preparing'], mergeStrategy: 'replace' },
    preparing: {
      to: ['readyfordelivery', 'readyforcollection'],
      mergeStrategy: 'replace',
    },
    readyforcollection: {
      to: ['collected', 'notcollected', 'itemsrejected', 'reschedulecollection'],
      mergeStrategy: 'replace',
    },
    reschedulecollection: {
      to: ['collected', 'notcollected'],
      mergeStrategy: 'replace',
    },
    collected: { to: ['partialrefund'], mergeStrategy: 'replace' },
    notcollected: {
      to: ['reschedulecollection', 'itemsreplaced', 'refund'],
      mergeStrategy: 'replace',
    },
    itemsreplaced: { to: ['refund'], mergeStrategy: 'replace' },
    readyfordelivery: {
      to: ['outfordelivery', 'itemsrejected'],
      mergeStrategy: 'replace',
    },
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
    orderdelivered: { to: ['partialrefund'], mergeStrategy: 'replace' },
    partialrefund: { to: [], mergeStrategy: 'replace' },
    rescheduledelivery: { to: ['readyfordelivery'], mergeStrategy: 'replace' },
    itemsrejected: {
      to: ['readyforcollection', 'readyfordelivery'],
      mergeStrategy: 'replace',
    },
  },
};

export const Preparations: OrderProcess<'awaitingprep' | 'preparing'> = {
  transitions: {
    PaymentSettled: { to: ['awaitingprep'], mergeStrategy: 'replace' },
    awaitingprep: { to: ['Cancelled', 'preparing'], mergeStrategy: 'replace' },
    preparing: { to: [], mergeStrategy: 'replace' },
  },
};
