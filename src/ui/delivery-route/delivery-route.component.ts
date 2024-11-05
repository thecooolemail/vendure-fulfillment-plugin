import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { DataService, NotificationService, SharedModule, SortOrder } from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  mergeMap,
  shareReplay,
} from 'rxjs';

type Timeframe = 'day' | 'week' | 'month';

function getOrdinal(day: number) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

declare var window: Window;
declare var navigator: any;

const GET_LATEST_ORDERS = gql`
  query GetLatestOrders($options: OrderListOptions, $location: Location) {
    deliverableOrders(options: $options, location: $location) {
      orders {
        id
        type
        orderPlacedAt
        code
        state
        total
        totalWithTax
        currencyCode
      }
      url
    }
  }
`;

@Component({
  selector: 'delivery-route',
  templateUrl: './delivery-route.component.html',
  styleUrls: ['./delivery-route.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharedModule],
  standalone: true,
})
export class DeliveryRouteComponent {
  today = new Date();
  yesterday = new Date(new Date().setDate(this.today.getDate() - 1));
  todayPlus1 = new Date(new Date().setDate(this.today.getDate() + 1));
  todayPlus2 = new Date(new Date().setDate(this.today.getDate() + 2));
  todayPlus3 = new Date(new Date().setDate(this.today.getDate() + 3));
  todayPlus4 = new Date(new Date().setDate(this.today.getDate() + 4));
  todayPlus5 = new Date(new Date().setDate(this.today.getDate() + 5));
  latestOrders$: Observable<any>;
  dateSelection$ = new BehaviorSubject<{ timeframe: Timeframe; date?: Date }>({
    timeframe: 'day',
    date: this.today,
  });
  location$ = new BehaviorSubject<{ lat: string; lon: string }>({
    lat: '0.0',
    lon: '0.0',
  });
  currentLocationFetched: boolean = false;
  deliveryTypeSelection$ = new BehaviorSubject<boolean>(true);
  dateRange$: Observable<{ start: Date; end: Date }>;
  constructor(
    private dataService: DataService,
    private ns: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {
    dayjs.extend(customParseFormat);
    this.dateRange$ = this.dateSelection$.pipe(
      distinctUntilChanged(),
      map(selection => ({
        start: dayjs(selection.date).startOf(selection.timeframe).toDate(),
        end: dayjs(selection.date).endOf(selection.timeframe).toDate(),
      })),
      shareReplay(1),
    );
    this.latestOrders$ = combineLatest([
      this.dateRange$,
      this.deliveryTypeSelection$.pipe(),
      this.location$.pipe(),
    ]).pipe(
      mergeMap(([dateRange, isDelivery, location]) => {
        return this.dataService
          .query(GET_LATEST_ORDERS, {
            options: {
              take: 10,
              filter: {
                active: { eq: false },
                Delivery_Collection_Date: {
                  between: {
                    start: dateRange.start.toISOString(),
                    end: dateRange.end.toISOString(),
                  },
                },
                state: { notIn: ['Cancelled', 'Draft'] },
                Is_Delivery: { eq: isDelivery },
                google_place_id: {
                  isNull: false,
                  notEq: '',
                },
              },
              sort: {
                orderPlacedAt: SortOrder.DESC,
              },
            },
            location,
          })
          .refetchOnChannelChange()
          .mapStream((data: any) => data.deliverableOrders);
      }),
    );

    if ((navigator as any).geolocation) {
      const component = this;
      navigator.geolocation.getCurrentPosition(function (position: any) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        component.location$.next({ lat: `${latitude}`, lon: `${longitude}` });
        component.currentLocationFetched = true;
        component.cdr.markForCheck();
      });
      setTimeout(() => {
        if (!component.currentLocationFetched) {
          component.ns.error("Couldn't find your current location");
          throw new Error("Couldn't find your current location");
        }
      }, 10 * 1000);
    } else {
      this.ns.error('Geolocation is not supported by this browser.');
    }
  }

  async openDeliveryRoute() {
    this.latestOrders$.subscribe(data => {
      if (data.url && data.orders.length) {
        (window as any).open(data.url);
      }
    });
  }

  format(date: Date) {
    return dayjs(date).format('D') + getOrdinal(dayjs(date).date());
  }
}
