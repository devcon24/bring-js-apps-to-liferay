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
