import { Billing } from "aws-cdk-lib/aws-dynamodb";
import { StagingEnvironment } from "@task/core";

export const TaskDynamoDBs = {
  entities: "entities",
} as const;

export type TaskDynamoDBs = (typeof TaskDynamoDBs)[keyof typeof TaskDynamoDBs];

type TaskCapacityMode = {
  [key in StagingEnvironment]: {
    [key in TaskDynamoDBs]: {
      billing: Billing;
    };
  };
};

export const taskCapacityMode: TaskCapacityMode = {
  development: {
    entities: {
      billing: Billing.onDemand(),
    },
  },
  staging: {
    entities: {
      billing: Billing.onDemand(),
    },
  },
  production: {
    entities: {
      billing: Billing.onDemand(),
    },
  },
};