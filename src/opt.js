"use strict";
const Opt = (() => {
  let cat = [], snaps = {}, cur = null, su = [];
  const yn = (b) => b ? "Yes" : "No";
  async function load() {
    if (typeof invoke === "undefined" || !invoke) { q("optList").innerHTML = '<p class="empty">Unavailable: the STRYV backend is not connected.</p>'; return; }
    try { cat = await invoke("opt_catalog"); snaps = await invoke("opt_snapshots"); render(); } catch (e) { Tech.add("opt.load", e); q("optList").innerHTML = '<p class="empty">Could not load optimizations.</p>'; }
    await loadStartup();
  }
  async function loadStartup() {
    try {
      su = await invoke("opt_startup");
      q("startT").innerHTML = su.length ? su.map((x, i) => `<tr><td style="color:var(--t)">${esc(x.name)}<br><small style="color:var(--m)">${esc(x.command.length > 60 ? x.command.slice(0, 60) + "…" : x.command)}</small></td><td class="n"><button class="tog" data-su="${i}" aria-pressed="${x.enabled}" aria-label="Run ${esc(x.name)} at startup"></button></td></tr>`).join("") : "<tr><td>No user startup entries found.</td></tr>";
      document.querySelectorAll("[data-su]").forEach((b) => b.onclick = () => toggleStartup(su[b.dataset.su]));
    } catch (e) { Tech.add("opt.startup", e); q("startT").innerHTML = "<tr><td>Unavailable</td></tr>"; }
  }
  async function toggleStartup(x) {
    const next = !x.enabled;
    if (!await confirmBox({ title: (next ? "Enable " : "Disable ") + x.name + " at startup?", body: next ? "It will start automatically at your next sign-in." : "It will stop starting automatically at your next sign-in. You can turn it back on here at any time. The app itself is not removed.", yes: next ? "Enable" : "Disable" })) return;
    const aid = Act.log({ text: (next ? "Enabling startup: " : "Disabling startup: ") + x.name, status: "running" });
    try { const r = await invoke("opt_startup_set", { name: x.name, enabled: next }); Act.update(aid, { status: "done", detail: JSON.stringify({ name: x.name, enabled: next }) }); toast(r.message); }
    catch (e) { Act.update(aid, { status: "failed", detail: String(e) }); Tech.add("opt.startup_set", e); toast("Could not change startup: " + e, true); }
    loadStartup();
  }
  function render() {
    q("optList").innerHTML = cat.map((o) => `<div class="orow"><div><b>${esc(o.title)}</b><small>${esc(o.what)}</small><div class="chips"><span class="chip ${o.reversible ? "g" : "w"}">${o.reversible ? "Reversible" : "Not reversible"}</span><span class="chip">Admin: ${yn(o.admin)}</span><span class="chip">Restart: ${yn(o.restart)}</span></div>${o.available ? "" : `<small>${esc(o.reason || "Unavailable")}</small>`}</div>
      <div class="acts">${snaps[o.id] ? `<button class="btn ghost" data-rb="${o.id}">Roll back</button>` : ""}<button class="btn" data-rv="${o.id}" ${o.available ? "" : "disabled"}>Review</button></div></div>`).join("");
    document.querySelectorAll("[data-rv]").forEach((b) => b.onclick = () => review(b.dataset.rv));
    document.querySelectorAll("[data-rb]").forEach((b) => b.onclick = () => rollback(b.dataset.rb));
  }
  async function review(id) {
    cur = cat.find((o) => o.id === id); q("rvT").textContent = cur.title; q("rvB").innerHTML = '<p class="empty">Reading current state…</p>'; q("rvYes").disabled = true; q("rv").classList.add("on");
    try {
      const pv = await invoke("opt_preview", { id });
      cur.pv = pv;
      q("rvB").innerHTML = `<h4>What changes</h4><p>${esc(cur.what)}</p><h4>Why it may help</h4><p>${esc(cur.why)}</p><h4>Trade-offs</h4><p>${esc(cur.tradeoffs)}</p><h4>Preview</h4><p>${esc(pv.summary)}</p>` +
        (pv.choices.length ? `<select id="rvSel" aria-label="Choice">${pv.choices.map((c) => `<option value="${esc(c.value)}">${esc(c.label)}</option>`).join("")}</select>` : "") +
        `<h4>Details</h4><p>Admin needed: ${yn(cur.admin)} · Restart needed: ${yn(cur.restart)} · ${cur.reversible ? "Can be rolled back from this page" : '<span class="warn">Cannot be undone</span>'}</p>`;
      q("rvYes").disabled = !pv.choices.length && id === "power_plan";
      q("rvYes").focus();
    } catch (e) { Tech.add("opt.preview", e); q("rvB").innerHTML = `<p class="warn">Could not read the current state: ${esc(e)}</p>`; }
  }
  function close() { q("rv").classList.remove("on"); cur = null; }
  async function apply() {
    if (!cur) return; const o = cur, sel = q("rvSel"), value = sel ? sel.value : null; close();
    const aid = Act.log({ text: "Applying: " + o.title, status: "running" });
    try { const r = await invoke("opt_apply", { id: o.id, value }); Act.update(aid, { status: "done", detail: JSON.stringify(r) }); toast(r.message); }
    catch (e) { Act.update(aid, { status: "failed", detail: String(e) }); Tech.add("opt.apply", e); toast("Could not apply: " + e, true); }
    load();
  }
  async function rollback(id) {
    const o = cat.find((x) => x.id === id);
    if (!await confirmBox({ title: "Roll back " + o.title.toLowerCase() + "?", body: "STRYV will restore the setting it saved before the change.", yes: "Roll back" })) return;
    const aid = Act.log({ text: "Rolling back: " + o.title, status: "running" });
    try { const r = await invoke("opt_rollback", { id }); Act.update(aid, { status: "done", detail: JSON.stringify(r) }); toast(r.message); }
    catch (e) { Act.update(aid, { status: "failed", detail: String(e) }); Tech.add("opt.rollback", e); toast("Rollback failed: " + e, true); }
    load();
  }
  q("rvNo").onclick = close; q("rvYes").onclick = apply; q("rv").onmousedown = (e) => { if (e.target === q("rv")) close(); };
  return { load, close };
})();
