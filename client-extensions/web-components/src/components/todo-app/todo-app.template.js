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
