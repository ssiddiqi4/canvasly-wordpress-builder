import { app } from "./app.js";
function installHooks() {
  const LB = (window.SidcraftSyntex = window.SidcraftSyntex || {});
  app.LB = LB;
  if (!LB.hooks) {
    const store = { actions: {}, filters: {} };
    const add = (kind) => (name, cb, priority, ns) => {
      if (typeof name !== "string" || !name || typeof cb !== "function") return false;
      const list = store[kind][name] || (store[kind][name] = []);
      list.push({
        cb,
        priority: Number.isFinite(+priority) ? +priority : 10,
        ns: ns ? String(ns) : "",
        seq: list.length,
      });
      list.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      return true;
    };
    const remove = (kind) => (name, target) => {
      const list = store[kind][name];
      if (!list) return 0;
      const keep = list.filter(
        (h) => !(target === void 0 || h.cb === target || (typeof target === "string" && h.ns === target)),
      );
      store[kind][name] = keep;
      return list.length - keep.length;
    };
    const has = (kind) => (name) => !!(store[kind][name] && store[kind][name].length);
    const report = (kind, name, e) => {
      if (window.console && console.error)
        console.error("[Sidcraft Syntex] " + kind + ' "' + name + '" callback failed:', e);
    };
    LB.hooks = {
      addAction: add("actions"),
      addFilter: add("filters"),
      removeAction: remove("actions"),
      removeFilter: remove("filters"),
      hasAction: has("actions"),
      hasFilter: has("filters"),
      doAction(name, ...args) {
        (store.actions[name] || []).slice().forEach((h) => {
          try {
            h.cb(...args);
          } catch (e) {
            report("action", name, e);
          }
        });
      },
      applyFilters(name, value, ...args) {
        let v = value;
        (store.filters[name] || []).slice().forEach((h) => {
          try {
            const r = h.cb(v, ...args);
            if (r !== void 0) v = r;
          } catch (e) {
            report("filter", name, e);
          }
        });
        return v;
      },
      _store: store,
    };
  }
  LB.controls = LB.controls || {};
  LB.registerControl =
    LB.registerControl ||
    function (type, def) {
      type = String(type || "").trim();
      if (!type || !def || typeof def.render !== "function") return false;
      LB.controls[type] = {
        render: def.render,
        read: typeof def.read === "function" ? def.read : null,
        bind: typeof def.bind === "function" ? def.bind : null,
      };
      LB.hooks.doAction("editor/control/registered", type, LB.controls[type]);
      if (LB._ready && typeof LB.render === "function") LB.render();
      return true;
    };
  LB.unregisterControl =
    LB.unregisterControl ||
    function (type) {
      return delete LB.controls[String(type || "")];
    };
  LB.ready =
    LB.ready ||
    function (cb) {
      if (typeof cb !== "function") return;
      if (LB._ready) cb(LB);
      else LB.hooks.addAction("editor/init", cb);
    };
  return LB;
}

export { installHooks };
