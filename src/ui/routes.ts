import { registerRouteComponent } from "@vendure/admin-ui/core";
import { GreeterComponent } from "./fulfillments.component";

export default [
    registerRouteComponent({
        component: GreeterComponent,
        path: '',
        title: '',
        breadcrumb: 'fulfillments',
    }),
]