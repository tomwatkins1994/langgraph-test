<script lang="ts">
import { goto } from "$app/navigation";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
let { threads } = data;

let newThreadName = "";

async function createThread() {
	const response = await fetch("/api/chat/new", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: newThreadName }),
	});
	if (response.ok) {
		const data = await response.json();
		goto(`/chats/${data.id}`);
	}
}
</script>

<div class="h-full flex flex-col">
    <div class="flex p-2 border-t-2 gap-2">
        <input 
            type="text" 
            class="w-full border rounded-sm p-2" 
            bind:value={newThreadName}
            on:keydown={(e) => e.key === 'Enter' && createThread()}
            placeholder="Enter a chat name" />
        <button on:click={createThread}>Create</button>
    </div>
    <div>OR Continue a chat</div>
    <div class="flex-1">
        <div class="threads">
            {#each threads as { id, name }, i}
              <div class="message">{name}</div>
            {/each}
          </div>
    </div>
</div>