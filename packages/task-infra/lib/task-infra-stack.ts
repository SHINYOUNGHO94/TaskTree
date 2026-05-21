import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Suffix, StagingEnvironment } from '@task/core';
import { Construct } from 'constructs';
import * as path from 'path';
import { TaskDatabase } from './database/database';

export class TaskInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new TaskDatabase(this, 'TaskDatabase', {
      stagingEnvironment: StagingEnvironment.development,
      suffix: new Suffix('task-tree'),
      version: 'v1',
    });

    const tableArn = database.entities.tableArn;
    const tableIndexesArn = `${tableArn}/index/*`;

    const grantTableRead = (fn: NodejsFunction) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query'],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    const grantTableScanRead = (fn: NodejsFunction) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    const grantTableCreate = (fn: NodejsFunction) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [tableArn],
      }));
    };

    const grantTaskMutation = (fn: NodejsFunction, writeActions: string[]) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan', ...writeActions],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    const postConfirmationFn = new NodejsFunction(this, 'PostConfirmationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/auth/postConfirmation.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(postConfirmationFn);

    const userPool = new cognito.UserPool(this, 'TaskUserPool', {
      userPoolName: 'task-tree-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
        nickname: {
          required: false,
          mutable: true,
        },
        profilePage: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        postConfirmation: postConfirmationFn,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'TaskUserPoolClient', {
      userPool,
      userPoolClientName: 'task-tree-web-client',
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      disableOAuth: true,
      preventUserExistenceErrors: true,
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'TaskApiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const createCompanyFn = new NodejsFunction(this, 'CreateCompanyFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/createCompany.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(createCompanyFn);

    const createDivisionFn = new NodejsFunction(this, 'CreateDivisionFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/division/createDivision.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(createDivisionFn);

    const getDivisionsFn = new NodejsFunction(this, 'GetDivisionsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/division/getDivisions.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getDivisionsFn);

    const createDepartmentFn = new NodejsFunction(this, 'CreateDepartmentFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/department/createDepartment.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(createDepartmentFn);

    const getDepartmentsFn = new NodejsFunction(this, 'GetDepartmentsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/department/getDepartments.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getDepartmentsFn);

    const createTeamFn = new NodejsFunction(this, 'CreateTeamFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/team/createTeam.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(createTeamFn);

    const getTeamsFn = new NodejsFunction(this, 'GetTeamsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/team/getTeams.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getTeamsFn);

    const createUserFn = new NodejsFunction(this, 'CreateUserFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/createUser.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(createUserFn);

    const inviteUserFn = new NodejsFunction(this, 'InviteUserFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/inviteUser.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    grantTaskMutation(inviteUserFn, ['dynamodb:PutItem']);
    inviteUserFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminCreateUser'],
      resources: [userPool.userPoolArn],
    }));

    const getCompanyUsersFn = new NodejsFunction(this, 'GetCompanyUsersFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/getCompanyUsers.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCompanyUsersFn);

    const getUserProfileFn = new NodejsFunction(this, 'GetUserProfileFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/getUserProfile.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getUserProfileFn);

    const getTasksFn = new NodejsFunction(this, 'GetTasksFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/task/getTasks.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableScanRead(getTasksFn);

    const createTaskFn = new NodejsFunction(this, 'CreateTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/task/createTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(createTaskFn);
    grantTableCreate(createTaskFn);

    const getTaskFn = new NodejsFunction(this, 'GetTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/task/getTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableScanRead(getTaskFn);

    const updateTaskFn = new NodejsFunction(this, 'UpdateTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/task/updateTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTaskMutation(updateTaskFn, ['dynamodb:PutItem']);

    const deleteTaskFn = new NodejsFunction(this, 'DeleteTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/task/deleteTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTaskMutation(deleteTaskFn, ['dynamodb:DeleteItem']);

    const createCaseFn = new NodejsFunction(this, 'CreateCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(createCaseFn);
    grantTableCreate(createCaseFn);

    const getCasesFn = new NodejsFunction(this, 'GetCasesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCases.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCasesFn);

    const api = new apigateway.RestApi(this, 'TaskApi', {
      restApiName: 'Task Tree API',
      description: 'API for TaskTree management - v2',
      deployOptions: {
        stageName: 'prod',
        variables: {
          deploymentTrigger: new Date().toISOString(),
        },
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const companyResource = api.root.addResource('company');
    companyResource.addMethod('POST', new apigateway.LambdaIntegration(createCompanyFn));

    const divisionResource = api.root.addResource('division');
    divisionResource.addMethod('POST', new apigateway.LambdaIntegration(createDivisionFn));
    divisionResource.addMethod('GET', new apigateway.LambdaIntegration(getDivisionsFn), { authorizer });

    const departmentResource = api.root.addResource('department');
    departmentResource.addMethod('POST', new apigateway.LambdaIntegration(createDepartmentFn), { authorizer });
    departmentResource.addMethod('GET', new apigateway.LambdaIntegration(getDepartmentsFn), { authorizer });

    const teamResource = api.root.addResource('team');
    teamResource.addMethod('POST', new apigateway.LambdaIntegration(createTeamFn), { authorizer });
    teamResource.addMethod('GET', new apigateway.LambdaIntegration(getTeamsFn), { authorizer });

    const userResource = api.root.addResource('user');
    userResource.addMethod('POST', new apigateway.LambdaIntegration(createUserFn));
    userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserProfileFn), { authorizer });

    const userInviteResource = userResource.addResource('invite');
    userInviteResource.addMethod('POST', new apigateway.LambdaIntegration(inviteUserFn), { authorizer });

    const companyUsersResource = userResource.addResource('company-users');
    companyUsersResource.addMethod('GET', new apigateway.LambdaIntegration(getCompanyUsersFn), { authorizer });

    const casesResource = api.root.addResource('cases');
    casesResource.addMethod('GET', new apigateway.LambdaIntegration(getCasesFn), { authorizer });
    casesResource.addMethod('POST', new apigateway.LambdaIntegration(createCaseFn), { authorizer });

    const tasksResource = api.root.addResource('tasks');
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(getTasksFn), { authorizer });
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(createTaskFn), { authorizer });

    const tasksIdResource = tasksResource.addResource('{id}');
    tasksIdResource.addMethod('GET', new apigateway.LambdaIntegration(getTaskFn), { authorizer });
    tasksIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTaskFn), { authorizer });
    tasksIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTaskFn), { authorizer });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Set this value as NEXT_PUBLIC_COGNITO_USER_POOL_ID.',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Set this value as NEXT_PUBLIC_COGNITO_CLIENT_ID.',
    });

    new cdk.CfnOutput(this, 'TaskApiUrl', {
      value: api.url,
      description: 'Set this value as NEXT_PUBLIC_API_URL.',
    });
  }
}
