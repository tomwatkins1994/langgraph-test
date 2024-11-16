<script lang="ts">
    let userMessage = '';
    let messages: { text: string, sender: 'user' | "assistant" }[] = [];
  
    async function sendMessage() {
      if (userMessage.trim() === '') return;
  
      // Add the user's message to the chat
      messages = [...messages, { text: userMessage, sender: 'user' }];
  
      // Send the message to the backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
  
      // Add the response to the chat
      messages = [...messages, { text: data.reply, sender: 'assistant' }];
      userMessage = '';
    }
</script>

<div class="h-full flex flex-col">
    <div class="flex-1">
        <div class="chat-messages">
            {#each messages as { text, sender }, i}
              <div class="message {sender}">{text}</div>
            {/each}
          </div>
    </div>
    <div class="flex p-2 border-t-2 gap-2">
        <input 
            type="text" 
            class="w-full border rounded-sm p-2" 
            bind:value={userMessage}
            on:keydown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..." />
        <button on:click={sendMessage}>Send</button>
    </div>
</div>