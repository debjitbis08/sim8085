export function isFeatureEnabled(name) {
    try {
        return localStorage.getItem(`feature:${name}`) === "true";
    } catch (e) {
        return false;
    }
}

export function setFeatureEnabled(name, enabled) {
    try {
        localStorage.setItem(`feature:${name}`, enabled ? "true" : "false");
    } catch (e) {}
}
