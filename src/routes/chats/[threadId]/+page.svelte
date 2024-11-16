<script lang="ts">
import type { PageData } from "./$types";
import { SendIcon } from "lucide-svelte";
import LoadingIcon from "$lib/components/LoadingIcon.svelte";

let { data }: { data: PageData } = $props();
let { thread } = data;

let userMessage = $state("");
let messages = $state(data.messages);
let loading = $state(false);

async function sendMessage() {
	if (userMessage.trim() === "") return;
	loading = true;
	const message = userMessage;

	// Add the user's message to the chat
	messages.push({ content: userMessage, role: "user" });
	userMessage = "";

	// Send the message to the backend
	const response = await fetch(`/api/chat/${thread.id}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message }),
	});
	const data = await response.json();

	// Add the response to the chat
	messages.push({ content: data.reply, role: "assistant" });
	loading = false;
}
</script>

<svelte:head>
  <title>{thread.name}</title>
</svelte:head>

<div class="h-full flex flex-col">
    <div class="flex-1 overflow-auto">
        <div class="flex flex-col gap-2 p-2">
            {#each messages as { content, role }, i}
              <div class="message-container {role}">
                <div class="message p-2 border rounded-lg max-w-[75%] border-none text-sm">{content}</div>
              </div>
            {/each}
          </div>
    </div>
    <div class="flex p-2 gap-2">
        <input 
            type="text" 
            class="w-full border rounded-sm p-2" 
            bind:value={userMessage}
            onkeydown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
        />
        <button onclick={sendMessage} disabled={loading}>
          {#if loading}
            <LoadingIcon />
          {:else}
            <SendIcon />
          {/if}
        </button>
    </div>
</div>

<style>
  .message-container {
    display: flex;
    &.user {
      @apply justify-end;
      > .message {
        @apply bg-green-500 text-white;
      }
    }
    &.assistant {
      > .message {
        @apply bg-slate-500 text-white;
      }
    }
  }
</style>