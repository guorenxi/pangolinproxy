import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userSites, sites, roleSites } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { eq, and } from "drizzle-orm";
import { getUniqueSiteName } from "@server/db/names";
import { addPeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";
import { hash } from "@node-rs/argon2";
import { newts } from "@server/db/schema";
import moment from "moment";

const createSiteParamsSchema = z.object({
    orgId: z.string(),
});

const createSiteSchema = z
    .object({
        name: z.string().min(1).max(255),
        exitNodeId: z.number().int().positive(),
        subdomain: z.string().min(1).max(255).optional(),
        pubKey: z.string().optional(),
        subnet: z.string(),
        newtId: z.string().optional(),
        secret: z.string().optional(),
        type: z.string(),
    })
    .strict();

export type CreateSiteBody = z.infer<typeof createSiteSchema>;

export type CreateSiteResponse = {
    name: string;
    siteId: number;
    orgId: string;
    niceId: string;
};

export async function createSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = createSiteSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { name, type, exitNodeId, pubKey, subnet, newtId, secret } =
            parsedBody.data;

        const parsedParams = createSiteParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;

        if (!req.userOrgRoleId) {
            return next(
                createHttpError(HttpCode.FORBIDDEN, "User does not have a role")
            );
        }

        const niceId = await getUniqueSiteName(orgId);

        let payload: any = {
            orgId,
            exitNodeId,
            name,
            niceId,
            subnet,
            type,
        };

        if (pubKey && type == "wireguard") {
            // we dont add the pubKey for newts because the newt will generate it
            payload = {
                ...payload,
                pubKey,
            };
        }

        const [newSite] = await db.insert(sites).values(payload).returning();

        const adminRole = await db
            .select()
            .from(roles)
            .where(and(eq(roles.isAdmin, true), eq(roles.orgId, orgId)))
            .limit(1);

        if (adminRole.length === 0) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, `Admin role not found`)
            );
        }

        await db.insert(roleSites).values({
            roleId: adminRole[0].roleId,
            siteId: newSite.siteId,
        });

        if (req.userOrgRoleId != adminRole[0].roleId) {
            // make sure the user can access the site
            db.insert(userSites).values({
                userId: req.user?.userId!,
                siteId: newSite.siteId,
            });
        }

        // add the peer to the exit node
        if (type == "newt") {
            const secretHash = await hash(secret!, {
                memoryCost: 19456,
                timeCost: 2,
                outputLen: 32,
                parallelism: 1,
            });

            await db.insert(newts).values({
                newtId: newtId!,
                secretHash,
                siteId: newSite.siteId,
                dateCreated: moment().toISOString(),
            });
        } else if (type == "wireguard") {
            if (!pubKey) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Public key is required for wireguard sites"
                    )
                );
            }
            await addPeer(exitNodeId, {
                publicKey: pubKey,
                allowedIps: [],
            });
        }

        return response(res, {
            data: {
                name: newSite.name,
                niceId: newSite.niceId,
                siteId: newSite.siteId,
                orgId: newSite.orgId,
            },
            success: true,
            error: false,
            message: "Site created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
