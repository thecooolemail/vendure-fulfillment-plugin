import { NgModule } from '@angular/core';
import { DeliveryRouteComponent } from './delivery-route/delivery-route.component';
import { TaskListComponent } from './fulfillment-list/fulfillment-list.component';
import { SharedModule } from '@vendure/admin-ui/core';
import { GreeterComponent } from './fulfillments.component';

@NgModule({
  declarations: [
    GreeterComponent,
    DeliveryRouteComponent,
    TaskListComponent
  ],
  imports: [
    SharedModule
  ],
})
export class SharedFulfillmentsModule { }
