// Access to Esolite's top-level script bindings.
//
// Many Esolite functions are declared with `let` at the top level of classic scripts
// (e.g. static/js/characterManager.js). Such bindings live in the page's global lexical
// scope: visible to every classic script, but NOT properties of `window`. A function
// created with `new Function` runs in the global scope and can read and reassign them.

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function hostGet(name) {
    if (!IDENT.test(name)) return undefined;
    try { return new Function(`return typeof ${name} === 'undefined' ? undefined : ${name};`)(); }
    catch (_) { return undefined; }
}

// Reassign an existing binding (and mirror it on window when it is also exposed there).
export function hostSet(name, value) {
    if (!IDENT.test(name) || hostGet(name) === undefined) return false;
    try {
        new Function('v', `${name} = v;`)(value);
        if (Object.prototype.hasOwnProperty.call(window, name)) window[name] = value;
        return true;
    } catch (_) { return false; }
}

// Esolite's mod hooks (static/js/modHooks.js, Esobold after 1.35.0): the registry
// window.eso.extensions plus one class per extension type (QuickStartExtension +
// EsoExtensionType.QUICK_START, SettingsExtension + SETTINGS, GuideExtension + GUIDE).
// Returns the class when this host supports that type, else null (older host: use a fallback).
export function esoExtensionClass(className, typeName) {
    const registry = window.eso && window.eso.extensions;
    const cls = hostGet(className), types = hostGet('EsoExtensionType');
    if (!registry || typeof registry.register !== 'function' || typeof cls !== 'function' || !types || !types[typeName]) return null;
    return cls;
}
