import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { GetTasksDocument, Task } from '../generated-types';

@Component({
  selector: 'task-list',
  templateUrl: './task-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SharedModule],
})
export class TaskListComponent {
  tasks$: Observable<Task[] | null | undefined>;

  constructor(
    private readonly dataService: DataService,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.tasks$ = this.dataService.query(GetTasksDocument).mapStream(data => data.tasks);
  }
}
