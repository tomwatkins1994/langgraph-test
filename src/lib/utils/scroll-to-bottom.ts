export function scrollToBottom(node: HTMLElement) {
    // Set the scroll position immediately
    node.scrollTop = node.scrollHeight;

    return {
        update() {
            // Maintain scroll at the bottom when content updates
            node.scrollTop = node.scrollHeight;
        },
    };
}
