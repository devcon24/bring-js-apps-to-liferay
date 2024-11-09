# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC jQuery Example)[https://github.com/tastejs/todomvc/tree/master/examples/jquery] into a Liferay Frontend Client Extension.

## Prerequisites

Before making any modifications, it is recommended that you do a `yarn install` and `yarn build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug jQuery problems and Liferay CX problems at the same time.

## Modifications

There are four modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Introduce Webpack

The jQuery application is like any other jQuery application, it kind of expects to be pulled into a page using multiple `<script />` tags and stylesheets.

As we are about to convert it into a standard web component, introducing Webpack will make it easier to distribute and use the client extension, so we'll do this now.

Use the command `yarn add webpack webpack-cli html-webpack-plugin copy-webpack-plugin --dev` to add Webpack to the project.

Along with this, we'll need a `webpack.config.js` file to contain the build and packaging instructions:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './src/app.js',
    output: {
        filename: 'app.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Clears the output directory before building
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'], // Extracts CSS to a file
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
        }),
        new MiniCssExtractPlugin({
            filename: 'app.bundle.css', // Output CSS bundle name
        }),
    ],
};
```

When the build happens we will get one JS file and one CSS file with the contents merged appropriately.

### Modify `package.json`

We need to modify `package.json`. First, change the name to `jquery-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

Next I changed the `build` and `dev` scripts so they would use webpack. The changed lines will be:

```json
  "scripts": {
    "dev": "webpack serve --mode development --open --port 7001",
    "build": "webpack --mode development",
    "serve": "http-server ./dist -p 7002 -c-1 --cors"
  },
 ```

### Modify `index.html`

As in previous modules, I changed the paths to the css resources to the shared resources.

### Modify `src/app.js`

We're going to change completely the contents of `src/app.js` to the following:

```javascript
import jQuery from 'jquery';
import Handlebars from 'handlebars';
// import Router from 'director/build/director';

import '../../../todo-app-styles.css';
import '../../../todo-common-base.css';
import './app.css';

const Router = require('director/build/director').Router;

// Release global $ and jQuery, then set up a local alias if necessary
const $ = jQuery.noConflict(true);

class JQueryTodoApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        this.shadowRoot.innerHTML = `
            <div class="todo-app"><section id="todoapp" class="todoapp">
                <header id="header" class="header">
                    <h1>todos</h1>
                    <input id="new-todo" class="new-todo" placeholder="What needs to be done?" autofocus>
                </header>
                <main id="main" class="main">
                    <div class="toggle-all-container">
                        <input id="toggle-all" class="toggle-all" type="checkbox">
                        <label for="toggle-all">Mark all as complete</label>
                    </div>
                    <ul id="todo-list" class="todo-list"></ul>
                </main>
                <footer id="footer" class="footer"></footer>
            </section>
            <footer id="info" class="info">
                <p>Double-click to edit a todo</p>
                <p>Created by <a href="http://sindresorhus.com">Sindre Sorhus</a></p>
                <p>Updated by the TodoMVC Team</p>
                <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
            </footer>
        <script id="todo-template" type="text/x-handlebars-template">
            {{#this as |item index|}}
            <li class="{{#if item.completed}} completed{{/if}}" data-id="{{item.id}}"">
                <div class="view">
                    <input class="toggle" type="checkbox" {{#if item.completed}}checked{{/if}}>
                    <label>{{item.title}}</label>
                    <button class="destroy"></button>
                </div>
                <input class="edit" value="{{item.title}}">
            </li>
        {{/this}}
        </script>
        <script id="footer-template" type="text/x-handlebars-template">
            <span id="todo-count" class="todo-count"><strong>{{activeTodoCount}}</strong> {{activeTodoWord}} left</span>
            <ul id="filters" class="filters">
                <li>
                    <a {{#eq filter 'all'}}class="selected"{{/eq}} href="#/all">All</a>
                </li>
                <li>
                    <a {{#eq filter 'active'}}class="selected"{{/eq}}href="#/active">Active</a>
                </li>
                <li>
                    <a {{#eq filter 'completed'}}class="selected"{{/eq}}href="#/completed">Completed</a>
                </li>
            </ul>
            {{#if completedTodos}}<button class="clear-completed">Clear completed</button>{{/if}}
        </script>
        </div>
        `;

        // Dynamically load and inject the CSS into the shadow root
        try {
            const response = await fetch('/o/jquery/app.bundle.css');
            const cssText = await response.text();
            const style = document.createElement('style');
            style.textContent = cssText;

            this.shadowRoot.prepend(style);
        } catch (error) {
            console.error("Failed to load CSS:", error);
        }

        // Initialize the app logic
        this.initApp();
    }

    initApp() {
        const root = jQuery(this.shadowRoot);

        Handlebars.registerHelper('eq', (a, b) => a === b);

        const todoTemplateScript = root.find('#todo-template').html();
        const footerTemplateScript = root.find('#footer-template').html();

        if (!todoTemplateScript || !footerTemplateScript) {
            console.error('Templates are not defined in the shadow DOM.');
            return;
        }

        this.app = {
            todos: [],
            ENTER_KEY: 13,
            ESCAPE_KEY: 27,
            todoTemplate: Handlebars.compile(todoTemplateScript),
            footerTemplate: Handlebars.compile(footerTemplateScript),
        
            init: () => {
                this.app.todos = this.app.store('todos-jquery'); // Load stored todos
                this.app.bindEvents();
        
                new Router({
                    '/:filter': (filter) => {
                        this.app.filter = filter;
                        this.app.render();
                    }
                }).init('/all');
            },
        
            bindEvents: () => {
                root.find('#new-todo').on('keyup', (e) => this.app.create(e));
                root.find('#toggle-all').on('change', (e) => this.app.toggleAll(e));
                root.find('#footer').on('click', '.clear-completed', (e) => this.app.destroyCompleted(e));
                root.find('#todo-list')
                    .on('change', '.toggle', (e) => this.app.toggle(e))
                    .on('dblclick', 'label', (e) => this.app.edit(e))
                    .on('keyup', '.edit', (e) => this.app.editKeyup(e))
                    .on('focusout', '.edit', (e) => this.app.update(e))
                    .on('click', '.destroy', (e) => this.app.destroy(e));
            },
        
            // Utility methods
            uuid: () => {
                let uuid = '';
                for (let i = 0; i < 32; i++) {
                    let random = Math.random() * 16 | 0;
                    if (i === 8 || i === 12 || i === 16 || i === 20) {
                        uuid += '-';
                    }
                    uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
                }
                return uuid;
            },
        
            pluralize: (count, word) => {
                return count === 1 ? word : `${word}s`;
            },
        
            store: (namespace, data) => {
                if (data) {
                    localStorage.setItem(namespace, JSON.stringify(data));
                }
                const storeData = localStorage.getItem(namespace);
                return storeData ? JSON.parse(storeData) : [];
            },
        
            render: () => {
                const todos = this.app.getFilteredTodos();
                root.find('#todo-list').html(this.app.todoTemplate(todos));
                root.find('#main').toggle(todos.length > 0);
                root.find('#toggle-all').prop('checked', this.app.getActiveTodos().length === 0);
                this.app.renderFooter();
                root.find('#new-todo').focus();
            },
        
            renderFooter: () => {
                const todoCount = this.app.todos.length;
                const activeTodoCount = this.app.getActiveTodos().length;
                const template = this.app.footerTemplate({
                    activeTodoCount: activeTodoCount,
                    activeTodoWord: this.app.pluralize(activeTodoCount, 'item'),
                    completedTodos: todoCount - activeTodoCount,
                    filter: this.app.filter
                });
        
                root.find('#footer').toggle(todoCount > 0).html(template);
            },
        
            toggleAll: (e) => {
                const isChecked = jQuery(e.target).prop('checked');
                this.app.todos.forEach((todo) => todo.completed = isChecked);
                this.app.render();
            },
        
            getActiveTodos: () => this.app.todos.filter(todo => !todo.completed),
            getCompletedTodos: () => this.app.todos.filter(todo => todo.completed),
        
            getFilteredTodos: () => {
                if (this.app.filter === 'active') return this.app.getActiveTodos();
                if (this.app.filter === 'completed') return this.app.getCompletedTodos();
                return this.app.todos;
            },
        
            destroyCompleted: () => {
                this.app.todos = this.app.getActiveTodos();
                this.app.render();
            },
        
            create: (e) => {
                const $input = jQuery(e.target);
                const val = jQuery.trim($input.val());
                if (e.which !== this.app.ENTER_KEY || !val) return;
                this.app.todos.push({ id: this.app.uuid(), title: val, completed: false });
                $input.val('');
                this.app.render();
            },
        
            toggle: (e) => {
                const i = this.app.indexFromEl(e.target);
                this.app.todos[i].completed = !this.app.todos[i].completed;
                this.app.render();
            },
        
            edit: (e) => {
                const $input = jQuery(e.target).closest('li').addClass('editing').find('.edit');
                const title = jQuery(e.target).text();
                $input.trigger("focus").val("").val(title);
            },
        
            editKeyup: (e) => {
                if (e.which === this.app.ENTER_KEY) {
                    e.target.blur();
                }
        
                if (e.which === this.app.ESCAPE_KEY) {
                    jQuery(e.target).data('abort', true).blur();
                }
            },
        
            update: (e) => {
                const el = e.target;
                const $el = jQuery(el);
                const val = $el.val().trim();
        
                if (!val) {
                    this.app.destroy(e);
                    return;
                }
        
                if ($el.data('abort')) {
                    $el.data('abort', false);
                } else {
                    this.app.todos[this.app.indexFromEl(el)].title = val;
                }
        
                this.app.render();
            },
        
            destroy: (e) => {
                this.app.todos.splice(this.app.indexFromEl(e.target), 1);
                this.app.render();
            },
        
            indexFromEl: (el) => {
                const id = jQuery(el).closest('li').data('id');
                const todos = this.app.todos;
                let i = todos.length;
        
                while (i--) {
                    if (todos[i].id === id) {
                        return i;
                    }
                }
            },
        
                };

        // Initialize the app
        this.app.init();
    }
}

// Register the custom element
customElements.define('jquery-todo-mvc', JQueryTodoApp);
```

If you check the original file, this will look like a complete rewrite, and you'll be pretty close there...

The crux of the issue is that jQuery is just meant to run in the page, and converting it into a standard web component that leveraged the shadow DOM and stuff will really force your hand for refactoring.

The shadow DOM was a very tricky introduction because stylesheets outside don't necessarily apply themselves inside of the shadow DOM so you need to take care of that yourself.

My refactor includes the lines:

```javascript
// Dynamically load and inject the CSS into the shadow root
try {
    const response = await fetch('/o/jquery/app.bundle.css');
    const cssText = await response.text();
    const style = document.createElement('style');
    style.textContent = cssText;

    this.shadowRoot.prepend(style);
} catch (error) {
    console.error("Failed to load CSS:", error);
}
```

This would fetch the CSS bundle that Webpack is going to build for us and then manually attach it to the `shadowRoot` element inside the shadow DOM. It works, but at times it may feel a bit dirty.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist
    into: static
jquery-todo-mvc:
  cssURLs:
    - app.bundle.css
  friendlyURLMapping: jquery-todo-mvc
  htmlElementName: jquery-todo-mvc
  instanceable: false
  name: jQuery TODO MVC
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

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `jquery.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `jquery.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `jquery.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-11-04 18:54:33.961 INFO  [fileinstall-directory-watcher][BundleStartStopLogger:68] STARTED jquery_7.4.3.125 [1393]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *jQuery TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

The primary concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead rely on manual routing or something akin to React's `MemoryRouter`.
