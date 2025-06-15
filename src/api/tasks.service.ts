import { Injectable } from '@nestjs/common';
import { Order, OrderState, RequestContext, TransactionalConnection } from '@vendure/core';
import dayjs from 'dayjs';
import { Between, FindOperator, In, LessThanOrEqual } from 'typeorm';
import { SubstitutionStates } from 'vendure-substitution-plugin';
import { TaskMessage } from '../types';

export const SHOULD_CLEAR_KEY = 'shouldClearCachedDeliveryRoute';

@Injectable()
export class TasksService {
  constructor(private conn: TransactionalConnection) {}

  async getTasks(ctx: RequestContext): Promise<TaskMessage[]> {
    const taskGroups = [
      // high
      this.getPrepareToday,
      // medium
      this.getReadyForCollectionOrdersPast24h,
      this.getReadyForCollectionOrdersPast48h,
      this.getNoCollectionOrders,
      this.getPreparedAndNotOutForDeliveryForToday,
      this.getCouldntDeliverOrders,
      this.getAnyOutForDeliveryOrders,
      // low
      this.getPrepareForTomorrow,
      this.getReadyForCollectionOrders,
      this.getSubItemRejectedDeliveredOrders,
    ];

    const allTasks = await Promise.all(taskGroups.map(task => task.call(this, ctx)));
    return allTasks.flat();
  }

  private async fetchAndFormatTasks({
    ctx,
    dateFilter,
    stateFilter,
    taskTemplate,
    isDelivery,
  }: {
    ctx: RequestContext;
    dateFilter?: FindOperator<Date>;
    stateFilter: FindOperator<string> | string;
    taskTemplate: (order: Order) => TaskMessage;
    isDelivery?: boolean;
  }): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders({
      ctx,
      dateFilter,
      stateFilter,
      isDelivery,
    });
    return orders.map(taskTemplate);
  }

  // Awating Prep
  async getPrepareForTomorrow(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: Between(
        // orders with time till delivery/collection < 8 hours is handled in getPrepareToday
        dayjs().add(8, 'hours').toDate(),
        dayjs().add(24, 'hour').add(1, 'minute').toDate(),
      ),
      stateFilter: 'AwaitingPrep',
      taskTemplate: order => this.createTask(order, `Prepare`, 'for tomorrow', 'Low Priority', 'success'),
    });
  }

  async getPrepareToday(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: Between(dayjs().toDate(), dayjs().add(8, 'hours').toDate()),
      stateFilter: 'AwaitingPrep',
      taskTemplate: order => this.createTask(order, `Prepare`, 'for today', 'High Priority', 'error'),
    });
  }

  // Ready For Collection
  async getReadyForCollectionOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      stateFilter: 'ReadyForCollection',
      taskTemplate: order => this.createTask(order, '', 'will be collected today', 'Low Priority', 'success'),
    });
  }

  async getReadyForCollectionOrdersPast24h(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: LessThanOrEqual(dayjs().subtract(1, 'days').toDate()),
      stateFilter: 'ReadyForCollection',
      taskTemplate: order =>
        this.createTask(order, 'No collection', ', call customer', 'Medium Priority', 'success'),
    });
  }

  async getReadyForCollectionOrdersPast48h(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: LessThanOrEqual(dayjs().subtract(2, 'days').toDate()),
      stateFilter: 'ReadyForCollection',
      taskTemplate: order =>
        this.createTask(
          order,
          'No collection',
          ', if cant reach customer, change to No Collection',
          'Medium Priority',
          'success',
        ),
    });
  }

  // No Collection
  async getNoCollectionOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: LessThanOrEqual(dayjs().toDate()),
      stateFilter: 'NoCollection',
      taskTemplate: order =>
        this.createTask(order, 'Refund order', ', and place items back', 'Medium Priority', 'success'),
      isDelivery: true,
    });
  }

  // Ready For Delivery
  async getPreparedAndNotOutForDeliveryForToday(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      stateFilter: 'ReadyForDelivery',
      taskTemplate: order => this.createTask(order, 'Send', 'out for delivery', 'Medium Priority', 'success'),
      isDelivery: true,
    });
  }

  // Out For Delivery
  async getAnyOutForDeliveryOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      // dateFilter: Between(
      //   dayjs().startOf('day').toDate(),
      //   dayjs().endOf('day').toDate()
      // ),
      stateFilter: 'OutForDelivery',
      taskTemplate: order => this.createTask(order, 'Finish delivery', '', 'Medium Priority', 'success'),
      isDelivery: true,
    });
  }

  // Could Not Deliver
  async getCouldntDeliverOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks({
      ctx,
      dateFilter: LessThanOrEqual(dayjs().toDate()),
      stateFilter: 'CouldNotDeliver',
      taskTemplate: order =>
        this.createTask(
          order,
          'Place order in warehoust',
          ', Call Customer, Reschedule and change delivery date and set ready for delivery',
          'Medium Priority',
          'success',
        ),
      isDelivery: true,
    });
  }

  // Collected / Delivered
  async getSubItemRejectedDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders({
      ctx,
      dateFilter: LessThanOrEqual(dayjs().endOf('day').toDate()),
      stateFilter: In(['Delivered', 'Collected']),
    });

    const filtered = orders.filter(order =>
      order.lines.some(line =>
        [SubstitutionStates.REMOVED, SubstitutionStates.REJECTED].includes(
          line.customFields?.substitutionState,
        ),
      ),
    );

    return filtered.map(order =>
      this.createTask(
        order,
        'Refund Rejected Substitution Items',
        'through partial refund',
        'Low Priority',
        'success',
      ),
    );
  }

  private async getFilteredOrders({
    ctx,
    dateFilter,
    stateFilter,
    isDelivery,
  }: {
    ctx: RequestContext;
    dateFilter?: FindOperator<Date>;
    stateFilter: FindOperator<string> | string;
    isDelivery?: boolean;
  }): Promise<Order[]> {
    return this.conn
      .getRepository(ctx, Order)
      .createQueryBuilder('order')
      .select(['order.code', 'order.id', 'order.state'])
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
        ] as OrderState[],
      })
      .getMany();
  }

  private getLink(order: Order): string {
    const href = order.state === 'Draft' ? `/admin/orders/draft/${order.id}` : `/admin/orders/${order.id}`;
    return `<a class="button-ghost" href="${href}">
              <span>${order.code}</span>
              <clr-icon shape="arrow right" role="none">
                <svg version="1.1" viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" role="img">
                  <path d="M27.66,15.61,18,6,8.34,15.61A1,1,0,1,0,9.75,17L17,9.81V28.94a1,1,0,1,0,2,0V9.81L26.25,17a1,1,0,0,0,1.41-1.42Z"></path>
                </svg>
              </clr-icon>
            </a>`;
  }

  private createTask(
    order: Order,
    prefix: string,
    suffix: string,
    tag: string,
    colorType: string,
  ): TaskMessage {
    return {
      taskName: `${prefix} ${this.getLink(order)} ${suffix}`.trim(),
      tag: tag as TaskMessage['tag'],
      orderId: order.id,
      state: order.state,
      code: order.code,
      colorType: colorType as TaskMessage['colorType'],
    };
  }
}
