import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import {AppComponent} from "./app/app.component";
import {provideRouter, withHashLocation} from "@angular/router";
import {routes} from "./app/app.routes";

(async () => {
  const app = await createApplication({
    providers: [
      provideRouter(routes, withHashLocation())
    ],
  });
  const toogleElement = createCustomElement(AppComponent, {
    injector: app.injector,
  });
  customElements.define('angular-todo-mvc', toogleElement);
})();
