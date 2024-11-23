import { Injectable } from '@nestjs/common';
import {
  EventBus,
  Order,
  OrderService,
  RequestContext,
  TransactionalConnection,
  OrderState,
} from '@vendure/core';
import { LessThanOrEqual /*, Not */, In, Between, FindOperator } from 'typeorm';
import dayjs from 'dayjs';
import { TaskMessage } from '../types';
// import { SubstitutionStates } from 'vendure-substitution-plugin';

export const SHOULD_CLEAR_KEY = 'shouldClearCachedDeliveryRoute';

@Injectable()
export class TasksService {
  constructor(
    private conn: TransactionalConnection,
    private eventBus: EventBus,
    private orderService: OrderService
  ) {}

  async getTasks(ctx: RequestContext): Promise<TaskMessage[]> {
    //
    // TODO
    //
    // add this to corn job
    //
    await this.updateNoCollectionOrders(ctx);

    return [
      // High priority tasks first
      ...(await this.getFailedDeliveredOrders(ctx)),
      ...(await this.getNotDeliveredOrders(ctx)),
      ...(await this.getNotPreparedForToday(ctx)),
      ...(await this.getNoCollectionOrders(ctx)),

      // Then medium priority tasks
      // ...(await this.getNotCollectedOrders(ctx)),
      ...(await this.getRescheduledDeliveryOrders(ctx)),
      ...(await this.getPreparedAndNotOutForDeliveryForToday(ctx)),
      ...(await this.getRescheduledOrders(ctx)),
      // ...(await this.getItemsRejectedCollectionOrders(ctx)),

      // Then low priority tasks
      ...(await this.getReadyForCollectionOrders(ctx)),
      ...(await this.getNotPreparedForTomorrow(ctx)),
      ...(await this.getRescheduledCollectionOrders(ctx)),
      ...(await this.getReadyForCollectionOrders(ctx)),
      // ...(await this.getSubItemRejectedDeliveredOrders(ctx)),

      // Others
      ...(await this.getAnyOutForDeliveryForToday(ctx)),
    ];
  }

  //
  // awating prep
  //
  async getNotPreparedForTomorrow(ctx: RequestContext): Promise<TaskMessage[]> {
    const tomorrow = dayjs().add(1, 'day');
    const tomorrowStartOfDay = tomorrow.startOf('day').toDate();
    const tomorrowEndOfDay = tomorrow.endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(tomorrowStartOfDay, tomorrowEndOfDay),
      In(['awaitingprep', 'preparing'])
    );

    return orders.map((order) => ({
      taskName: `Prepare ${this.getLink(order)} for tomorrow`,
      tag: 'Low Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'success',
    }));
  }

  async getNotPreparedForToday(ctx: RequestContext): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      In(['awaitingprep', 'preparing'])
    );

    return orders.map((order) => ({
      taskName: `Prepare ${this.getLink(order)} for today`,
      tag: 'High Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'error',
    }));
  }

  //
  // order cancelled
  //

  //
  // ready for collection
  //
  // readyforcollection && collection date === today
  async getReadyForCollectionOrders(
    ctx: RequestContext
  ): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      'readyforcollection'
    );

    return orders.map((order) => ({
      taskName: `${this.getLink(order)} will be collected today`,
      tag: 'Low Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'success',
    }));
  }

  // readyforcollection && collection date > 24h, change order state to no collection
  async updateNoCollectionOrders(ctx: RequestContext) {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().subtract(1, 'days').toDate()),
      'readyforcollection'
    );

    for (const order of orders) {
      await this.orderService.transitionToState(ctx, order.id, 'notcollected');
    }
  }

  //
  // no collection
  //
  async getNoCollectionOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().toDate()),
      'notcollected'
    );

    return orders.map((order) => ({
      taskName: `Call Customer and Reschedule ${this.getLink(order)} collection,  Change state to refund and refund order if can't contact customer`,
      tag: 'High Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'error',
    }));
  }

  //
  // couldn't deliver
  //
  // notdelivered
  async getFailedDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().toDate()),
      'notdelivered',
      true
    );

    return orders.map((order) => ({
      taskName: `Call Customer and Reschedule ${this.getLink(order)} delivery, Change state to refund and refund order if can't contact customer`,
      tag: 'High Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'error',
    }));
  }

  //
  // ready for delivery
  //
  async getPreparedAndNotOutForDeliveryForToday(
    ctx: RequestContext
  ): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      In(['readyfordelivery', 'prepared']),
      true
    );

    return orders.map((order) => ({
      taskName: `Send ${this.getLink(order)} out for delivery`,
      tag: 'Medium Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'success',
    }));
  }

  // ready for delivery and time since delivery date > 24h
  async getNotDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().subtract(1, 'days').toDate()),
      'readyfordelivery',
      true
    );

    return orders.map((order) => ({
      taskName: `${this.getLink(order)} passed delivery date, Reschedule delivery`,
      tag: 'High Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'error',
    }));
  }

  //
  // out for delivery
  //
  async getAnyOutForDeliveryForToday(
    ctx: RequestContext
  ): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      'outfordelivery',
      true
    );

    return orders.map((order) => ({
      taskName: `Finish delivery ${this.getLink(order)}`,
      tag: 'In Progress',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'warning',
    }));
  }

  //
  // items rejected collection
  //
  // async getItemsRejectedCollectionOrders(
  //   ctx: RequestContext
  // ): Promise<TaskMessage[]> {
  //   const todayStartOfDay = dayjs().startOf('day').toDate();
  //   const todayEndOfDay = dayjs().endOf('day').toDate();
  //   const orders = await this.getFilteredOrders(
  //     ctx,
  //     Between(todayStartOfDay, todayEndOfDay),
  //     'itemsrejected'
  //   );

  //   const orderWithRejectedItems = orders.filter((order) => {
  //     return order.lines.some((line) => {
  //       return (
  //         line.customFields?.substitutionState === SubstitutionStates.REJECTED
  //       );
  //     });
  //   });

  //   return orderWithRejectedItems.map((order) => ({
  //     taskName: `Order ${this.getLink(order)} substitution items rejected, place items back and make ready for collection / delivery`,
  //     tag: 'Medium Priority',
  //     orderId: order.id,
  //     state: order.state,
  //     code: order.code,
  //     colorType: 'error',
  //   }));
  // }

  //
  // items rejected delivery
  //

  //
  // rescheduled delivery
  //
  // if rescheduled and delivery date === today
  async getRescheduledDeliveryOrders(
    ctx: RequestContext
  ): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      'rescheduledelivery',
      true
    );

    return orders.map((order) => ({
      taskName: `Send rescheduled ${this.getLink(order)} out for delivery`,
      tag: 'Medium Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'success',
    }));
  }

  //
  // rescheduled collection
  //
  // if rescheduled and collection date === today
  async getRescheduledCollectionOrders(
    ctx: RequestContext
  ): Promise<TaskMessage[]> {
    const todayStartOfDay = dayjs().startOf('day').toDate();
    const todayEndOfDay = dayjs().endOf('day').toDate();
    const orders = await this.getFilteredOrders(
      ctx,
      Between(todayStartOfDay, todayEndOfDay),
      'reschedulecollection'
    );

    return orders.map((order) => ({
      taskName: `Reschedule ${this.getLink(order)} will be collected today`,
      tag: 'Medium Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'success',
    }));
  }

  // rescheduled and time > 48h
  async getRescheduledOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().subtract(2, 'days').toDate()),
      'reschedulecollection'
    );

    return orders.map((order) => ({
      taskName: `Order ${this.getLink(order)} not collected, place items back and change order to no collection`,
      tag: 'Medium Priority',
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: 'error',
    }));
  }

  //
  // delivered
  //
  // async getSubItemRejectedDeliveredOrders(
  //   ctx: RequestContext
  // ): Promise<TaskMessage[]> {
  //   const orders = await this.getFilteredOrders(
  //     ctx,
  //     LessThanOrEqual(dayjs().endOf('day').toDate()),
  //     In(['orderdelivered', 'collected'])
  //   );

  //   const orderWithRemovedItems = orders.filter((order) => {
  //     return order.lines.some((line) => {
  //       return (
  //         line.customFields?.substitutionState === SubstitutionStates.REMOVED
  //       );
  //     });
  //   });

  //   return orderWithRemovedItems.map((order) => ({
  //     taskName: `Refund Sub Items ${this.getLink(order)} and change state to Items Refunded`,
  //     tag: 'Low Priority',
  //     orderId: order.id,
  //     state: order.state,
  //     code: order.code,
  //     colorType: 'success',
  //   }));
  // }

  // async getNotCollectedOrders(ctx: RequestContext): Promise<TaskMessage[]> {
  //   const orders = await this.getFilteredOrders(
  //     ctx,
  //     LessThanOrEqual(dayjs().subtract(2, 'days').toDate()),
  //     Not('collected'),
  //     false
  //   );

  //   return orders.map((order) => ({
  //     taskName: `Refund Order ${this.getLink(order)} with code "no collection" and place items back on shelf`,
  //     tag: 'Medium Priority',
  //     orderId: order.id,
  //     state: order.state,
  //     code: order.code,
  //     colorType: 'success',
  //   }));
  // }

  private async getFilteredOrders(
    ctx: RequestContext,
    dateFilter: FindOperator<Date>,
    stateFilter: FindOperator<String> | string,
    isDelivery?: boolean
  ) {
    return await this.conn
      .getRepository(ctx, Order)
      .createQueryBuilder('order')
      .select('order.code')
      .addSelect('order.id')
      .addSelect('order.state')
      .leftJoin('order.channels', 'orderChannel')
      .setFindOptions({
        where: {
          customFields: {
            Delivery_Collection_Date: dateFilter,
            ...(isDelivery !== undefined ? { Is_Delivery: isDelivery } : {}),
          },
          state: stateFilter as any,
          channels: {
            id: ctx.channelId,
          },
        },
        relations: ['lines.customFields'],
      })
      .andWhere('state NOT IN (:...excludedStates)', {
        excludedStates: [
          'Draft',
          'AddingItems',
          'ArrangingPayment',
          'PaymentAuthorized',
          'PaymentSettled',
          'Shipped',
          'Delivered',
          'Cancelled',
        ] as OrderState[],
      })
      .getMany();
  }

  private getLink(order: Order) {
    const link =
      order.state === 'Draft'
        ? `/admin/orders/draft/${order.id}`
        : `/admin/orders/${order.id}`;
    return `<a class="button-ghost" href="${link}" ng-reflect-router-link="./orders,${order.id}" _ngcontent-ng-c518184086>
                    <span>${order.code}</span>
                    <clr-icon shape="arrow right" role="none">
                        <svg version="1.1" viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" role="img">
                            <path d="M27.66,15.61,18,6,8.34,15.61A1,1,0,1,0,9.75,17L17,9.81V28.94a1,1,0,1,0,2,0V9.81L26.25,17a1,1,0,0,0,1.41-1.42Z" class="clr-i-outline clr-i-outline-path-1">
                            </path>
                        </svg>
                    </clr-icon>
                </a>`;
  }
}
