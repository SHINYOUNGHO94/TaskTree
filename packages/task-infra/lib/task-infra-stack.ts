import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TaskDatabase } from './database/database';
import { Suffix, StagingEnvironment } from '@task/core';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class TaskInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // データベース(DynamoDB)の初期設定
    const databaseProps = {
      stagingEnvironment: StagingEnvironment.development,
      suffix: new Suffix("task-tree"),
      version: "v1",
    };
    const database = new TaskDatabase(this, "TaskDatabase", databaseProps);

    // 既存の Cognito UserPool を ID で参照
    const userPool = cognito.UserPool.fromUserPoolId(this, "ImportedUserPool", "ap-northeast-1_uWKGi9IjG");

    // API Gateway 用の Cognito オーソライザー定義
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "TaskApiAuthorizer", {
      cognitoUserPools: [userPool],
    });

    // Lambda: 会社(Company)作成機能
    const createCompanyFn = new NodejsFunction(this, "CreateCompanyFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/company/createCompany.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: 事業部(Division)作成機能
    const createDivisionFn = new NodejsFunction(this, "CreateDivisionFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/division/createDivision.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: 部署(Department)作成機能
    const createDepartmentFn = new NodejsFunction(this, "CreateDepartmentFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/department/createDepartment.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: チーム(Team)作成機能
    const createTeamFn = new NodejsFunction(this, "CreateTeamFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/team/createTeam.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: ユーザー(User)作成機能
    const createUserFn = new NodejsFunction(this, "CreateUserFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/user/createUser.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });

    // Lambda: タスク一覧取得機能
    const getTasksFn = new NodejsFunction(this, "GetTasksFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/getTasks.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getTasksFn); // 読み取り権限の付与

    // Lambda: タスク作成機能
    const createTaskFn = new NodejsFunction(this, "CreateTaskFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/createTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantWriteData(createTaskFn); // 書き込み権限の付与

    // API Gateway の構築
    const api = new apigateway.RestApi(this, "TaskApi", {
      restApiName: "Task Tree API",
      description: "API for TaskTree management",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      }
    });

    // 組織関連のリソースとメソッドの定義
    const companyResource = api.root.addResource("company");
    companyResource.addMethod("POST", new apigateway.LambdaIntegration(createCompanyFn));

    const divisionResource = api.root.addResource("division");
    divisionResource.addMethod("POST", new apigateway.LambdaIntegration(createDivisionFn));

    const departmentResource = api.root.addResource("department");
    departmentResource.addMethod("POST", new apigateway.LambdaIntegration(createDepartmentFn));

    const teamResource = api.root.addResource("team");
    teamResource.addMethod("POST", new apigateway.LambdaIntegration(createTeamFn));

    const userResource = api.root.addResource("user");
    userResource.addMethod("POST", new apigateway.LambdaIntegration(createUserFn));

    // タスク関連のリソース定義 (認証が必要)
    const tasksResource = api.root.addResource("tasks");
    tasksResource.addMethod("GET", new apigateway.LambdaIntegration(getTasksFn), {
      authorizer,
    });
    tasksResource.addMethod("POST", new apigateway.LambdaIntegration(createTaskFn), {
      authorizer,
    });
  }
}
