import { db } from "@server/db";
import { resourceRules, resources } from "@server/db/schema";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import { eq, sql } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import logger from "@server/logger";

const listResourceRulesParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

const listResourceRulesSchema = z.object({
    limit: z
        .string()
        .optional()
        .default("1000")
        .transform(Number)
        .pipe(z.number().int().positive()),
    offset: z
        .string()
        .optional()
        .default("0")
        .transform(Number)
        .pipe(z.number().int().nonnegative())
});

function queryResourceRules(resourceId: number) {
    let baseQuery = db
        .select({
            ruleId: resourceRules.ruleId,
            resourceId: resourceRules.resourceId,
            action: resourceRules.action,
            match: resourceRules.match,
            value: resourceRules.value,
            resourceName: resources.name,
        })
        .from(resourceRules)
        .leftJoin(resources, eq(resourceRules.resourceId, resources.resourceId))
        .where(eq(resourceRules.resourceId, resourceId));
    
    return baseQuery;
}

export type ListResourceRulesResponse = {
    rules: Awaited<ReturnType<typeof queryResourceRules>>;
    pagination: { total: number; limit: number; offset: number };
};

export async function listResourceRules(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = listResourceRulesSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error)
                )
            );
        }
        const { limit, offset } = parsedQuery.data;

        const parsedParams = listResourceRulesParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error)
                )
            );
        }
        const { resourceId } = parsedParams.data;

        // Verify the resource exists
        const [resource] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        if (!resource) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        const baseQuery = queryResourceRules(resourceId);
        
        let countQuery = db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(resourceRules)
            .where(eq(resourceRules.resourceId, resourceId));

        const rulesList = await baseQuery.limit(limit).offset(offset);
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult[0].count;

        return response<ListResourceRulesResponse>(res, {
            data: {
                rules: rulesList,
                pagination: {
                    total: totalCount,
                    limit,
                    offset
                }
            },
            success: true,
            error: false,
            message: "Resource rules retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}