import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, Order, OrderService, RelationPaths, Relations, RequestContext } from '@vendure/core';
import { QueryOrdersArgs } from '../gql/generated';
import { DeliveryRoutesService } from './delivery-routes.service';
import { TasksService } from './tasks.service';

@Resolver()
export class TasksResolver {
  constructor(
    private taskService: TasksService,
    private deliveryRoutesService: DeliveryRoutesService,
    private orderService: OrderService,
  ) {}

  @Query()
  tasks(@Ctx() ctx: RequestContext) {
    return this.taskService.getTasks(ctx);
  }

  @Query()
  deliverableOrders(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryOrdersArgs,
    @Relations(Order) relations: RelationPaths<Order>,
  ) {
    return this.deliveryRoutesService.deliverableOrders(ctx, args);
  }
}
