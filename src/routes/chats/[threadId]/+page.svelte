<script lang="ts">
import type { PageData } from "./$types";
import { onMount } from "svelte";
import SendIcon from "$lib/components/SendIcon.svelte";
import LoadingIcon from "$lib/components/LoadingIcon.svelte";

let { data }: { data: PageData } = $props();
let { thread } = data;

let userMessage = $state("");
let messages = $state(data.messages);
let loading = $state(false);
let scrollContainer: HTMLDivElement | null = null;

onMount(() => {
	scrollToLastMessage();
});

function scrollToLastMessage() {
	if (scrollContainer) {
		scrollContainer.scrollTop = scrollContainer.scrollHeight;
	}
}

function messageRendered(_: HTMLElement) {
	scrollToLastMessage();
	return {
		update() {
			scrollToLastMessage();
		},
	};
}

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

	let newMessage = $state({ content: "", role: "assistant" });
	messages.push(newMessage);

	const reader = response.body?.getReader();
	const decoder = new TextDecoder();
	let done = false;

	while (!done) {
		const { value, done: doneReading } = (await reader?.read()) || {
			value: null,
			done: true,
		};
    if (value) {
      newMessage.content += decoder.decode(value, { stream: true });
      scrollToLastMessage();
    }
		done = doneReading;
	}

	loading = false;
}
</script>

<svelte:head>
  <title>{thread.name}</title>
</svelte:head>

<div class="h-full flex flex-col">
    <div bind:this={scrollContainer} class="flex-1 overflow-auto">
        <div class="flex flex-col gap-2 p-4">
            {#each messages as { content, role }, i}
              <div use:messageRendered class="message-container {role}">
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