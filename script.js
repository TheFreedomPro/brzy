// Solar Savings Calculator — clean, robust
document.addEventListener('DOMContentLoaded', () => {
  // Inputs
  const billInput         = document.getElementById('bill');
  const solarInput        = document.getElementById('solarPayment');
  const yearsRange        = document.getElementById('yearsRange');
  const yearsDisplay      = document.getElementById('yearsDisplay');
  const utilityEscInput   = document.getElementById('utilityEsc');  // fixed 9%
  const solarEscSelect    = document.getElementById('solarEsc');

  // Totals
  const utilTotalEl  = document.getElementById('utilTotal');
  const solarTotalEl = document.getElementById('solarTotal');
  const savingsEl    = document.getElementById('savings');

  // Snapshot
  const snapYearEl           = document.getElementById('snapYear');
  const selMonthlyUtilityEl  = document.getElementById('selMonthlyUtility');
  const selMonthlySolarEl    = document.getElementById('selMonthlySolar');
  const selMonthlySavingsEl  = document.getElementById('selMonthlySavings');
  const selAnnualSavingsEl   = document.getElementById('selAnnualSavings');

  const runBtn = document.getElementById('runBtn');

  // Helpers
  const fmtMoney = n =>
    (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  // Sum a monthly series with annual escalator r across Y years.
  // Treat inputs as dollars/month; escalator applies annually (compounded monthly).
  function sumSeries(month0, r, years) {
    const m0 = Math.max(0, Number(month0) || 0);
    const Y  = Math.max(1, Math.min(30, Number(years) || 1));
    const rm = Number(r) ? (1 + Number(r)) ** (1/12) - 1 : 0;  // convert annual to monthly
    let total = 0, m = m0;
    for (let i = 0; i < Y * 12; i++) {
      total += m;
      m *= (1 + rm);
    }
    return total;
  }

  function monthAtYear(month0, r, year) {
    const m0 = Math.max(0, Number(month0) || 0);
    const rm = Number(r) ? (1 + Number(r)) ** (1/12) - 1 : 0;
    const months = Math.max(0, (Number(year) || 1) * 12 - 1);
    return m0 * (1 + rm) ** months;
  }

  function recalc() {
    const bill   = parseFloat(billInput.value) || 0;
    const solar  = parseFloat(solarInput.value) || 0;
    const years  = Math.max(1, Math.min(30, parseInt(yearsRange.value || '25', 10)));

    const utilEsc = parseFloat(utilityEscInput.value || '0.09') || 0.09; // fixed 9%
    const solEsc = Number(solarEscSelect.value);

    // Totals
    const utilTotal  = sumSeries(bill,  utilEsc, years);
    const solarTotal = sumSeries(solar, solEsc,  years);
    const savings    = utilTotal - solarTotal;

    utilTotalEl.textContent  = fmtMoney(utilTotal);
    solarTotalEl.textContent = fmtMoney(solarTotal);
    savingsEl.textContent    = fmtMoney(savings);

    // Yearly snapshot (selected end year)
    yearsDisplay.textContent = years;
    snapYearEl.textContent   = years;

    const uM = monthAtYear(bill,  utilEsc, years);
    const sM = monthAtYear(solar, solEsc,  years);
    const mS = Math.max(0, uM - sM);
    const aS = mS * 12;

    selMonthlyUtilityEl.textContent = fmtMoney(uM);
    selMonthlySolarEl.textContent   = fmtMoney(sM);
    selMonthlySavingsEl.textContent = fmtMoney(mS);
    selAnnualSavingsEl.textContent  = fmtMoney(aS);
  }

  // Live interactions
  [billInput, solarInput].forEach(el => el.addEventListener('input', recalc));
  yearsRange.addEventListener('input', recalc);
  solarEscSelect.addEventListener('change', recalc);
  runBtn.addEventListener('click', recalc);
// --- TaxHive FAQ accordion ---
document.querySelectorAll('.faq-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('aria-controls');
    const panel = document.getElementById(id);
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    // Close any other open item (keep this if you want one-at-a-time behavior)
    document.querySelectorAll('.faq-toggle[aria-expanded="true"]').forEach(openBtn => {
      if (openBtn !== btn) {
        openBtn.setAttribute('aria-expanded', 'false');
        const openPanel = document.getElementById(openBtn.getAttribute('aria-controls'));
        openPanel && openPanel.setAttribute('hidden', '');
      }
    });

    // Toggle this one
    btn.setAttribute('aria-expanded', String(!isOpen));
    if (panel) {
      isOpen ? panel.setAttribute('hidden', '')
             : panel.removeAttribute('hidden');
    }
  });
});
  // First paint
// ===============================
// BATTERY + UTILITY CALCULATOR
// ===============================

(function(){

  // ---- Battery Specs ----
  const BATTERIES = {
    TESLA_PW3: {
      usableKwh: 13.5,
      powerKw: 11.5
    },
    FRANKLIN: {
      usableKwh: 13.6,
      powerKw: 10
    }
  };

  // ---- Program Rates ----
  // Update if utilities change payouts
  const PROGRAM_RATES = {
    SRP_BATTERY_PARTNER: 360,   // $ per kW-year
    APS_TESLA_VPP: 420          // $ per kW-year
  };

  // ---- SRP E-28 Spread (peak minus off-peak) ----
  const E28_SPREAD = {
    SUMMER: 0.14,
    SUMMER_PEAK: 0.22,
    WINTER: 0.08
  };

  // ---- Elements ----
  const programEl = document.getElementById("program");
  const batteryEl = document.getElementById("batteryModel");
  const qtyEl = document.getElementById("batteryQty");
  const perfEl = document.getElementById("perf");

  const usableEl = document.getElementById("usableKwh");
  const powerEl = document.getElementById("powerKw");

  const monthlyCreditEl = document.getElementById("monthlyCredit");
  const arbitrageMonthlyEl = document.getElementById("arbitrageMonthly");
  const creditNoteEl = document.getElementById("creditNote");

  const seasonEl = document.getElementById("season");
  const shiftEl = document.getElementById("shiftKwhDay");
  const rteEl = document.getElementById("rte");
  const arbDetailEl = document.getElementById("arbDetail");

  const calcBatteryBtn = document.getElementById("calcBatteryBtn");
  const calcArbBtn = document.getElementById("calcArbBtn");

  if(!programEl) return; // safety

  // ---- Populate battery dropdown ----
  batteryEl.innerHTML = `
    <option value="TESLA_PW3">Tesla Powerwall 3</option>
    <option value="FRANKLIN">Franklin aPower</option>
  `;

  function money(n){
    return "$" + (n || 0).toFixed(0);
  }

  function updateSpecs(){
    const model = batteryEl.value;
    const qty = Number(qtyEl.value) || 1;

    const usable = BATTERIES[model].usableKwh * qty;
    const power = BATTERIES[model].powerKw * qty;

    usableEl.value = usable.toFixed(1);
    powerEl.value = power.toFixed(1);
  }

  // ===============================
  // PROGRAM CREDIT CALCULATION
  // ===============================
  function calculateProgramCredit(){

    const program = programEl.value;
    const model = batteryEl.value;
    const qty = Number(qtyEl.value) || 1;
    const perf = Number(perfEl.value) || 1;

    const totalKw = BATTERIES[model].powerKw * qty;

    const annualCredit =
      totalKw *
      PROGRAM_RATES[program] *
      perf;

    const monthlyCredit = annualCredit / 12;

    monthlyCreditEl.textContent = money(monthlyCredit);

    if(program === "SRP_BATTERY_PARTNER"){
      creditNoteEl.textContent =
        "SRP pays based on committed kW during peak events.";
    } else {
      creditNoteEl.textContent =
        "APS VPP pays based on enrolled kW capacity.";
    }
  }

  // ===============================
  // SRP E-28 ARBITRAGE CALC
  // ===============================
  function calculateArbitrage(){

    const season = seasonEl.value;
    const kwhPerDay = Number(shiftEl.value) || 0;
    const rte = Number(rteEl.value) || 1;

    const spread = E28_SPREAD[season];

    const effectiveKwh = kwhPerDay * rte;

    const monthlyValue =
      effectiveKwh *
      spread *
      30;

    arbitrageMonthlyEl.textContent = money(monthlyValue);

    arbDetailEl.textContent =
      "Assumes off-peak charging and 6–9pm discharge under SRP E-28.";
  }

  // ---- Events ----
  batteryEl.addEventListener("change", updateSpecs);
  qtyEl.addEventListener("input", updateSpecs);
  calcBatteryBtn.addEventListener("click", calculateProgramCredit);
  calcArbBtn.addEventListener("click", calculateArbitrage);

  updateSpecs();

})();
  recalc();
});
