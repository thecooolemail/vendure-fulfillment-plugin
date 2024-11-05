import { SharedModule } from '@vendure/admin-ui/core';
import { Component } from '@angular/core';
import { TaskListComponent } from './task-list/task-list.component';
import { DeliveryRouteComponent } from './delivery-route/delivery-route.component';

@Component({
  selector: 'greeter',
  template: `
    <vdr-page-block>
      <div class="clr-row">
        <div class="clr-col-5">
          <task-list />
        </div>
        <div class="clr-col">
          <delivery-route />
        </div>
      </div>
    </vdr-page-block>
  `,
  standalone: true,
  imports: [SharedModule, TaskListComponent, DeliveryRouteComponent],
})
export class FulfillmentsComponent {}
