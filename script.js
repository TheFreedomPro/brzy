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

  const money2 = (n) =>
    (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const annualToMonthly = (r) => (1 + r) ** (1 / 12) - 1;

  function sumSeries(month0, annualR, years) {
    const m0 = clamp(num(month0, 0), 0, 1e9);
    const Y = clamp(parseInt(years || 25, 10), 1, 30);
    const rm = annualR ? annualToMonthly(num(annualR, 0)) : 0;

    let total = 0;
    let m = m0;

    for (let i = 0; i < Y * 12; i++) {
      total += m;
      m *= 1 + rm;
    }
    return total;
  }

  function monthAtYear(month0, annualR, year) {
    const m0 = clamp(num(month0, 0), 0, 1e9);
    const y = clamp(parseInt(year || 1, 10), 1, 30);
    const rm = annualR ? annualToMonthly(num(annualR, 0)) : 0;
    const months = y * 12 - 1;
    return m0 * (1 + rm) ** months;
  }

  function wireMainCalc() {

    const billEl = $("bill");
    const solarEl = $("solarPayment");
    const yearsEl = $("yearsRange");
    const yearsDisplayEl = $("yearsDisplay");
    const utilEscEl = $("utilityEsc");
    const solarEscEl = $("solarEsc");
    const runBtn = $("runBtn");

    if (!billEl || !solarEl || !yearsEl || !yearsDisplayEl || !utilEscEl || !solarEscEl || !runBtn) return;

    const utilTotalEl = $("utilTotal");
    const solarTotalEl = $("solarTotal");
    const savingsEl = $("savings");
    const snapYearEl = $("snapYear");
    const selMonthlyUtilityEl = $("selMonthlyUtility");
    const selMonthlySolarEl = $("selMonthlySolar");
    const selMonthlySavingsEl = $("selMonthlySavings");
    const selAnnualSavingsEl = $("selAnnualSavings");

    function recalc() {

      const bill = num(billEl.value, 0);
      const solar = num(solarEl.value, 0);
      const years = clamp(parseInt(yearsEl.value || "25", 10), 1, 30);

      const utilEsc = clamp(num(utilEscEl.value, 0.09), 0, 0.5);
      const solarEsc = clamp(num(solarEscEl.value, 0), 0, 0.5);

      yearsDisplayEl.textContent = String(years);

      const utilTotal = sumSeries(bill, utilEsc, years);
      const solarTotal = sumSeries(solar, solarEsc, years);
      const savings = utilTotal - solarTotal;

      utilTotalEl.textContent = money0(utilTotal);
      solarTotalEl.textContent = money0(solarTotal);
      savingsEl.textContent = money0(savings);

      snapYearEl.textContent = String(years);

      const uM = monthAtYear(bill, utilEsc, years);
      const sM = monthAtYear(solar, solarEsc, years);
      const mS = Math.max(0, uM - sM);
      const aS = mS * 12;

      selMonthlyUtilityEl.textContent = money2(uM);
      selMonthlySolarEl.textContent = money2(sM);
      selMonthlySavingsEl.textContent = money2(mS);
      selAnnualSavingsEl.textContent = money2(aS);
    }

    billEl.addEventListener("input", recalc);
    solarEl.addEventListener("input", recalc);
    yearsEl.addEventListener("input", recalc);
    solarEscEl.addEventListener("change", recalc);
    runBtn.addEventListener("click", recalc);

    recalc();
  }

  const BATTERIES = [
    { id: "PW3", label: "Tesla Powerwall 3", usableKwh: 13.5, powerKw: 11.5 },
    { id: "FRANKLIN", label: "FranklinWH (aPower)", usableKwh: 13.6, powerKw: 5.0 }
  ];

  const PROGRAMS = {
    APS_TESLA_VPP: {
      ratePerKwYear: 110,
      capPerBatteryYear: 400,
      note: "APS Tesla VPP estimate. Annual per-battery cap applied."
    },
    APS_KW_REWARD: {
      ratePerKwYear: 110,
      capPerBatteryYear: null,
      note: "APS kW-based estimate using ~$110 per kW-year."
    },
    SRP_BATTERY_PARTNER: {
      ratePerKwYear: 110,
      capPerBatteryYear: null,
      note: "SRP Battery Partner: $55 per kW per season × 2 seasons."
    }
  };

  function wireBatteryCalc() {

    const programEl = $("program");
    const modelEl = $("batteryModel");
    const qtyEl = $("batteryQty");
    const commitEl = $("commitKw");
    const perfEl = $("perf");

    const usableEl = $("usableKwh");
    const powerEl = $("powerKw");
    const creditedEl = $("creditedKw");

    const btn = $("calcBatteryBtn");
    const monthlyOut = $("monthlyCredit");
    const annualOut = $("annualCredit");
    const noteOut = $("creditNote");

    if (!programEl || !modelEl || !qtyEl || !commitEl || !perfEl ||
        !usableEl || !powerEl || !creditedEl ||
        !btn || !monthlyOut || !annualOut || !noteOut) return;

    modelEl.innerHTML = BATTERIES
      .map(b => `<option value="${b.id}">${b.label}</option>`)
      .join("");

    const getBattery = () =>
      BATTERIES.find(b => b.id === modelEl.value) || BATTERIES[0];

    function calcCredit() {

      const b = getBattery();
      const qty = clamp(parseInt(qtyEl.value || "1", 10), 1, 99);
      const perf = clamp(num(perfEl.value, 0.85), 0, 1);
      const commitPerBattery = clamp(num(commitEl.value, 3), 0, 100);

      const usable = b.usableKwh * qty * perf;
      const maxPower = b.powerKw * qty * perf;

      usableEl.value = usable.toFixed(1);
      powerEl.value = maxPower.toFixed(1);

      const credited = Math.min(commitPerBattery * qty * perf, maxPower);
      creditedEl.value = credited.toFixed(2);

      const programKey = programEl.value;
      const p = PROGRAMS[programKey] || PROGRAMS.APS_TESLA_VPP;

      let annual = credited * p.ratePerKwYear;

      if (p.capPerBatteryYear != null) {
        const cap = p.capPerBatteryYear * qty;
        annual = Math.min(annual, cap);
      }

      const monthly = annual / 12;

      annualOut.textContent = money0(annual);
      monthlyOut.textContent = money0(monthly);
      noteOut.textContent =
        `${p.note} Credited kW: ${credited.toFixed(2)}.`;
    }

    programEl.addEventListener("change", calcCredit);
    modelEl.addEventListener("change", calcCredit);
    qtyEl.addEventListener("input", calcCredit);
    commitEl.addEventListener("input", calcCredit);
    perfEl.addEventListener("input", calcCredit);
    btn.addEventListener("click", calcCredit);

    calcCredit();
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireMainCalc();
    wireBatteryCalc();
  });

})();