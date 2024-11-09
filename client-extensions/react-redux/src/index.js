import React from "react";
import {render, unmountComponentAtNode} from 'react-dom';
import { createStore } from "redux";
import { Provider } from "react-redux";
import { HashRouter, Route } from "react-router-dom";
import App from "./app";
import reducer from "./reducers";

import "../../../todo-app-styles.css";
import "../../../todo-common-base.css";

const store = createStore(reducer);

class ReactReduxTodoAppComponent extends HTMLElement {
    connectedCallback() {
        render(
            <Provider store={store}>
                <HashRouter>
                    <Route path="*" component={App} />
                </HashRouter>
            </Provider>, this);
    }

    disconnectedCallback() {
        unmountComponentAtNode(this);
    }
}

const ELEMENT_NAME = 'react-redux-todo-mvc';

if (customElements.get(ELEMENT_NAME)) {
  // eslint-disable-next-line no-console
  console.log(`Skipping registration for <${ELEMENT_NAME}> (already registered)`);
} else {
  customElements.define(ELEMENT_NAME, ReactReduxTodoAppComponent);
}
