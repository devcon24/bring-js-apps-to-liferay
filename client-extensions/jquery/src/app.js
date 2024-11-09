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
