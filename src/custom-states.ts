import { OrderProcess, OrderState } from '@vendure/core';

declare module '@vendure/core' {
  interface CustomOrderStates {
    AwaitingPrep: OrderState;
    Preparing: OrderState;
    ReadyForDelivery: OrderState;
    OutForDelivery: OrderState;
    CouldNotDeliver: OrderState;
    Delivered: OrderState;
    ReadyForCollection: OrderState;
    Collected: OrderState;
    NoCollection: OrderState;
    PartialRefund: OrderState;
  }
}

export const PreparationsProcess: OrderProcess<
  | 'AwaitingPrep'
  | 'Preparing'
  | 'ReadyForDelivery'
  | 'OutForDelivery'
  | 'CouldNotDeliver'
  | 'Delivered'
  | 'ReadyForCollection'
  | 'Collected'
  | 'NoCollection'
  | 'PartialRefund'
> = {
  transitions: {
    PaymentSettled: { to: ['AwaitingPrep'], mergeStrategy: 'replace' },
    AwaitingPrep: {
      to: ['PartialRefund', 'Preparing'],
      mergeStrategy: 'replace',
    },
    Preparing: {
      to: ['ReadyForDelivery', 'ReadyForCollection'],
      mergeStrategy: 'replace',
    },
    ReadyForDelivery: {
      to: ['OutForDelivery'],
      mergeStrategy: 'replace',
    },
    OutForDelivery: {
      to: ['Delivered', 'CouldNotDeliver'],
      mergeStrategy: 'replace',
    },
    Delivered: { to: ['PartialRefund'], mergeStrategy: 'replace' },
    CouldNotDeliver: {
      to: ['ReadyForDelivery', 'PartialRefund'],
      mergeStrategy: 'replace',
    },
    ReadyForCollection: {
      to: ['Collected', 'NoCollection'],
      mergeStrategy: 'replace',
    },
    Collected: { to: ['PartialRefund'], mergeStrategy: 'replace' },
    NoCollection: {
      to: ['ReadyForCollection', 'PartialRefund'],
      mergeStrategy: 'replace',
    },
    PartialRefund: { to: [], mergeStrategy: 'replace' },
  },
};

export const Preparations: OrderProcess<'awaitingprep' | 'preparing'> = {
  transitions: {
    PaymentSettled: { to: ['awaitingprep'], mergeStrategy: 'replace' },
    awaitingprep: { to: ['Cancelled', 'preparing'], mergeStrategy: 'replace' },
    preparing: { to: [], mergeStrategy: 'replace' },
  },
};
