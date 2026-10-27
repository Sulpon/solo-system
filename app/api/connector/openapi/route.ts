import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.ATLAS_CONNECTOR_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
    return NextResponse.json(
      { error: "Set ATLAS_CONNECTOR_BASE_URL to the public HTTPS URL of this Atlas deployment." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Atlas Personal OS",
      version: "0.1.0",
      description: "Read and create quests in the authenticated user's Atlas account. Writes are limited to creating quests; destructive actions are not exposed.",
    },
    servers: [{ url: baseUrl }],
    security: [{ AtlasBearer: [] }],
    paths: {
      "/api/connector/quests": {
        get: {
          operationId: "listAtlasQuests",
          summary: "List quests in Atlas",
          description: "Returns the user's quests, including title, category, XP, cadence, status, and scheduled date.",
          responses: {
            "200": {
              description: "Quest list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: { type: "integer" },
                      quests: { type: "array", items: { "$ref": "#/components/schemas/Quest" } },
                    },
                    required: ["count", "quests"],
                  },
                },
              },
            },
            "401": { description: "Invalid or missing connector key" },
          },
        },
        post: {
          operationId: "createAtlasQuest",
          summary: "Create a quest in Atlas",
          description: "Creates an active task or habit in the user's Atlas. Ask the user for categoryId if it is not known. Use cadence one-time for a one-off task. Dates use YYYY-MM-DD.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { "$ref": "#/components/schemas/CreateQuest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Quest created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      saved: { type: "boolean" },
                      quest: { "$ref": "#/components/schemas/Quest" },
                    },
                    required: ["saved", "quest"],
                  },
                },
              },
            },
            "400": { description: "Invalid quest details" },
            "401": { description: "Invalid or missing connector key" },
            "409": { description: "Atlas data changed concurrently; retry" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        AtlasBearer: { type: "http", scheme: "bearer", bearerFormat: "API key" },
      },
      schemas: {
        Quest: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            categoryId: { type: "string" },
            xp: { type: "number" },
            cadence: { type: "string", enum: ["daily", "weekly", "one-time"] },
            importance: { type: "string", enum: ["core", "bonus"] },
            kind: { type: "string", enum: ["task", "habit"] },
            status: { type: "string", enum: ["active", "archived"] },
            scheduledDate: { type: ["string", "null"], format: "date" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["id", "title", "categoryId", "xp", "cadence", "status", "createdAt", "updatedAt"],
        },
        CreateQuest: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 180 },
            description: { type: "string", maxLength: 2000 },
            categoryId: { type: "string", description: "An existing Atlas category/attribute ID." },
            xp: { type: "number", minimum: 0, maximum: 100000, default: 0 },
            cadence: { type: "string", enum: ["daily", "weekly", "one-time"] },
            importance: { type: "string", enum: ["core", "bonus"] },
            kind: { type: "string", enum: ["task", "habit"], default: "task" },
            scheduledDate: { type: "string", format: "date" },
          },
          required: ["title", "categoryId", "cadence"],
          additionalProperties: false,
        },
      },
    },
  });
}
