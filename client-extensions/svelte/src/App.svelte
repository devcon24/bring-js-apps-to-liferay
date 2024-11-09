<svelte:options tag="svelte-todo-mvc" />

<script>
    import { onMount } from 'svelte';
    import { router } from './router.js';
    import { injectCSS } from './injectCSS.js';

    import Header from './Header.svelte';
    import Footer from './Footer.svelte';
    import Item from './Item.svelte';

    let currentFilter = "all";
    let items = [];
    let shadowRoot;
    

    function addItem(event) {
        items = [
            ...items,
            {
                id: crypto.randomUUID(), // This only works in secure contexts.
                description: event.detail.text,
                completed: false,
            }
        ];
    }

    function removeItem(index) {
        items = items.filter((_, i) => i !== index);
    }

    function toggleAllItems(event) {
        const checked = event.target.checked;
        items = items.map(item => ({
            ...item,
            completed: checked,
        }));
    }

    function removeCompletedItems() {
        items = items.filter(item => !item.completed);
    }
    
    onMount(async () => {
        // Get the shadow root from the custom element
        shadowRoot = document.querySelector('svelte-todo-mvc').shadowRoot;
        await injectCSS(shadowRoot);

      router(route => currentFilter = route).init();
    });

    $: filtered = currentFilter === "all"
        ? items
        : currentFilter === "completed"
        ? items.filter(item => item.completed)
        : items.filter(item => !item.completed);

    $: numActive = items.filter(item => !item.completed).length;
    $: numCompleted = items.filter(item => item.completed).length;
</script>

<div class="todo-app">
<Header on:addItem={addItem} />

{#if items.length > 0}
    <main class="main">
        <div class="toggle-all-container">
            <input 
                id="toggle-all" 
                class="toggle-all" 
                type="checkbox" 
                on:change={toggleAllItems} 
                checked={numCompleted === items.length} 
            />
            <label for="toggle-all">Mark all as complete</label>
        </div>
        <ul class="todo-list">
            {#each filtered as item, index (item.id)}
                <Item bind:item on:removeItem={() => removeItem(index)} />
            {/each}
        </ul>

        <Footer 
            {numActive} 
            {currentFilter} 
            {numCompleted} 
            on:removeCompletedItems={removeCompletedItems} 
        />
    </main>
{/if}
</div>