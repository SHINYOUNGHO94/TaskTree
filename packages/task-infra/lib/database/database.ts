import { Construct } from "constructs";
import { StagingEnvironment, Suffix } from "@task/core";
import { AttributeType, ITable, TableEncryptionV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { taskCapacityMode } from "../helpers/capacityMode";
import { CfnOutput } from "aws-cdk-lib";

interface TaskDatabaseProps {
    stagingEnvironment: StagingEnvironment;
    suffix: Suffix;
    version: string;
}

export class TaskDatabase extends Construct {
    public readonly entities: ITable;

    constructor(scope: Construct, id: string, props: TaskDatabaseProps) {
        super(scope, id);
        const { stagingEnvironment, suffix, version } = props;

        const tableNamePrefix = `task-db-stack-${version}-${suffix.toString()}`;
        const entities = new TableV2(scope, "TaskEntities", {
            tableName: `${tableNamePrefix}-TaskEntities`,
            partitionKey: { name: "pk", type: AttributeType.STRING },
            sortKey: { name: "sk", type: AttributeType.STRING },
            encryption: TableEncryptionV2.awsManagedKey(),
            ...taskCapacityMode[stagingEnvironment].entities,
        });

        entities.addGlobalSecondaryIndex({
            indexName: "company",
            partitionKey: { name: "companyId", type: AttributeType.STRING },
            sortKey: { name: "pk", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "division",
            partitionKey: { name: "divisionId", type: AttributeType.STRING },
            sortKey: { name: "pk", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "department",
            partitionKey: { name: "departmentId", type: AttributeType.STRING },
            sortKey: { name: "pk", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "team",
            partitionKey: { name: "teamId", type: AttributeType.STRING },
            sortKey: { name: "pk", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "user",
            partitionKey: { name: "User", type: AttributeType.STRING },
            sortKey: { name: "pk", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "byCase",
            partitionKey: { name: "caseId", type: AttributeType.STRING },
            sortKey: { name: "caseSortKey", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "byAssignee",
            partitionKey: { name: "assigneeKey", type: AttributeType.STRING },
            sortKey: { name: "assigneeSortKey", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "byVisibility",
            partitionKey: { name: "visibilityKey", type: AttributeType.STRING },
            sortKey: { name: "visibilitySortKey", type: AttributeType.STRING },
        });

        entities.addGlobalSecondaryIndex({
            indexName: "byParticipantCompany",
            partitionKey: { name: "participantCompanyId", type: AttributeType.STRING },
            sortKey: { name: "participantCompanySortKey", type: AttributeType.STRING },
        });

        this.entities = entities;

        new CfnOutput(this, "DynamoDBEntitiesConfiguration", {
            value: JSON.stringify({
                tableName: this.entities.tableName,
                region: this.entities.stack.region,
            }),
        });
    }
}
