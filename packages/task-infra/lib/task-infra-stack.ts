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
