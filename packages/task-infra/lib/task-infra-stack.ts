import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TaskDatabase } from './database/database';
import { Suffix, StagingEnvironment } from '@task/core';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class TaskInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const databaseProps = {
      stagingEnvironment: StagingEnvironment.development,
      suffix: new Suffix("task-tree"),
      version: "v1",
    };
    const database = new TaskDatabase(this, "TaskDatabase", databaseProps);

    // Lambda: Create Company
    const createCompanyFn = new NodejsFunction(this, "CreateCompanyFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/company/createCompany.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: Create Division
    const createDivisionFn = new NodejsFunction(this, "CreateDivisionFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/division/createDivision.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: Create Department
    const createDepartmentFn = new NodejsFunction(this, "CreateDepartmentFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/department/createDepartment.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: Create Team
    const createTeamFn = new NodejsFunction(this, "CreateTeamFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/team/createTeam.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // API Gateway
    const api = new cdk.aws_apigateway.RestApi(this, "TaskApi", {
      restApiName: "Task Tree API",
      description: "API for TaskTree management",
    });

    const companyResource = api.root.addResource("company");
    companyResource.addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(createCompanyFn));

    const divisionResource = api.root.addResource("division");
    divisionResource.addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(createDivisionFn));

    const departmentResource = api.root.addResource("department");
    departmentResource.addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(createDepartmentFn));

    const teamResource = api.root.addResource("team");
    teamResource.addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(createTeamFn));

    const userResource = api.root.addResource("user");
    userResource.addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(createUserFn));
  }
}
