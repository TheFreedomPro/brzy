(() => {
  const $ = (id) => document.getElementById(id);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const money0 = (n) =>
    (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });

  const BATTERIES = [
    { id: "PW3", label: "Tesla Powerwall 3", usableKwh: 13.5, powerKw: 11.5 },
    { id: "PW2", label: "Tesla Powerwall 2", usableKwh: 13.5, powerKw: 5.0 },
    { id: "FRANKLIN", label: "FranklinWH (aPower)", usableKwh: 13.6, powerKw: 5.0 }
  ];

  const PROGRAMS = {
    APS_TESLA_VPP: {
      capPerBatteryYear: 800,
      note:
        "APS Tesla VPP annual performance model. Credit scales toward cap based on event participation."
    },
    SRP_BATTERY_PARTNER: {
      ratePerKwSeason: 55,
      seasonsPerYear: 2,
      note:
        "SRP Battery Partner pays $55 per kW per season (2 seasons per year)."
    }
  };

  function wireBatteryCalc() {
    const programEl = $("program");
    const modelEl = $("batteryModel");
    const qtyEl = $("batteryQty");
    const peakDemandEl = $("peakDemandKw");
    const autoFromDemandEl = $("autoFromDemand");
    const commitEl = $("commitKw");
    const perfEl = $("perf");

    const usableEl = $("usableKwh");
    const powerEl = $("powerKw");
    const creditedEl = $("creditedKw");

    const btn = $("calcBatteryBtn");
    const monthlyOut = $("monthlyCredit");
    const annualOut = $("annualCredit");
    const noteOut = $("creditNote");

    if (
      !programEl || !modelEl || !qtyEl || !peakDemandEl || !autoFromDemandEl ||
      !commitEl || !perfEl || !usableEl || !powerEl || !creditedEl ||
      !btn || !monthlyOut || !annualOut || !noteOut
    ) return;

    modelEl.innerHTML = BATTERIES.map(b =>
      `<option value="${b.id}">${b.label}</option>`
    ).join("");

    function getBattery() {
      return BATTERIES.find(b => b.id === modelEl.value) || BATTERIES[0];
    }

    function updateDerived() {
      const b = getBattery();
      const qty = clamp(parseInt(qtyEl.value || "1", 10), 1, 99);
      const perf = clamp(num(perfEl.value, 0.85), 0, 1);

      const maxPower = b.powerKw * qty;
      const usable = b.usableKwh * qty * perf;

      usableEl.value = usable.toFixed(1);
      powerEl.value = maxPower.toFixed(1);

      const commitPerBattery = clamp(num(commitEl.value, 4.5), 0, 1e6);
      const creditedRaw = commitPerBattery * qty * perf;
      const credited = Math.min(creditedRaw, maxPower * perf);

      creditedEl.value = credited.toFixed(2);

      return { b, qty, perf, maxPower, commitPerBattery, credited };
    }

    function calcCredit() {
      const { b, qty, perf, maxPower, commitPerBattery, credited } = updateDerived();
      const programKey = programEl.value;

      let annual = 0;
      let monthly = 0;

      if (programKey === "SRP_BATTERY_PARTNER") {
        const p = PROGRAMS.SRP_BATTERY_PARTNER;
        const ratePerKwYear = p.ratePerKwSeason * p.seasonsPerYear;
        annual = credited * ratePerKwYear;
      } else {
        const p = PROGRAMS.APS_TESLA_VPP;
        const cap = p.capPerBatteryYear * qty;
        const maxCreditable = maxPower * perf;
        const utilization = maxCreditable > 0
          ? clamp(credited / maxCreditable, 0, 1)
          : 0;
        annual = cap * utilization;
      }

      monthly = annual / 12;

      annualOut.textContent = money0(annual);
      monthlyOut.textContent = money0(monthly);

      noteOut.textContent =
        `Battery: ${b.label}. Qty: ${qty}. Performance: ${Math.round(perf * 100)}%. Credited kW: ${credited.toFixed(2)}.`;
    }

    programEl.addEventListener("change", calcCredit);
    modelEl.addEventListener("change", calcCredit);
    qtyEl.addEventListener("input", calcCredit);
    peakDemandEl.addEventListener("input", calcCredit);
    autoFromDemandEl.addEventListener("change", calcCredit);
    commitEl.addEventListener("input", calcCredit);
    perfEl.addEventListener("input", calcCredit);
    btn.addEventListener("click", calcCredit);

    calcCredit();
  }

  document.addEventListener("DOMContentLoaded", wireBatteryCalc);
})();
