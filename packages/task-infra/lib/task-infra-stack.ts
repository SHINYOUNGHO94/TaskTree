import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
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

    const grantTableCreate = (fn: NodejsFunction) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [tableArn],
      }));
    };

    const grantTaskMutation = (fn: NodejsFunction, writeActions: string[]) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', ...writeActions],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    const grantCaseMutation = (fn: NodejsFunction, writeActions: string[]) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', ...writeActions],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    const grantOrgMutation = (fn: NodejsFunction, writeActions: string[]) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:Query', ...writeActions],
        resources: [tableArn, tableIndexesArn],
      }));
    };

    // APP_ORIGIN env var restricts S3 CORS to the deployed app domain (e.g. https://app.example.com).
    const appOrigin = process.env.APP_ORIGIN;
    const s3CorsAllowedOrigins = appOrigin
      ? appOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const caseImagesBucket = new s3.Bucket(this, 'CaseImagesBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: s3CorsAllowedOrigins,
          allowedMethods: [s3.HttpMethods.POST, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    const postConfirmationFn = new NodejsFunction(this, 'PostConfirmationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/auth/postConfirmation.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableCreate(postConfirmationFn);

    const postAuthenticationFn = new NodejsFunction(this, 'PostAuthenticationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/auth/postAuthentication.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(postAuthenticationFn, ['dynamodb:PutItem', 'dynamodb:Query']);

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
        postAuthentication: postAuthenticationFn,
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

    const searchCompaniesFn = new NodejsFunction(this, 'SearchCompaniesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/searchCompanies.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(searchCompaniesFn);

    const inviteCompanyByEmailFn = new NodejsFunction(this, 'InviteCompanyByEmailFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/inviteCompanyByEmail.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    grantCaseMutation(inviteCompanyByEmailFn, ['dynamodb:PutItem']);
    inviteCompanyByEmailFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminCreateUser'],
      resources: [userPool.userPoolArn],
    }));

    const getMyEmailInvitationsFn = new NodejsFunction(this, 'GetMyEmailInvitationsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/getMyEmailInvitations.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getMyEmailInvitationsFn);

    const acceptEmailInvitationFn = new NodejsFunction(this, 'AcceptEmailInvitationFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/acceptEmailInvitation.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(acceptEmailInvitationFn, ['dynamodb:PutItem', 'dynamodb:UpdateItem']);

    const createDivisionFn = new NodejsFunction(this, 'CreateDivisionFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/division/createDivision.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(createDivisionFn);
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
    grantTableRead(createDepartmentFn);
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
    grantTableRead(createTeamFn);
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

    const updateDivisionFn = new NodejsFunction(this, 'UpdateDivisionFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/division/updateDivision.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(updateDivisionFn, ['dynamodb:UpdateItem']);

    const deleteDivisionFn = new NodejsFunction(this, 'DeleteDivisionFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/division/deleteDivision.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(deleteDivisionFn, ['dynamodb:DeleteItem']);

    const updateDepartmentFn = new NodejsFunction(this, 'UpdateDepartmentFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/department/updateDepartment.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(updateDepartmentFn, ['dynamodb:UpdateItem']);

    const deleteDepartmentFn = new NodejsFunction(this, 'DeleteDepartmentFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/department/deleteDepartment.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(deleteDepartmentFn, ['dynamodb:DeleteItem']);

    const updateTeamFn = new NodejsFunction(this, 'UpdateTeamFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/team/updateTeam.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(updateTeamFn, ['dynamodb:UpdateItem']);

    const deleteTeamFn = new NodejsFunction(this, 'DeleteTeamFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/team/deleteTeam.ts'),
      handler: 'handler',
      environment: { TABLE_NAME: database.entities.tableName },
    });
    grantOrgMutation(deleteTeamFn, ['dynamodb:DeleteItem']);

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

    const deleteUserFn = new NodejsFunction(this, 'DeleteUserFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/deleteUser.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    grantOrgMutation(deleteUserFn, ['dynamodb:DeleteItem']);
    deleteUserFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminDeleteUser'],
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

    const updateUserProfileFn = new NodejsFunction(this, 'UpdateUserProfileFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/user/updateUserProfile.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateUserProfileFn, ['dynamodb:UpdateItem', 'dynamodb:Query']);

    const updateCompanyFn = new NodejsFunction(this, 'UpdateCompanyFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/company/updateCompany.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateCompanyFn, ['dynamodb:UpdateItem', 'dynamodb:Query']);

    const createCaseFn = new NodejsFunction(this, 'CreateCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(createCaseFn, ['dynamodb:PutItem', 'dynamodb:TransactWriteItems']);

    const getCasesFn = new NodejsFunction(this, 'GetCasesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCases.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCasesFn);

    const getCaseFn = new NodejsFunction(this, 'GetCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseFn);

    const updateCaseFn = new NodejsFunction(this, 'UpdateCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/updateCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateCaseFn, ['dynamodb:PutItem', 'dynamodb:TransactWriteItems']);

    const getCaseTasksFn = new NodejsFunction(this, 'GetCaseTasksFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseTasks.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseTasksFn);

    const createCaseTaskFn = new NodejsFunction(this, 'CreateCaseTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createCaseTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(createCaseTaskFn);
    grantTableCreate(createCaseTaskFn);

    const updateCaseTaskFn = new NodejsFunction(this, 'UpdateCaseTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/updateCaseTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateCaseTaskFn, ['dynamodb:PutItem']);

    const deleteCaseTaskFn = new NodejsFunction(this, 'DeleteCaseTaskFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/deleteCaseTask.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(deleteCaseTaskFn, ['dynamodb:DeleteItem', 'dynamodb:PutItem']);

    const deleteCaseFn = new NodejsFunction(this, 'DeleteCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/deleteCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(deleteCaseFn, ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchWriteItem']);

    const getCaseHistoryFn = new NodejsFunction(this, 'GetCaseHistoryFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseHistory.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseHistoryFn);

    const getCaseCommentsFn = new NodejsFunction(this, 'GetCaseCommentsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseComments.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseCommentsFn);

    const createCaseCommentFn = new NodejsFunction(this, 'CreateCaseCommentFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createCaseComment.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(createCaseCommentFn, ['dynamodb:PutItem']);

    const getUploadPresignedUrlFn = new NodejsFunction(this, 'GetUploadPresignedUrlFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/upload/getUploadPresignedUrl.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantTableRead(getUploadPresignedUrlFn);
    caseImagesBucket.grantPut(getUploadPresignedUrlFn);

    const getReadPresignedUrlFn = new NodejsFunction(this, 'GetReadPresignedUrlFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/upload/getReadPresignedUrl.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantTableRead(getReadPresignedUrlFn);
    caseImagesBucket.grantRead(getReadPresignedUrlFn);

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
    companyResource.addMethod('PUT', new apigateway.LambdaIntegration(updateCompanyFn), { authorizer });

    const companySearchResource = companyResource.addResource('search');
    companySearchResource.addMethod('GET', new apigateway.LambdaIntegration(searchCompaniesFn), { authorizer });

    const companyInviteByEmailResource = companyResource.addResource('invite-by-email');
    companyInviteByEmailResource.addMethod('POST', new apigateway.LambdaIntegration(inviteCompanyByEmailFn), { authorizer });

    const companyEmailInvitationsResource = companyResource.addResource('email-invitations');
    companyEmailInvitationsResource.addMethod('GET', new apigateway.LambdaIntegration(getMyEmailInvitationsFn), { authorizer });

    const emailInvitationIdResource = companyEmailInvitationsResource.addResource('{invitationId}');
    const emailInvitationAcceptResource = emailInvitationIdResource.addResource('accept');
    emailInvitationAcceptResource.addMethod('POST', new apigateway.LambdaIntegration(acceptEmailInvitationFn), { authorizer });

    const divisionResource = api.root.addResource('division');
    divisionResource.addMethod('POST', new apigateway.LambdaIntegration(createDivisionFn), { authorizer });
    divisionResource.addMethod('GET', new apigateway.LambdaIntegration(getDivisionsFn), { authorizer });

    const divisionIdResource = divisionResource.addResource('{id}');
    divisionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateDivisionFn), { authorizer });
    divisionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteDivisionFn), { authorizer });

    const departmentResource = api.root.addResource('department');
    departmentResource.addMethod('POST', new apigateway.LambdaIntegration(createDepartmentFn), { authorizer });
    departmentResource.addMethod('GET', new apigateway.LambdaIntegration(getDepartmentsFn), { authorizer });

    const departmentIdResource = departmentResource.addResource('{id}');
    departmentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateDepartmentFn), { authorizer });
    departmentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteDepartmentFn), { authorizer });

    const teamResource = api.root.addResource('team');
    teamResource.addMethod('POST', new apigateway.LambdaIntegration(createTeamFn), { authorizer });
    teamResource.addMethod('GET', new apigateway.LambdaIntegration(getTeamsFn), { authorizer });

    const teamIdResource = teamResource.addResource('{id}');
    teamIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTeamFn), { authorizer });
    teamIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTeamFn), { authorizer });

    const userResource = api.root.addResource('user');
    userResource.addMethod('POST', new apigateway.LambdaIntegration(createUserFn));
    userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserProfileFn), { authorizer });

    const userProfileResource = userResource.addResource('profile');
    userProfileResource.addMethod('PUT', new apigateway.LambdaIntegration(updateUserProfileFn), { authorizer });

    const userInviteResource = userResource.addResource('invite');
    userInviteResource.addMethod('POST', new apigateway.LambdaIntegration(inviteUserFn), { authorizer });

    const userIdResource = userResource.addResource('{id}');
    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUserFn), { authorizer });

    const companyUsersResource = userResource.addResource('company-users');
    companyUsersResource.addMethod('GET', new apigateway.LambdaIntegration(getCompanyUsersFn), { authorizer });

    const casesResource = api.root.addResource('cases');
    casesResource.addMethod('GET', new apigateway.LambdaIntegration(getCasesFn), { authorizer });
    casesResource.addMethod('POST', new apigateway.LambdaIntegration(createCaseFn), { authorizer });

    const caseIdResource = casesResource.addResource('{id}');
    caseIdResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseFn), { authorizer });
    caseIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateCaseFn), { authorizer });
    caseIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteCaseFn), { authorizer });

    const caseTasksResource = caseIdResource.addResource('tasks');
    caseTasksResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseTasksFn), { authorizer });
    caseTasksResource.addMethod('POST', new apigateway.LambdaIntegration(createCaseTaskFn), { authorizer });

    const caseTaskIdResource = caseTasksResource.addResource('{taskId}');
    caseTaskIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateCaseTaskFn), { authorizer });
    caseTaskIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteCaseTaskFn), { authorizer });

    const caseHistoryResource = caseIdResource.addResource('history');
    caseHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseHistoryFn), { authorizer });

    const caseCommentsResource = caseIdResource.addResource('comments');
    caseCommentsResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseCommentsFn), { authorizer });
    caseCommentsResource.addMethod('POST', new apigateway.LambdaIntegration(createCaseCommentFn), { authorizer });

    const getCaseClaimRequestsFn = new NodejsFunction(this, 'GetCaseClaimRequestsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseClaimRequests.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseClaimRequestsFn);

    const createCaseClaimRequestFn = new NodejsFunction(this, 'CreateCaseClaimRequestFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createCaseClaimRequest.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(createCaseClaimRequestFn, ['dynamodb:PutItem']);

    const updateCaseClaimRequestFn = new NodejsFunction(this, 'UpdateCaseClaimRequestFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/updateCaseClaimRequest.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateCaseClaimRequestFn, ['dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:TransactWriteItems']);

    const caseClaimRequestsResource = caseIdResource.addResource('claim-requests');
    caseClaimRequestsResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseClaimRequestsFn), { authorizer });
    caseClaimRequestsResource.addMethod('POST', new apigateway.LambdaIntegration(createCaseClaimRequestFn), { authorizer });

    const caseClaimRequestIdResource = caseClaimRequestsResource.addResource('{claimRequestId}');
    caseClaimRequestIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateCaseClaimRequestFn), { authorizer });

    const getChildCasesFn = new NodejsFunction(this, 'GetChildCasesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getChildCases.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getChildCasesFn);

    const createChildCaseFn = new NodejsFunction(this, 'CreateChildCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/createChildCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(createChildCaseFn, ['dynamodb:PutItem', 'dynamodb:TransactWriteItems']);

    const caseChildrenResource = caseIdResource.addResource('children');
    caseChildrenResource.addMethod('GET', new apigateway.LambdaIntegration(getChildCasesFn), { authorizer });
    caseChildrenResource.addMethod('POST', new apigateway.LambdaIntegration(createChildCaseFn), { authorizer });

    const inviteParticipantCompanyFn = new NodejsFunction(this, 'InviteParticipantCompanyFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/inviteParticipantCompany.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(inviteParticipantCompanyFn, ['dynamodb:PutItem']);

    const getParticipantCompaniesFn = new NodejsFunction(this, 'GetParticipantCompaniesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getParticipantCompanies.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getParticipantCompaniesFn);

    const getParticipantCompanyInvitationsFn = new NodejsFunction(this, 'GetParticipantCompanyInvitationsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getParticipantCompanyInvitations.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getParticipantCompanyInvitationsFn);

    const updateParticipantCompanyStatusFn = new NodejsFunction(this, 'UpdateParticipantCompanyStatusFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/updateParticipantCompanyStatus.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(updateParticipantCompanyStatusFn, ['dynamodb:PutItem']);

    const caseParticipantCompaniesResource = caseIdResource.addResource('participant-companies');
    caseParticipantCompaniesResource.addMethod('GET', new apigateway.LambdaIntegration(getParticipantCompaniesFn), { authorizer });
    caseParticipantCompaniesResource.addMethod('POST', new apigateway.LambdaIntegration(inviteParticipantCompanyFn), { authorizer });

    const caseParticipantCompanyIdResource = caseParticipantCompaniesResource.addResource('{participantCompanyId}');
    caseParticipantCompanyIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateParticipantCompanyStatusFn), { authorizer });

    const participantCompanyInvitationsResource = casesResource.addResource('participant-company-invitations');
    participantCompanyInvitationsResource.addMethod('GET', new apigateway.LambdaIntegration(getParticipantCompanyInvitationsFn), { authorizer });

    const getSentParticipantCompanyInvitationsFn = new NodejsFunction(this, 'GetSentParticipantCompanyInvitationsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getSentParticipantCompanyInvitations.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getSentParticipantCompanyInvitationsFn);

    const sentParticipantCompanyInvitationsResource = casesResource.addResource('participant-company-sent-invitations');
    sentParticipantCompanyInvitationsResource.addMethod('GET', new apigateway.LambdaIntegration(getSentParticipantCompanyInvitationsFn), { authorizer });

    const clientReviewCaseFn = new NodejsFunction(this, 'ClientReviewCaseFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/clientReviewCase.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantCaseMutation(clientReviewCaseFn, ['dynamodb:PutItem', 'dynamodb:TransactWriteItems']);

    const caseClientReviewResource = caseIdResource.addResource('client-review');
    caseClientReviewResource.addMethod('PUT', new apigateway.LambdaIntegration(clientReviewCaseFn), { authorizer });

    const getCaseFilesFn = new NodejsFunction(this, 'GetCaseFilesFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseFiles.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getCaseFilesFn);

    const getCaseFileUploadUrlFn = new NodejsFunction(this, 'GetCaseFileUploadUrlFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseFileUploadUrl.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantTableRead(getCaseFileUploadUrlFn);
    getCaseFileUploadUrlFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${caseImagesBucket.bucketArn}/*`],
    }));

    const confirmCaseFileUploadFn = new NodejsFunction(this, 'ConfirmCaseFileUploadFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/confirmCaseFileUpload.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantCaseMutation(confirmCaseFileUploadFn, ['dynamodb:PutItem']);
    confirmCaseFileUploadFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${caseImagesBucket.bucketArn}/*`],
    }));

    const getCaseFileDownloadUrlFn = new NodejsFunction(this, 'GetCaseFileDownloadUrlFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/getCaseFileDownloadUrl.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantTableRead(getCaseFileDownloadUrlFn);
    getCaseFileDownloadUrlFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${caseImagesBucket.bucketArn}/*`],
    }));

    const deleteCaseFileFn = new NodejsFunction(this, 'DeleteCaseFileFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/case/deleteCaseFile.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
        CASE_IMAGES_BUCKET: caseImagesBucket.bucketName,
      },
    });
    grantCaseMutation(deleteCaseFileFn, ['dynamodb:DeleteItem', 'dynamodb:PutItem']);
    deleteCaseFileFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:DeleteObject'],
      resources: [`${caseImagesBucket.bucketArn}/*`],
    }));

    const getNotificationsFn = new NodejsFunction(this, 'GetNotificationsFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/notification/getNotifications.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    grantTableRead(getNotificationsFn);

    const markNotificationReadFn = new NodejsFunction(this, 'MarkNotificationReadFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../task-api/src/aws/handlers/notification/markNotificationRead.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: database.entities.tableName,
      },
    });
    markNotificationReadFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:UpdateItem'],
      resources: [tableArn, tableIndexesArn],
    }));

    const notificationsResource = api.root.addResource('notifications');
    notificationsResource.addMethod('GET', new apigateway.LambdaIntegration(getNotificationsFn), { authorizer });

    const notificationIdResource = notificationsResource.addResource('{notificationId}');
    const notificationReadResource = notificationIdResource.addResource('read');
    notificationReadResource.addMethod('PATCH', new apigateway.LambdaIntegration(markNotificationReadFn), { authorizer });

    const caseFilesResource = caseIdResource.addResource('files');
    caseFilesResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseFilesFn), { authorizer });
    caseFilesResource.addMethod('POST', new apigateway.LambdaIntegration(confirmCaseFileUploadFn), { authorizer });

    const caseFilesUploadUrlResource = caseFilesResource.addResource('upload-url');
    caseFilesUploadUrlResource.addMethod('POST', new apigateway.LambdaIntegration(getCaseFileUploadUrlFn), { authorizer });

    const caseFileIdResource = caseFilesResource.addResource('{fileId}');
    const caseFileDownloadUrlResource = caseFileIdResource.addResource('download-url');
    caseFileDownloadUrlResource.addMethod('GET', new apigateway.LambdaIntegration(getCaseFileDownloadUrlFn), { authorizer });
    caseFileIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteCaseFileFn), { authorizer });

    const uploadResource = api.root.addResource('upload');
    const uploadPresignedUrlResource = uploadResource.addResource('presigned-url');
    uploadPresignedUrlResource.addMethod('POST', new apigateway.LambdaIntegration(getUploadPresignedUrlFn), { authorizer });

    const uploadReadUrlResource = uploadResource.addResource('read-url');
    uploadReadUrlResource.addMethod('GET', new apigateway.LambdaIntegration(getReadPresignedUrlFn), { authorizer });

    new cdk.CfnOutput(this, 'CaseImagesBucketName', {
      value: caseImagesBucket.bucketName,
      description: 'S3 bucket for case images (set as NEXT_PUBLIC_CASE_IMAGES_BUCKET if needed)',
    });

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
