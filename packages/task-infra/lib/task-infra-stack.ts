import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TaskDatabase } from './database/database';
import { Suffix, StagingEnvironment } from '@task/core';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from "aws-cdk-lib/aws-iam";

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

    // Lambda: 部署一覧取得機能
    const getDepartmentsFn = new NodejsFunction(this, "GetDepartmentsFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/department/getDepartments.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getDepartmentsFn);

    // Lambda: チーム一覧取得機能
    const getTeamsFn = new NodejsFunction(this, "GetTeamsFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/team/getTeams.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getTeamsFn);

    // Lambda: ユーザー(User)作成機能
    const createUserFn = new NodejsFunction(this, "CreateUserFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/user/createUser.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantWriteData(createUserFn);

    // Lambda: ユーザー招待機能
    const inviteUserFn = new NodejsFunction(this, "InviteUserFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/user/inviteUser.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    database.entities.grantReadWriteData(inviteUserFn);
    inviteUserFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["cognito-idp:AdminCreateUser"],
      resources: [userPool.userPoolArn],
    }));

    // Lambda: 会社ユーザー一覧取得機能
    const getCompanyUsersFn = new NodejsFunction(this, "GetCompanyUsersFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/user/getCompanyUsers.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getCompanyUsersFn);

    // Lambda: サインアップ後の自動オンボーディング (Post Confirmation)
    const postConfirmationFn = new NodejsFunction(this, "PostConfirmationFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/auth/postConfirmation.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    postConfirmationFn.addPermission("CognitoInvoke", {
      principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
      sourceArn: userPool.userPoolArn,
    });
    database.entities.grantWriteData(postConfirmationFn);
    database.entities.grantWriteData(createCompanyFn);
    database.entities.grantWriteData(createDepartmentFn);
    database.entities.grantWriteData(createTeamFn);

    // Lambda: ユーザープロファイル取得機能
    const getUserProfileFn = new NodejsFunction(this, "GetUserProfileFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/user/getUserProfile.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getUserProfileFn);

    // Lambda: タスク一覧取得機能
    const getTasksFn = new NodejsFunction(this, "GetTasksFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/getTasks.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getTasksFn);

    // Lambda: タスク作成機能
    const createTaskFn = new NodejsFunction(this, "CreateTaskFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/createTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantWriteData(createTaskFn);

    // Lambda: タスク詳細取得機能
    const getTaskFn = new NodejsFunction(this, "GetTaskFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/getTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadData(getTaskFn);

    // Lambda: タスク更新機能
    const updateTaskFn = new NodejsFunction(this, "UpdateTaskFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/updateTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadWriteData(updateTaskFn);

    // Lambda: タスク削除機能
    const deleteTaskFn = new NodejsFunction(this, "DeleteTaskFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../task-api/src/aws/handlers/task/deleteTask.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    database.entities.grantReadWriteData(deleteTaskFn);

    // API Gateway の構築
    const api = new apigateway.RestApi(this, "TaskApi", {
      restApiName: "Task Tree API",
      description: "API for TaskTree management - v2",
      deployOptions: {
        stageName: "prod",
        variables: {
          deploymentTrigger: new Date().toISOString()
        }
      },
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
    departmentResource.addMethod("POST", new apigateway.LambdaIntegration(createDepartmentFn), { authorizer });
    departmentResource.addMethod("GET", new apigateway.LambdaIntegration(getDepartmentsFn), { authorizer });

    const teamResource = api.root.addResource("team");
    teamResource.addMethod("POST", new apigateway.LambdaIntegration(createTeamFn), { authorizer });
    teamResource.addMethod("GET", new apigateway.LambdaIntegration(getTeamsFn), { authorizer });

    const userResource = api.root.addResource("user");
    userResource.addMethod("POST", new apigateway.LambdaIntegration(createUserFn));
    userResource.addMethod("GET", new apigateway.LambdaIntegration(getUserProfileFn), {
      authorizer,
    });

    const userInviteResource = userResource.addResource("invite");
    userInviteResource.addMethod("POST", new apigateway.LambdaIntegration(inviteUserFn), {
      authorizer,
    });

    const companyUsersResource = userResource.addResource("company-users");
    companyUsersResource.addMethod("GET", new apigateway.LambdaIntegration(getCompanyUsersFn), {
      authorizer,
    });

    // タスク関連のリソース定義 (認証が必要)
    const tasksResource = api.root.addResource("tasks");
    tasksResource.addMethod("GET", new apigateway.LambdaIntegration(getTasksFn), {
      authorizer,
    });
    tasksResource.addMethod("POST", new apigateway.LambdaIntegration(createTaskFn), {
      authorizer,
    });

    // タスク詳細/更新/削除のリソース ( /tasks/{id} )
    const tasksIdResource = tasksResource.addResource("{id}");
    tasksIdResource.addMethod("GET", new apigateway.LambdaIntegration(getTaskFn), {
      authorizer,
    });
    tasksIdResource.addMethod("PUT", new apigateway.LambdaIntegration(updateTaskFn), {
      authorizer,
    });
    tasksIdResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteTaskFn), {
      authorizer,
    });
  }
}
