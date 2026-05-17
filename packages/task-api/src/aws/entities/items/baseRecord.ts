import { isObject, isString } from "@task/core/src/utilities";
import { DynamoDBRecord } from "./DynamoDBRecord";

export type HierarchyEntityBase<TName extends string, THierarchy = {}, TAdditional = {}> = {
    pk: string;
    sk: string;
    name: string;
    at: string;
    update_at?: string;
} & Record<TName, string> &
    THierarchy &
    TAdditional;

export type HierarchyRecordProps<TName extends string, THierarchy = {}, TAdditional = {}> = {
    name: string;
    at: string;
    update_at?: string;
} & Record<TName, string> &
    THierarchy &
    TAdditional;

export type HierarchyRecordType<
    TName extends string,
    THierarchy = {},
    TAdditional = {}
> = DynamoDBRecord & HierarchyRecordProps<TName, THierarchy, TAdditional>;

export const createHierarchyRecord = <
    TEntityName extends string,
    THierarchy = {},
    TAdditional = {},
    TName extends string = TEntityName,
>(options: {
    entityName: TEntityName;
    idKey?: TName;
    makeSkFn: (...ids: string[]) => string;
    hierarchyKeys?: (keyof THierarchy)[];
    additionalKeys?: (keyof TAdditional)[];
}) => {
    const { entityName, hierarchyKeys = [], additionalKeys = [], makeSkFn } = options;
    const idKey = options.idKey ?? (entityName as unknown as TName);

    const makePk = () => entityName;

    const makeKey = (...ids: string[]) => ({
        pk: makePk(),
        sk: makeSkFn(...ids),
    });

    return {
        entityName,
        makePk,
        makeSk: makeSkFn,
        makeKey,

        fromEntity: (entity: HierarchyEntityBase<TName, THierarchy, TAdditional>): HierarchyRecordType<TName, THierarchy, TAdditional> => {
            const base: Record<string, unknown> = {
                pk: entity.pk,
                sk: entity.sk,
                [idKey]: entity[idKey],
                name: entity.name,
                at: entity.at,
                update_at: entity.update_at,
            };
            for (const key of hierarchyKeys) {
                base[key as string] = entity[key as keyof typeof entity];
            }
            for (const key of additionalKeys) {
                base[key as string] = entity[key as keyof typeof entity];
            }
            return base as HierarchyRecordType<TName, THierarchy, TAdditional>;
        },

        toEntity: (record: HierarchyRecordType<TName, THierarchy, TAdditional>): HierarchyEntityBase<TName, THierarchy, TAdditional> => {
            const base: Record<string, unknown> = {
                pk: record.pk,
                sk: record.sk,
                [idKey]: record[idKey],
                name: record.name,
                at: record.at,
                update_at: record.update_at,
            };
            for (const key of hierarchyKeys) {
                base[key as string] = record[key as keyof typeof record];
            }
            for (const key of additionalKeys) {
                base[key as string] = record[key as keyof typeof record];
            }
            return base as HierarchyEntityBase<TName, THierarchy, TAdditional>;
        },

        isValidStructure: (value: unknown): value is HierarchyRecordType<TName, THierarchy, TAdditional> => {
            if (!isObject(value)) return false;

            const baseValid =
                isString(value.pk) &&
                isString(value.sk) &&
                isString(value[idKey as string]) &&
                isString(value.name) &&
                isString(value.at) &&
                (value.update_at === undefined || isString(value.update_at));

            if (!baseValid) return false;

            for (const key of hierarchyKeys) {
                if (!isString(value[key as string])) return false;
            }
            
            for (const key of additionalKeys) {
                if (!isString(value[key as string])) return false;
            }

            return true;
        }
    } as const;
}
