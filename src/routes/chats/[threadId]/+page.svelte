<script lang="ts">
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

let userMessage = $state("");
let messages = $state(data.messages);
let { threadId } = data;

async function sendMessage() {
	if (userMessage.trim() === "") return;

	// Add the user's message to the chat
	messages.push({ content: userMessage, role: "user" });
	userMessage = "";

	// Send the message to the backend
	const response = await fetch(`/api/chat/${threadId}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message: userMessage }),
	});
	const data = await response.json();

	// Add the response to the chat
	messages.push({ content: data.reply, role: "assistant" });
}
</script>

<div class="h-full flex flex-col">
    <div class="flex-1">
        <div class="chat-messages">
            {#each messages as { content, role }, i}
              <div class="message {role}">{content}</div>
            {/each}
          </div>
    </div>
    <div class="flex p-2 border-t-2 gap-2">
        <input 
            type="text" 
            class="w-full border rounded-sm p-2" 
            bind:value={userMessage}
            onkeydown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..." />
        <button onclick={sendMessage}>Send</button>
    </div>
</div>