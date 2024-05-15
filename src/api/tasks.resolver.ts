import { Query, Resolver, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Ctx, Logger, Order, OrderService, RelationPaths, Relations, RequestContext, UserInputError } from '@vendure/core';
import { SHOULD_CLEAR_KEY, TasksService } from './tasks.service';
import axios from 'axios';
import { loggerCtx } from '../constants';
import { QueryOrdersArgs } from '@vendure/admin-ui/core/common/generated-types';
import { DeliveryRoutesService } from './delivery-routes.service';

@Resolver()
export class TasksResolver {
    constructor(private taskService: TasksService, 
        private deliveryRoutesService: DeliveryRoutesService,
        private orderService: OrderService) {}

    @Query()
    tasks(@Ctx() ctx: RequestContext) {
        return this.taskService.getTasks(ctx);
    }

    @Query()
    deliverableOrders(@Ctx() ctx: RequestContext,
    @Args() args: QueryOrdersArgs,
    @Relations(Order) relations: RelationPaths<Order>,) {
        return this.deliveryRoutesService.deliverableOrders(ctx, args);
    }

   
}