# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC Vue.js Example)[https://github.com/tastejs/todomvc/tree/master/examples/vue] into a Liferay Frontend Client Extension.

## Prerequisites

Before making any modifications, it is recommended that you do a `yarn install` and `yarn build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug Vue.js problems and Liferay CX problems at the same time.

## Modifications

There are five modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Modify `src/main.js`

This will be an immediate need since we are using yarn. The `yarn build` command from the prerequisites will fail since the default path to css, i.e. `../node_modules/todomvc-app-css/index.css` will not be found. Change the paths so they are `../../../node_modules/...` to resolve the path issues.

### Modify `package.json`

We need to modify `package.json`. First, change the name to `vue-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

Next I added a main and module declaration:

```json
  "main": "dist/todo-app.umd.js",
  "module": "dist/todo-app.es.js",
```

Finally, I recommend disabling the `lint` script. Once we make the changes, testing will likely not work (unless you change the project to support it) and can fail the builds. As long as the app works before you begin making your changes, the rest of your work is going to be testing in Liferay and fixing any deployment or runtime problems.

### Modify `vite.config.js`

Next I simplified the vite configuration but more importantly set it up to generate the appropriate formats:

```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  build: {
    lib: {
      entry: 'src/main.js', // Adjust to your main file path
      name: 'Vue Todo Mvc', // A global name for the web component
      fileName: (format) => `vue-todo-app.${format}.js`,
      formats: ['es', 'umd'], // Including both ES module and UMD for compatibility
    },
    rollupOptions: {
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});
```

### Modify `src/App.vue`

I slightly modified the `src/App.vue` file so it would include a wrapping div:

```vue
<template>
  <div class="todo-app">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>
```

### Modify `src/main.js`

We're going to change completely the contents of `src/main.js` to the following:

```javascript
import './assets/main.css';
import '../../../todo-app-styles.css';
import '../../../todo-common-base.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

async function injectCSS(shadowRoot) {
    const cssPaths = [
      '/o/vue/style.css',
    ];
  
    for (const path of cssPaths) {
      const response = await fetch(path);
      const cssText = await response.text();
      const styleElement = document.createElement('style');
      styleElement.textContent = cssText;
      shadowRoot.appendChild(styleElement);
    }
  }

class TodoAppElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.app = null; // Store the app instance here for cleanup
    }
  
    async connectedCallback() {
    // Inject CSS into shadow DOM
    await injectCSS(this.shadowRoot);

      // Only create and mount the app if it hasn't been initialized
      if (!this.app) {
        this.app = createApp(App);
        this.app.use(router);
        this.app.mount(this.shadowRoot);
      }
    }
  
    disconnectedCallback() {
      // Unmount the app instance when the element is removed from the DOM
      if (this.app) {
        this.app.unmount();
        this.app = null; // Clean up the reference to avoid memory leaks
      }
    }
  }

// Register the custom element globally
customElements.define('vue-todo-mvc', TodoAppElement);
```

This replaces the default of using `app.mount()` on the `todoapp` section, instead leveraging a WebComponent to define the Vue app as a standard web component (custom element) with a shadow DOM and the Vue app is mounted to it instead. Again, for CSS applying to the shadow DOM we're attaching the styles to the shadow DOM.

### Modify the `src/components/TodoItem.vue` File

There was a runtime bug due to a missing emit in the file. I don't know if the bug stems from being a web component or if it would hit the regular app too, but I had to change the 5th line from:

```vue
const emit = defineEmits(['delete-todo', 'edit-todo']);
```

to

```vue
const emit = defineEmits(['delete-todo', 'edit-todo', 'toggle-todo']);
```

### Modify the `public/index.html` File

The change here is pretty simple. This is the standard template HTML file used to render the Vue.js application. The only change we need to apply here is changing the section with the root id over to the `<vue-todo-mvc>` tag.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist
    into: static
vue-todo-mvc:
  cssURLs:
    - style.css
  friendlyURLMapping: vue-todo-mvc
  htmlElementName: vue-todo-mvc
  instanceable: false
  name: Vue.js TODO MVC
  portletCategoryName: category.client-extensions
  type: customElement
  urls:
    - vue-todo-app.es.js
  useESM: true
```

The first key part is the `assemble` `from` location. You find the path to use here by invoking `yarn build`, then see where the *js* and *css* files end up.

The next key part is the *name*, `friendlyURLMapping`, `htmlElementName` fields, these are set to match the custom element name that we used in the `src/main.js` file.

The `name` attribute is set to the value that we will see in the Liferay UI content pages, so pick a name that will make sense to your page maintainers.

The final key part is the `cssURLs` and `urls` attributes. These list all of the individual CSS and JS files from the assemble/build directory, or in `dist` in this particular case. Fortunately we have only one CSS file to worry about and one js file. *Note* when handling multiple files, ensure they are listed in the same order as the generated `dist/index.html` script loading order; this can be very important otherwise you may get JS console errors when trying to use the custom element.

## Building

To just build and test the Vue.js application, you can use the commands `yarn build` to build the artifacts. You can use `yarn serve` to test it out. *Note* that you can't just open the HTML file directly in the browser, it will fail to load the resources because of CORS errors.

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `vue.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `vue.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `vue.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-11-04 18:54:33.961 INFO  [fileinstall-directory-watcher][BundleStartStopLogger:68] STARTED vue_7.4.3.125 [1393]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *Vue.js TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

The primary concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead rely on manual routing or Vue.js's equivalent of React's `MemoryRouter`.
