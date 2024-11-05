import gql from 'graphql-tag';

export const adminApiExtensions = gql`
  type Task {
    taskName: String!
    tag: String!
    orderId: ID!
    state: String!
    code: String!
    colorType: String!
  }

  type DeliveryRoutes {
    orders: [Order]!
    url: String!
  }

  input Location {
    lat: String!
    lon: String!
  }

  extend type Query {
    tasks: [Task!]
    deliverableOrders(options: OrderListOptions, location: Location): DeliveryRoutes!
  }
`;
