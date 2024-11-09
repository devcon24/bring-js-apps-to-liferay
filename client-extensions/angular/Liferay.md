# Liferay Client Extension Modifications

This file contains the details about changes made to convert the original code from (Todo MVC Angular Example)[https://github.com/tastejs/todomvc/tree/master/examples/angular] into a Liferay Frontend Client Extension.

## Prerequisites

The build of this application uses Angular's CLI tool version 17. Also, the workspace is configured to use yarn, so we will update the cli to also use yarn.

Install the cli using the command `yarn global add @angular/cli@17`. You can verify that the CLI is installed and ready using the command `ng version`.

And have the CLI use yarn with the command `ng config -g cli.packageManager yarn`.

Before making any modifications, it is recommended that you do an `ng build` to ensure that the project builds on its own. This way you'll know that the application is fine and you won't be trying ot debug Angular problems and Liferay CX problems at the same time.

## Modifications

There are four modifications that we need to make to the original project to transform it into a Liferay Custom Element Client Extension.

### Modify `package.json`

We need to modify `package.json`. First, change the name to `angular-todo-mvc`. This will help avoid conflicts with other apps that might be deployed.

We also need to add `@angular/elements` verison 17. We can either do this by using `yarn add @angular/elements@^17.0.0`.

Finally, I recommend disabling the `test` script. Once we make the changes, testing will likely not work (unless you change the project to support it) and can fail the builds. As long as the app works before you begin making your changes, the rest of your work is going to be testing in Liferay and fixing any deployment or runtime problems.

### Modify `angular.json`

There's a couple of changes that we need to make to the `angular.json` configuration file.

First, we need to find the line with `"outputHashing": "all"` and we need to change it to `"outputHashing": "none"`. When compiling and generating the build files, enabling the `outputHashing` will add unique suffixes to the generated files each time, so it will be difficult to reference them when building the Client Extension. Disabling the `outputHashing` will keep the names simple and will make our build easier.

Next, because we're using *yarn* and we're also in a Liferay Workspace, we need to modify paths for the styles. An of the paths that start with `node_modules/...` need to be changed to `../../node_modules/...`. For example, one of the CSS style files is listed as `node_modules/todomvc-app-css/index.css`, so it gets changed to `../../node_modules/todomvc-app-css/index.css`.

### Change `src/main.ts`

We're going to change completely the contents of `src/main.ts` to the following:

```javascript
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
```

This replaces the default of using `bootstrapApplication()` to start the Angular app with `createCustomElement()` that defines the Angular app as a standard web component (custom element).

We can use the `createCustomElement()` because of the addition of `@angular/elements` in `package.json` earlier.

### Create the `client-extension.yaml` File

This file will not already exist, we need to create the file. The contents of the file are:

```yaml
assemble:
  - from: dist/browser
    into: static
angular-todo-mvc:
  cssURLs:
    - styles.css
  friendlyURLMapping: angular-todo-mvc
  htmlElementName: angular-todo-mvc
  instanceable: false
  name: Angular TODO MVC
  portletCategoryName: category.client-extensions
  type: customElement
  urls:
    - polyfills.js
    - scripts.js
    - main.js
  useESM: true
```

The first key part is the `assemble` `from` location. You find the path to use here by invoking `ng build`, then see where the *js* and *css* files end up.

The next key part is the *name*, `friendlyURLMapping`, `htmlElementName` fields, these are set to match the custom element name that we used in the `src/main.ts` file.

The `name` attribute is set to the value that we will see in the Liferay UI content pages, so pick a name that will make sense to your page maintainers.

The final key part is the `cssURLs` and `urls` attributes. These list all of the individual CSS and JS files from the assemble/build directory, or in `dist/browser` in this particular case. Fortunately we have only one CSS file to worry about, but there are three different JS files. *Note* that these files are listed in the same order as the generated `dist/browser/index.html` script loading order; this can be very important otherwise you may get JS console errors when trying to use the custom element.

## Building

To just build and test the Angular application, you can use the commands `ng build` to build the artifacts. Before running though, you'll have to edit the `dist/browser/index.html` to replace the `<app-root></app-root>` with the new custom element, `<angular-todo-mvc></angular-todo-mvc>`. After saving this change, you can use `ng serve` to test it out. *Note* that you can't just open the HTML file directly in the browser, it will fail to load the resources because of CORS errors.

To build the client extension, use either `blade gw buildClientExtensionZip` or `../../gradlew buildClientExtensionZip` which will generate a file named `angular.zip` inside of the `dist` folder. This _is_ your client extension file, ready for deployment.

## Deployment

When using your local bundle, you would deploy using the command `blade gw deploy` or `../../gradlew deploy` which will take your `angular.zip` file and push it to the `bundles/osgi/client-extensions` folder.

Alternatively you can manually put the `angular.zip` file into the `osgi/client-extensions` folder in a self-hosted or PaaS environment, or you can use the LCP command line tool to push to a SaaS or PaaS environment.

## Testing

After deploying, you should see a message in the Liferay logs like:

```
2024-10-31 20:44:55.743 INFO  [Refresh Thread: Equinox Container: 807b20cb-b18c-4b39-83ae-4e39843088f4][BundleStartStopLogger:68] STARTED angular_7.4.3.125 [1392]
```

This implies that your new client extension is ready for use.

To test, log in as the Liferay administrator, edit a content page and place the new *Angular TODO MVC* fragment on the page and publish the page. Test the page and note that it works.

## Concerns

So the first concern is likely that the page renders poorly, very narrow even on a wide desktop window. This is due to the default styles set for the oringal TODO application.

When you check the `../../node_modules/todomvc-app-css/index.css` file, you'll see that it has styles assigned explicitly to the `<body>` tag that set styles that apply to Liferay. To resolve this issue, there are different stylesheets to use. Edit the `angular.json` file and replace the use of `../../node_modules/todomvc-app-css/index.css` with `../../todo-app-styles.css` and `../../node_modules/todomvc-common/base.css` gets replaced with `../../todo-common-base.css`.

The next concern is the use of the address bar and hashing. The application of course depends upon these features for presentation, but Liferay will not respect them, and it will also cause problems if you build and deploy a different implementation of the Todo MVC application and use it on the same page. The general rule for Liferay is _never use the address bar_ because Liferay owns it, not your application. While your app will work while you stay on the one page, it will break as you navigate around the portal. It is often better to remove address bar usage/hashing and instead rely on manual routing or the framework's equivalent of React's `MemoryRouter`.
