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

