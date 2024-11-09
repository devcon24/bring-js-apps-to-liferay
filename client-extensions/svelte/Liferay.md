# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC Svelte Example)[https://github.com/tastejs/todomvc/tree/master/examples/svelte] into a Liferay Frontend Client Extension.

## Prerequisites

Before making any modifications, it is recommended that you do a `yarn install` and `yarn build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug Svelte problems and Liferay CX problems at the same time.

## Modifications

There are four modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Modify `package.json`

We need to modify `package.json`. First, change the name to `svelte-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

### Modify `vite.config.js`

Vite had to be configured to generate the *Uninversal Module Definition* format, so I changed the content of the file to:

```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                customElement: true
            },
            emitCss: true
        }),
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/todomvc-common/base.js',
                    dest: '.',
                },
            ],
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.js',
            name: 'SvelteTodoMVC',
            formats: ['es', 'umd'],
            fileName: 'svelte-todo-mvc'
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') return 'svelte-todo-mvc.css';
                    return assetInfo.name;
                }
            }
        },
        cssCodeSplit: false
    },
    base: "client-extensions/svelte/dist/"
});
```

These changes had the added benefit of packing separate files together which makes using the web component easier.

### Modify `src/App.svelte`

I had to make a number of changes to the Svelte app to make it into a web component:

```svelte
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
```

The primary change is the first line which declares that this will be a standard web component using the tag `svelte-todo-mvc`.

There's also the change to leverage the shadow DOM and apply the stylesheets to the shadow DOM like we did with jQuery.

### Modify `src/index.js`

Svelte's default `src/index.js` file was responsible for declaring and mounting the Svelte app.

Since we're converting it to a standard web component, we reduced it to:

```javascript
import App from "./App.svelte";
import "./app.css";
import "../../../todo-app-styles.css";
import "../../../todo-common-base.css";

export default App;
```

This file also includes the shared CSS imports so when Vite is building, it will create the unified css file.

### Modify the `public/index.html` File

The change here is pretty simple. This is the standard template HTML file used to render the Svelte application. The only change we need to apply here is changing the section with the root id over to the `<svelte-todo-mvc>` tag.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist
    into: static
svelte-todo-mvc:
  cssURLs:
    - svelte-todo-mvc.css
  friendlyURLMapping: svelte-todo-mvc
  htmlElementName: svelte-todo-mvc
  instanceable: false
  name: Svelte TODO MVC
  portletCategoryName: category.client-extensions
  type: customElement
  urls:
    - svelte-todo-mvc.js
  useESM: true
```

The first key part is the `assemble` `from` location. You find the path to use here by invoking `yarn build`, then see where the *js* and *css* files end up.

The next key part is the *name*, `friendlyURLMapping`, `htmlElementName` fields, these are set to match the custom element name that we used in the `src/App.svelte` file.

The `name` attribute is set to the value that we will see in the Liferay UI content pages, so pick a name that will make sense to your page maintainers.

The final key part is the `cssURLs` and `urls` attributes. These list all of the individual CSS and JS files from the assemble/build directory, or in `dist` in this particular case. Fortunately we have only one CSS file to worry about and one js file. *Note* when handling multiple files, ensure they are listed in the same order as the generated `dist/index.html` script loading order; this can be very important otherwise you may get JS console errors when trying to use the custom element.

## Building

To just build and test the Svelte application, you can use the commands `yarn build` to build the artifacts. You can use `yarn serve` to test it out. *Note* that you can't just open the HTML file directly in the browser, it will fail to load the resources because of CORS errors.

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `svelte.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `svelte.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `svelte.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-11-04 18:54:33.961 INFO  [fileinstall-directory-watcher][BundleStartStopLogger:68] STARTED svelte_7.4.3.125 [1393]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *Svelte TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

The primary concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead rely on manual routing or the Svelte equivalent of React's `MemoryRouter`.
