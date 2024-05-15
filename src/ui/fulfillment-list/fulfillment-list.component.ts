import { Component } from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser'
import { DataService } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { TaskMessage } from '../types';
import { getTasks } from './fulfillment-list.graphql';


@Component({
    selector: 'task-list',
    template: `
       <vdr-card title="Tasks">
        <table>
            <tbody>
                    <tr *ngFor="let task of tasks$ | async">
                        <td [innerHTML]="sanitizer.bypassSecurityTrustHtml(task.taskName)">
                            
                        </td>
                        <td class="chip-class">
                            <vdr-chip [colorType]="task.colorType">
                                {{task.tag}}
                            </vdr-chip>
                        </td>
                    
                    </tr>
            </tbody>
        </table>
       </vdr-card>
    `,
    styleUrl: './fulfillment-list.component.scss',
})
export class TaskListComponent {
    tasks$: Observable<TaskMessage[]>;
    constructor(private dataService: DataService, private sanitizer: DomSanitizer) {
        this.tasks$ = this.dataService.query(getTasks)
        .mapStream((data: any) => data.tasks);
    }
}