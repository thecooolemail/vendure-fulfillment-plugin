import { CustomProductFields } from '@vendure/core/dist/entity/custom-entity-fields';
import { ID } from '@vendure/core';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomChannelFields {
    Longitude?: string;
    Latitude?: string;
    Address?: string;
    Hours?: string;
    Phone?: string;
    google_place_id?: string;
  }
}

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomAddressFields {
    Place_id?: string;
    Long?: string;
    Lat?: string;
  }
}

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomOrderFields {
    Is_Delivery?: boolean;
    Delivery_Collection_Date?: Date;
    Time_Slot?: string;
    Order_Note?: string;
    Reschedule_Reason?: string;
    Review?: number;
    google_place_id?: string;
  }
}

export interface TaskMessage {
  taskName: string;
  tag: 'Medium Priority' | 'High Priority' | 'Low Priority' | 'Medium Priority' | 'In Progress';
  orderId: ID;
  state: string;
  code: string;
  colorType: 'error' | 'success' | 'warning';
}
