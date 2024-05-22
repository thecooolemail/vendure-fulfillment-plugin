import { Route } from '@angular/router';
import { registerRouteComponent } from "@vendure/admin-ui/core";
import { GreeterComponent } from "./fulfillments.component";

const routes: Route[] = [
    registerRouteComponent({
        component: GreeterComponent,
        path: '',
        title: '',
        breadcrumb: 'fulfillments',
    }),
];

export default routes;
