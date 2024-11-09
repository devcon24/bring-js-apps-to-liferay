# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC Web Component Example)[https://github.com/tastejs/todomvc/tree/master/examples/web-components] into a Liferay Frontend Client Extension.

## Prerequisites

Before making any modifications, it is recommended that you do a `yarn install` and `yarn build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug web component problems and Liferay CX problems at the same time.

These components are already defined as web components, so it might seem as though it would be easy to turn them into a Liferay Frontend Client Extension...

The problem can be seen in the `index.html` file - there's a lot of JS files to load, a lot of CSS files to load, and internally they have a lot of other resources that they're going to access.

To simplify using this as a Liferay Client Extension, we're going to add Rollup into the mix to pull everything together. Use the command `yarn add -D rollup rollup-plugin-terser @rollup/plugin-node-resolve @rollup/plugin-commonjs rollup-plugin-postcss rollup-plugin-copy postcss` to pull in the necessary resources.

## Modifications

There are five modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Modify `package.json`

Adding rollup is going to add a number of `devDependencies` to the `package.json` file, but we'll need a few more changes.

First, change the name to `webcomponents-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

Next I changed the `build` script so it would use rollup for the build using the command `rollup -c` for the `build` step.

Finally I added `"type": "module"` to define the package type.

### Create `rollup.config.js`

Next create the `rollup.config.js` file with the following contents:

```javascript
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import copy from "rollup-plugin-copy"; // New plugin for copying files

export default {
    input: "src/components/todo-app/todo-app.component.js",
    output: {
        file: "dist/todo-app.bundle.js",
        format: "esm",
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs(),
        postcss({
            extract: "styles/todo-app.css", // Output CSS to dist/styles/
            minimize: true,
        }),
        terser(),
        copy({
            targets: [
                { src: "src/styles/*.css", dest: "dist/styles" }, // Copies CSS files
                { src: "../../todo-app-styles.css", dest: "dist/styles" },
                { src: "../../todo-common-base.css", dest: "dist/styles" },
            ],
        }),
    ],
};
```

Rollup is going to process the primary component file, `src/components/todo-app/todo-app.component.js` and build up a unified javascript file, plus it's also going to create the unified css file for us too.

### Modify `src/components/todo-app/todo-app.component.js`

In order for rollup to pull in the other component files, they have to be imported from the other components directly. The first part of the file is changed as such:

```javascript
import template from "./todo-app.template.js";
import { useRouter } from "../../hooks/useRouter.js";

import globalStyles from "../../../styles/global.constructable.js";
import appStyles from "../../../styles/app.constructable.js";
import mainStyles from "../../../styles/main.constructable.js";

// Import dependent components
import "../todo-topbar/todo-topbar.component.js";
import "../todo-list/todo-list.component.js";
import "../todo-bottombar/todo-bottombar.component.js";
import "../todo-item/todo-item.component.js"

class TodoApp extends HTMLElement {
```

The dependent components are each pulled in when rollup is doing its thing, and will include any transitive files that they import as well.

### Modify the `src/components/todo-app/todo-app.template.js` File

During testing I noticed that the styles weren't being applied correctly, so I added a wrapper `<div>` to the template. The contents of the file are:

```javascript
const template = document.createElement("template");

template.id = "todo-app-template";
template.innerHTML = `
    <div class="todo-app"><section class="app">
        <todo-topbar></todo-topbar>
        <main class="main">
            <todo-list></todo-list>
        </main>
        <todo-bottombar></todo-bottombar>
    </section></div>
`;

export default template;
```

### Modify the `src/components/todo-topbar/todo-topbar.template.js` File

Also during testing I noticed that the "Todos" heading was mising, likely because it was expected that it would be handled by the page creator when using the individual custom elements.

Since I wanted the unified component perspective, I added the heading to the topbar template.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist
    into: static
todo-app:
  cssURLs:
    - styles/todo-app-styles.css
    - styles/todo-common-base.css
  friendlyURLMapping: todo-app
  htmlElementName: todo-app
  instanceable: false
  name: Web Components TODO MVC
  portletCategoryName: category.client-extensions
  type: customElement
  urls:
    - todo-app.bundle.js
  useESM: true
```

The first key part is the `assemble` `from` location. You find the path to use here by invoking `yarn build`, then see where the *js* and *css* files end up.

The next key part is the *name*, `friendlyURLMapping`, `htmlElementName` fields, these are set to match the custom element name that we used in the `src/index.js` file.

The `name` attribute is set to the value that we will see in the Liferay UI content pages, so pick a name that will make sense to your page maintainers.

The final key part is the `cssURLs` and `urls` attributes. These list all of the individual CSS and JS files from the assemble/build directory, or in `dist` in this particular case. Fortunately we have only one CSS file to worry about and one js file. *Note* when handling multiple files, ensure they are listed in the same order as the generated `dist/index.html` script loading order; this can be very important otherwise you may get JS console errors when trying to use the custom element.

## Building

To just build and test the Web Components application, you can use the commands `yarn build` to build the artifacts. You can use `yarn serve` to test it out. *Note* that you can't just open the HTML file directly in the browser, it will fail to load the resources because of CORS errors.

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `web-components.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `web-components.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `web-components.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-11-04 18:54:33.961 INFO  [fileinstall-directory-watcher][BundleStartStopLogger:68] STARTED webcomponents_7.4.3.125 [1393]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *Web Components TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

The primary concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead rely on manual routing or recreating something akin to React's `MemoryRouter`.
