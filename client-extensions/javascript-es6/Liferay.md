# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC Javascript ES6 Example)[https://github.com/tastejs/todomvc/tree/master/examples/javascript-es6] into a Liferay Frontend Client Extension.

## Prerequisites

Before making any modifications, it is recommended that you do a `yarn install` and `yarn build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug javascript problems and Liferay CX problems at the same time.

## Modifications

There are four modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Modify `package.json`

The first change we'll make to  `package.json` is to change the name to `es6-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

Next I changed the `build` script so it would use the *dev* build instead of the *prod* build of webpack. Not necessary, but it is useful.

### Modify `webpack.common.js`

Under the `output` we're going to add `libraryTarget: 'umd'`. When webpack is building the app, this will bundle it for the Universal Module Definition format.

### Modify `webpack.dev.js` and `webpack.prod.js`

Because we're using `yarn`, the paths to the node modules will not actually be correct. Instead of using `./node_modules/...`, the paths need to change to `../../node_modules/...`.

### Replace `src/app.js`

We're going to change how the application is created. The existing version will create and attach the app into the DOM for the page, so we need to change that to create a new HTMLElement instead.

Edit the `src/app.js` file and give it the following contents:

```javascript
import View from './view';
import Controller from './controller';
import Model from './model';
import Store from './store';
import Template from './template';

import '../../../todo-app-styles.css';
import '../../../todo-common-base.css';
import './app.css';

// Define the Web Component
class ES6TodoMvcWebComponent extends HTMLElement {
  constructor() {
    super();
    this.todo = null;
  }

  connectedCallback() {
    // Set up initial HTML structure in shadow DOM
    this.innerHTML = `<div class="todo-app"><div class="todoapp">
            <header class="header">
                <h1>todos</h1>
                <input class="new-todo" placeholder="What needs to be done?" autofocus />
            </header>
            <main class="main">
                <div class="toggle-all-container">
                    <input class="toggle-all" type="checkbox" />
                    <label class="toggle-all-label" for="toggle-all">Mark all as complete</label>
                </div>
                <ul class="todo-list"></ul>
            </main>
            <footer class="footer">
                <span class="todo-count"></span>
                <ul class="filters">
                    <li>
                        <a href="#/" class="selected">All</a>
                    </li>
                    <li>
                        <a href="#/active">Active</a>
                    </li>
                    <li>
                        <a href="#/completed">Completed</a>
                    </li>
                </ul>
                <button class="clear-completed">Clear completed</button>
            </footer>
        </div>`;

    // Set up load and hashchange event listeners
    window.addEventListener('hashchange', this.onHashChange.bind(this));

    // Initialize the application
    this.todo = new TodoApp('javascript-es6-webpack');
    this.onHashChange(); // Set the initial view based on the current hash
  }

  disconnectedCallback() {
    // Clean up event listeners to prevent memory leaks
    window.removeEventListener('hashchange', this.onHashChange.bind(this));
  }

  onHashChange() {
    if (this.todo) {
      this.todo.controller.setView(document.location.hash);
    }
  }
}

// Helper class to encapsulate the Todo app logic
class TodoApp {
  constructor(name) {
    this.storage = new Store(name);
    this.model = new Model(this.storage);
    this.template = new Template();
    this.view = new View(this.template);
    this.controller = new Controller(this.model, this.view);
  }
}

// Register the web component
customElements.define('es6-todo-mvc', ES6TodoMvcWebComponent);
```

This sets up the app as a custom HTMLElement implementation and refactors how the application is attached and managed.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist
    into: static
es6-todo-mvc:
  cssURLs:
    - app.css
  friendlyURLMapping: es6-todo-mvc
  htmlElementName: es6-todo-mvc
  instanceable: false
  name: ES6 TODO MVC
  portletCategoryName: category.client-extensions
  type: customElement
  urls:
    - app.bundle.js
  useESM: true
```

The first key part is the `assemble` `from` location. You find the path to use here by invoking `yarn build`, then see where the *js* and *css* files end up.

The next key part is the *name*, `friendlyURLMapping`, `htmlElementName` fields, these are set to match the custom element name that we used in the `src/app.js` file.

The `name` attribute is set to the value that we will see in the Liferay UI content pages, so pick a name that will make sense to your page maintainers.

The final key part is the `cssURLs` and `urls` attributes. These list all of the individual CSS and JS files from the assemble/build directory, or in `dist` in this particular case. Fortunately we have only one CSS file to worry about and one js file. *Note* when handling multiple files, ensure they are listed in the same order as the generated `dist/index.html` script loading order; this can be very important otherwise you may get JS console errors when trying to use the custom element.

## Building

To just build and test the React application, you can use the commands `yarn build` to build the artifacts. You can use `yarn serve` to test it out. *Note* that you can't just open the HTML file directly in the browser, it will fail to load the resources because of CORS errors.

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `javascript-es6.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `javascript-es6.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `javascript-es6.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-11-04 18:54:33.961 INFO  [fileinstall-directory-watcher][BundleStartStopLogger:68] STARTED javascriptes6_7.4.3.125 [1393]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *ES6 TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

The primary concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead implement manual routing akin to React's `MemoryRouter`.
