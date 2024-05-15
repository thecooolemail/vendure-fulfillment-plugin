import { OrderProcess } from '@vendure/core';

export const Fulfill: OrderProcess<'prepared'|'readyfordelivery'|'outfordelivery'|'Delivered'|'partialrefund'|'reschedule'|'readyforcollection'|'collected'|'notcollected'> = {
  transitions: {
        prepared: { to: ['readyfordelivery', 'readyforcollection'],mergeStrategy: 'replace'},
        readyforcollection: { to: ['collected', 'notcollected'],mergeStrategy: 'replace'},
        collected: { to: ['Delivered'],mergeStrategy: 'replace'},
        notcollected: { to: [],mergeStrategy: 'replace'},
        readyfordelivery: { to: ['outfordelivery'],mergeStrategy: 'replace'},
        outfordelivery: { to: ['Delivered', 'reschedule'],mergeStrategy: 'replace'},
        Delivered: { to: ['partialrefund'],mergeStrategy: 'replace'},
        partialrefund: { to: [],mergeStrategy: 'replace'},
        reschedule: { to: [],mergeStrategy: 'replace'},
    }
}

export const Preparations: OrderProcess<'awaitingprep'|'preparing'|'prepared'> = {
    
  transitions: {
        PaymentSettled: { to: ['awaitingprep'], mergeStrategy: 'replace'},
        awaitingprep: { to: ['Cancelled', 'preparing'], mergeStrategy: 'replace'},
	      preparing: { to: ['prepared'], mergeStrategy: 'replace'},
        prepared: { to: [], mergeStrategy: 'replace'}
        }
}
