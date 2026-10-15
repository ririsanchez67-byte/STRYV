"use strict";
const Sensors = (() => {
  const on = (id) => q(id).classList.contains("on");
  let busy = false, lastLink = 0, gpuNote = "";
  const n = (v, d = 0, u = "") => v == null ? "N/A" : v.toFixed(d) + u;
  async function poll() {
    if (busy || typeof invoke === "undefined" || !invoke) return;
    const dash = on("dashboard"), perf = on("performance"), net = on("network");
    if (!dash && !perf && !net) return;
    busy = true;
    try {
      if (dash || perf) {
        let gpus = [], temps = [], gpuErr = "";
        try { gpus = await invoke("get_gpu"); } catch (e) { gpuErr = String(e); }
        try { temps = await invoke("get_temps"); } catch (e) { Tech.add("sensors.temps", e); }
        const hot = [...temps.map((t) => ({ l: t.label, c: t.celsius })), ...gpus.filter((g) => g.temp != null).map((g) => ({ l: g.name, c: g.temp }))].sort((a, b) => b.c - a.c)[0];
        q("tempB").textContent = hot ? hot.c.toFixed(0) + " °C" : "Unavailable";
        q("tempD").textContent = hot ? "Highest reading: " + hot.l : "Windows did not expose temperature sensors to STRYV.";
        if (perf) {
          q("gpuB").innerHTML = gpus.length ? gpus.map((g) => `<table><tr><td style="color:var(--t)">${esc(g.name)}</td><td class="n">${n(g.util, 0, "% load")}</td><td class="n">${n(g.temp, 0, " °C")}</td></tr><tr><td>Memory</td><td class="n">${g.mem_used != null && g.mem_total ? (g.mem_used / 1024).toFixed(1) + " / " + (g.mem_total / 1024).toFixed(1) + " GB" : "N/A"}</td><td class="n">${n(g.clock, 0, " MHz")}</td></tr></table>`).join("") : `<small>Unavailable: ${esc(gpuErr || "no GPU data returned.")}</small>`;
          q("tempT").innerHTML = temps.length ? temps.map((t) => `<tr><td style="color:var(--t)">${esc(t.label)}</td><td class="n">${t.celsius.toFixed(0)} °C</td></tr>`).join("") : "<tr><td>Unavailable</td></tr>";
          q("tempN").textContent = temps.length ? "" : "Many Windows PCs do not expose CPU temperature without a dedicated sensor driver. STRYV shows nothing rather than guessing.";
        }
      }
      if (net && Date.now() - lastLink > 9000) {
        lastLink = Date.now();
        try { const l = await invoke("get_link_speeds"); q("linkT").innerHTML = l.length ? l.map((x) => `<tr><td style="color:var(--t)">${esc(x.name)}</td><td class="n">${esc(x.speed)}</td></tr>`).join("") : "<tr><td>No active adapters reported.</td></tr>"; }
        catch (e) { Tech.add("sensors.link", e); q("linkT").innerHTML = "<tr><td>Unavailable</td></tr>"; }
      }
    } finally { busy = false; }
  }
  setInterval(poll, 5000);
  return { poll };
})();
