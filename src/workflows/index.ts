import { HumanMessage } from "@langchain/core/messages";
import { app } from "./workflows/pdf-chat.js";

// Use the Runnable
const finalState = await app.invoke(
    { messages: [new HumanMessage("Tell me the key skills for the job")] },
    { configurable: { thread_id: "42" } }
);

console.log(finalState.messages[finalState.messages.length - 1].content);
