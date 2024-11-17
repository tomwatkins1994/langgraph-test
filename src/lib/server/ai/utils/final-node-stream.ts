import type { StreamEvent } from "@langchain/core/tracers/log_stream";

const transformContent = {
    start() {},
    async transform(
        chunk: StreamEvent,
        controller: TransformStreamDefaultController
    ) {
        if (chunk === null) {
            controller.terminate();
            return;
        }
        const { event, tags, data } = chunk;
        if (event === "on_chat_model_stream") {
            if (data.chunk.content && tags?.includes("final_node")) {
                controller.enqueue(data.chunk.content);
            }
        }
    },
};

export class FinalNodeStream extends TransformStream {
    constructor() {
        super({
            start() {},
            async transform(
                chunk: StreamEvent,
                controller: TransformStreamDefaultController
            ) {
                if (chunk === null) {
                    controller.terminate();
                    return;
                }
                const { event, tags, data } = chunk;
                if (event === "on_chat_model_stream") {
                    if (data.chunk.content && tags?.includes("final_node")) {
                        controller.enqueue(data.chunk.content);
                    }
                }
            },
        });
    }
}
