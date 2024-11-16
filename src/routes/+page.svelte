<script lang="ts">
import { goto } from "$app/navigation";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
let { threads } = data;

let newThreadName = $state("");

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

<div class="h-full flex flex-col p-2">
    <div class="flex gap-2">
        <input 
            type="text" 
            class="w-full border rounded-sm p-2" 
            bind:value={newThreadName}
            onkeydown={(e) => e.key === 'Enter' && createThread()}
            placeholder="Enter a chat name" />
        <button onclick={createThread}>Create</button>
    </div>
    <div class="w-full text-center py-2">OR Continue a chat</div>
    <div class="flex-1">
        <div class="flex flex-col gap-2">
            {#each threads as { id, name }, i}
                <a href="/chats/{id}">
                    <div class="w-full p-2 border rounded-sm hover:bg-slate-300">{name}</div>
                </a>
            {/each}
          </div>
    </div>
</div>