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
      this.getFailedDeliveredOrders,
      this.getNotDeliveredOrders,
      this.getNotPreparedForToday,
      this.getPreparedAndNotOutForDeliveryForToday,
      this.getReadyForCollectionOrders,
      this.getNotPreparedForTomorrow,
      this.getReadyForCollectionOrders,
      this.getSubItemRejectedDeliveredOrders,
      this.getAnyOutForDeliveryForToday,
    ];

    const allTasks = await Promise.all(taskGroups.map(task => task.call(this, ctx)));
    return allTasks.flat();
  }

  private async fetchAndFormatTasks(
    ctx: RequestContext,
    dateFilter: FindOperator<Date>,
    stateFilter: FindOperator<string> | string,
    taskTemplate: (order: Order) => TaskMessage,
    isDelivery?: boolean,
  ): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(ctx, dateFilter, stateFilter, isDelivery);
    return orders.map(taskTemplate);
  }

  async getNotPreparedForTomorrow(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      Between(dayjs().add(1, 'day').startOf('day').toDate(), dayjs().add(1, 'day').endOf('day').toDate()),
      In(['AwaitingPrep', 'Preparing']),
      order => this.createTask(order, `Prepare`, 'for tomorrow', 'Low Priority', 'success'),
    );
  }

  async getNotPreparedForToday(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      In(['AwaitingPrep', 'Preparing']),
      order => this.createTask(order, `Prepare`, 'for today', 'High Priority', 'error'),
    );
  }

  async getReadyForCollectionOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      'ReadyForCollection',
      order => this.createTask(order, '', 'will be collected today', 'Low Priority', 'success'),
    );
  }

  async getReadyForCollectionOrdersPast24h(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      LessThanOrEqual(dayjs().subtract(1, 'days').toDate()),
      'ReadyForCollection',
      order => this.createTask(order, 'No collection', ', call customer', 'Medium Priority', 'success'),
    );
  }

  async getReadyForCollectionOrdersPast48h(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      LessThanOrEqual(dayjs().subtract(2, 'days').toDate()),
      'ReadyForCollection',
      order =>
        this.createTask(
          order,
          'No collection',
          ', if cant reach customer, cancel and refund order',
          'Medium Priority',
          'success',
        ),
    );
  }

  async getFailedDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      LessThanOrEqual(dayjs().toDate()),
      'CouldNotDeliver',
      order =>
        this.createTask(
          order,
          'Call Customer and Reschedule',
          ", refund order if can't contact customer",
          'High Priority',
          'error',
        ),
      true,
    );
  }

  async getPreparedAndNotOutForDeliveryForToday(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      In(['ReadyForDelivery', 'Prepared']),
      order => this.createTask(order, 'Send', 'out for delivery', 'Medium Priority', 'success'),
      true,
    );
  }

  async getNotDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      LessThanOrEqual(dayjs().subtract(1, 'days').toDate()),
      'ReadyForDelivery',
      order => this.createTask(order, '', 'passed delivery date, call customer', 'High Priority', 'error'),
      true,
    );
  }

  async getAnyOutForDeliveryForToday(ctx: RequestContext): Promise<TaskMessage[]> {
    return this.fetchAndFormatTasks(
      ctx,
      Between(dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()),
      'OutForDelivery',
      order => this.createTask(order, 'Finish delivery', '', 'In Progress', 'warning'),
      true,
    );
  }

  async getSubItemRejectedDeliveredOrders(ctx: RequestContext): Promise<TaskMessage[]> {
    const orders = await this.getFilteredOrders(
      ctx,
      LessThanOrEqual(dayjs().endOf('day').toDate()),
      In(['Delivered', 'Collected']),
    );

    const filtered = orders.filter(order =>
      order.lines.some(line =>
        [SubstitutionStates.REMOVED, SubstitutionStates.REJECTED].includes(
          line.customFields?.substitutionState,
        ),
      ),
    );

    return filtered.map(order =>
      this.createTask(order, 'Refund Sub Items', 'and partial refund order', 'Low Priority', 'success'),
    );
  }

  private async getFilteredOrders(
    ctx: RequestContext,
    dateFilter: FindOperator<Date>,
    stateFilter: FindOperator<string> | string,
    isDelivery?: boolean,
  ): Promise<Order[]> {
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
          'Delivered',
          'Cancelled',
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
