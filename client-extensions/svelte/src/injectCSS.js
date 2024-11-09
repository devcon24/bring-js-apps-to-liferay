export async function injectCSS(shadowRoot) {
    const cssPaths = [
        '/o/svelte/svelte-todo-mvc.css',
    ];

    for (const path of cssPaths) {
        try {
            const response = await fetch(path);
            const cssText = await response.text();
            const styleElement = document.createElement('style');
            styleElement.textContent = cssText;
            shadowRoot.appendChild(styleElement);
        } catch (error) {
            console.error(`Failed to load CSS from ${path}:`, error);
        }
    }
}

