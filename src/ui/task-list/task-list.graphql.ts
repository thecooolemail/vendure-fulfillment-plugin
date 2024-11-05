import { gql } from 'graphql-tag';

export const getTasks = gql`
  query GetTasks {
    tasks {
      taskName
      tag
      orderId
      state
      code
      colorType
    }
  }
`;
