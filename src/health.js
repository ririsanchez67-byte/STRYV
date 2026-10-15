"use strict";
const Health = (() => {
  const cpu = []; let last = null;
  const lvl = (v, w, h) => v >= h ? "high" : v >= w ? "watch" : "ok";
  const LAB = { ok: "Good", watch: "Watch", high: "High", na: "Collecting" };
  const gb = (b) => (b / 1073741824).toFixed(1);
  function push(s) { cpu.push(s.cpu_usage); if (cpu.length > 30) cpu.shift(); last = s; render(); }
  function render() {
    const el = q("health"); if (!el || !last) return;
    const s = last, rows = [], secs = cpu.length * (Cfg.v.interval || 2);
    const memP = s.mem_used / s.mem_total * 100;
    rows.push(["Memory", lvl(memP, 70, 85), `${memP.toFixed(0)}% in use (${gb(s.mem_used)} of ${gb(s.mem_total)} GB)`, "Current reading"]);
    if (cpu.length < 5) rows.push(["CPU load", "na", "Gathering enough readings to judge sustained load.", `${cpu.length} readings so far`]);
    else {
      const avg = cpu.reduce((a, b) => a + b, 0) / cpu.length, l = lvl(avg, 70, 90), top = window.LastProcs && window.LastProcs[0];
      rows.push(["CPU load", l, `${avg.toFixed(0)}% average over the last ${secs}s` + (l !== "ok" && top ? `. Top process: ${top.name} (${top.cpu.toFixed(1)}% of total CPU).` : ""), `Average of ${cpu.length} readings`]);
    }
    const ds = (s.disks || []).filter((d) => d.total > 0).map((d) => ({ n: d.name, f: d.available / d.total * 100 })).sort((a, b) => a.f - b.f)[0];
    rows.push(ds ? ["Storage space", ds.f < 10 ? "high" : ds.f < 20 ? "watch" : "ok", `${ds.n} has ${ds.f.toFixed(0)}% free, the lowest of your drives`, "Current reading"] : ["Storage space", "na", "No drive information was returned.", "Unavailable"]);
    const days = s.uptime_secs / 86400;
    rows.push(["Uptime", days >= 14 ? "watch" : "ok", `${days.toFixed(1)} days since the last restart` + (days >= 14 ? ". A restart applies pending updates and clears long-running memory use." : ""), "Current reading"]);
    el.innerHTML = `<label>System health</label>` + rows.map((r) => `<div class="hrow"><i class="hd ${r[1]}"></i><div><b>${esc(r[0])}</b><span class="hl ${r[1]}">${LAB[r[1]]}</span><small>${esc(r[2])} · <em>${esc(r[3])}</em></small></div></div>`).join("") + `<small class="hnote">Based on simple guideline thresholds, not a diagnosis. Temperatures and GPU data are not measured yet.</small>`;
  }
  return { push };
})();
