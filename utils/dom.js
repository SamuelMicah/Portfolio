export function byId(id, root = document) {
    return root.getElementById(id);
}

export function escapeHtml(value) {
    if (value === null || value === undefined) return '';

    return value
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function resolveUrl(path, baseUrl) {
    return new URL(path.replace(/^\.\//, ''), baseUrl).href;
}

export function setRootVars(vars) {
    for (const [name, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(name, value);
    }
}

export function setVisible(element, visible) {
    element?.classList.toggle("hidden", !visible);
}

export function on(element, type, handler, options) {
    element?.addEventListener(type, handler, options);
}
