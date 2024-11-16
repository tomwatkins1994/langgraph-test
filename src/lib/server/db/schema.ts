import {
    pgTable,
    integer,
    text,
    uuid,
    jsonb,
    primaryKey,
    customType,
} from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
});

// Checkpoints

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
    dataType() {
        return "bytea";
    },
});

export const checkpointMigrations = pgTable("checkpoint_migrations", {
    v: integer().primaryKey().notNull(),
});

export const checkpointBlobs = pgTable(
    "checkpoint_blobs",
    {
        threadId: text("thread_id").notNull(),
        checkpointNs: text("checkpoint_ns").default("").notNull(),
        channel: text().notNull(),
        version: text().notNull(),
        type: text().notNull(),
        // TODO: failed to parse database type 'bytea'
        blob: bytea("blob"),
    },
    table => {
        return {
            checkpointBlobsPkey: primaryKey({
                columns: [
                    table.threadId,
                    table.checkpointNs,
                    table.channel,
                    table.version,
                ],
                name: "checkpoint_blobs_pkey",
            }),
        };
    }
);

export const checkpoints = pgTable(
    "checkpoints",
    {
        threadId: text("thread_id").notNull(),
        checkpointNs: text("checkpoint_ns").default("").notNull(),
        checkpointId: text("checkpoint_id").notNull(),
        parentCheckpointId: text("parent_checkpoint_id"),
        type: text(),
        checkpoint: jsonb().notNull(),
        metadata: jsonb().default({}).notNull(),
    },
    table => {
        return {
            checkpointsPkey: primaryKey({
                columns: [
                    table.threadId,
                    table.checkpointNs,
                    table.checkpointId,
                ],
                name: "checkpoints_pkey",
            }),
        };
    }
);

export const checkpointWrites = pgTable(
    "checkpoint_writes",
    {
        threadId: text("thread_id").notNull(),
        checkpointNs: text("checkpoint_ns").default("").notNull(),
        checkpointId: text("checkpoint_id").notNull(),
        taskId: text("task_id").notNull(),
        idx: integer().notNull(),
        channel: text().notNull(),
        type: text(),
        blob: bytea("blob").notNull(),
    },
    table => {
        return {
            checkpointWritesPkey: primaryKey({
                columns: [
                    table.threadId,
                    table.checkpointNs,
                    table.checkpointId,
                    table.taskId,
                    table.idx,
                ],
                name: "checkpoint_writes_pkey",
            }),
        };
    }
);
