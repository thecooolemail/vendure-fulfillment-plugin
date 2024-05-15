import { SharedModule } from '@vendure/admin-ui/core';
import { Component } from '@angular/core';

@Component({
    selector: 'greeter',
    template: `
        <vdr-page-block>
            <div class="clr-row">
                <div class="clr-col-5">
                    <task-list/>
                </div>
                <div class="clr-col">
                    <delivery-route/>
                </div>
            </div>
        </vdr-page-block>
    `,
})
export class GreeterComponent {
    
}