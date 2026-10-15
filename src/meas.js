"use strict";
const Meas = (() => {
  const N = 20; let running = false, cancel = false;
  const get = () => store.get("meas", {});
  const stats = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return { m, sd: Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length), n: a.length }; };
  const busy = (b) => { running = b; q("measB").disabled = q("measA").disabled = b; q("measX").style.display = b ? "" : "none"; };
  async function capture(slot) {
    if (running) return;
    if (typeof invoke === "undefined" || !invoke) return toast("Measurement needs the STRYV backend.", true);
    busy(true); cancel = false; const cpu = [], mem = [], pc = [];
    for (let i = 0; i < N && !cancel; i++) {
      try { const s = await invoke("get_snapshot"); cpu.push(s.cpu_usage); mem.push(s.mem_used / 1073741824); if (s.process_count > 0) pc.push(s.process_count); } catch (e) { Tech.add("measure", e); }
      q("measS").textContent = `Measuring… ${i + 1}/${N}`; await new Promise((r) => setTimeout(r, 1000));
    }
    busy(false);
    if (cancel) { q("measS").textContent = "Cancelled."; return; }
    if (cpu.length < N * .7) { q("measS").textContent = "Too few samples were collected, so this measurement was discarded."; toast("Measurement failed", true); return; }
    const d = get(); d[slot] = { t: Date.now(), cpu: stats(cpu), mem: stats(mem), pc: pc.length >= N * .7 ? stats(pc) : null }; store.set("meas", d);
    Act.log({ text: "Measurement captured: " + (slot === "base" ? "baseline" : "comparison"), detail: JSON.stringify(d[slot]) });
    q("measS").textContent = "Done."; render();
  }
  function row(label, unit, b, a, minStep, dp) {
    const f = (s) => s ? `${s.m.toFixed(dp)}${unit} <small style="color:var(--m)">±${s.sd.toFixed(dp)}</small>` : "—";
    let out = "—";
    if (b && a) {
      const diff = a.m - b.m, noise = 2 * Math.sqrt(b.sd ** 2 / b.n + a.sd ** 2 / a.n);
      out = Math.abs(diff) > Math.max(noise, minStep) ? `<b>${diff < 0 ? "Lower" : "Higher"} by ${Math.abs(diff).toFixed(dp)}${unit}</b>` : "No clear change";
    }
    return `<tr><td style="color:var(--t)">${label}</td><td class="n">${f(b)}</td><td class="n">${f(a)}</td><td class="n" style="width:170px">${out}</td></tr>`;
  }
  function render() {
    const d = get(), b = d.base, a = d.comp;
    if (!b && !a) { q("measT").innerHTML = ""; return; }
    q("measT").innerHTML = `<tr><td></td><td class="n">Baseline</td><td class="n">Comparison</td><td class="n" style="width:170px">Result</td></tr>` +
      row("CPU use (average)", "%", b && b.cpu, a && a.cpu, 1, 1) + row("Memory in use", " GB", b && b.mem, a && a.mem, .1, 2) + row("Running processes", "", b && b.pc, a && a.pc, 1, 0) +
      `<tr><td colspan="4"><small style="color:var(--m)">Baseline ${b ? new Date(b.t).toLocaleString() : "not captured"} · Comparison ${a ? new Date(a.t).toLocaleString() : "not captured"}. A single before-and-after pair cannot prove what caused a difference; other apps may have changed.</small></td></tr>`;
  }
  q("measB").onclick = () => capture("base"); q("measA").onclick = () => capture("comp"); q("measX").onclick = () => { cancel = true; };
  q("measC").onclick = () => { store.set("meas", {}); q("measS").textContent = ""; render(); toast("Measurements cleared"); };
  render();
  return { render };
})();
