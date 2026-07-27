(() => {
  'use strict';

  const CONFIG = {
    version: '1.0.0',
    leadEndpoint: 'https://formsubmit.co/ajax/empresasa187@gmail.com',
    whatsappNumber: '5551980554326',
    whatsappGroupUrl: '',
    consultantName: 'Eric Furquin'
  };

  const CREDIT_TABLE = [
    { credit: 100000, installment: 341, term: 180 },
    { credit: 150000, installment: 512, term: 180 },
    { credit: 200000, installment: 615, term: 180 },
    { credit: 250000, installment: 768, term: 200 },
    { credit: 300000, installment: 922, term: 200 },
    { credit: 350000, installment: 1078, term: 200 },
    { credit: 400000, installment: 1230, term: 200 },
    { credit: 500000, installment: 1397, term: 220 },
    { credit: 600000, installment: 1676, term: 220 },
    { credit: 700000, installment: 1979, term: 220 },
    { credit: 800000, installment: 2197, term: 220 },
    { credit: 900000, installment: 2479, term: 220 },
    { credit: 1000000, installment: 2798, term: 220 },
    { credit: 1250000, installment: 3326, term: 220 },
    { credit: 1500000, installment: 3991, term: 220 },
    { credit: 1750000, installment: 4656, term: 220 },
    { credit: 2000000, installment: 5319, term: 220 }
  ];

  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const wholeMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const numberBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

  const state = {
    lead: null,
    lastResult: null
  };

  function parseMoney(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }

  function formatMoneyInput(input) {
    const value = parseMoney(input.value);
    input.value = value ? new Intl.NumberFormat('pt-BR').format(value) : '';
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function loadLead() {
    try {
      const stored = JSON.parse(localStorage.getItem('calc_alavancagem_lead') || 'null');
      if (stored?.name && stored?.email) return stored;
    } catch (_) {}
    return null;
  }

  function saveLead(lead) {
    localStorage.setItem('calc_alavancagem_lead', JSON.stringify(lead));
  }

  function unlockCalculator(lead) {
    state.lead = lead;
    $('leadGate').hidden = true;
    $('app').hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function sendLead(lead) {
    if (!CONFIG.leadEndpoint) return { ok: false, skipped: true };
    const payload = {
      nome: lead.name,
      email: lead.email,
      whatsapp: lead.phone || 'Não informado',
      origem: 'Calculadora de Alavancagem',
      versao: CONFIG.version,
      data: new Date().toLocaleString('pt-BR'),
      _subject: `Novo lead — Calculadora de Alavancagem — ${lead.name}`,
      _template: 'table',
      _captcha: 'false'
    };
    try {
      const response = await fetch(CONFIG.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      return { ok: response.ok };
    } catch (_) {
      return { ok: false };
    }
  }

  function selectBand(budget) {
    let selected = null;
    let next = null;
    for (let i = 0; i < CREDIT_TABLE.length; i += 1) {
      const row = CREDIT_TABLE[i];
      if (row.installment <= budget) selected = row;
      if (row.installment > budget) {
        next = row;
        break;
      }
    }
    if (selected && !next) {
      const index = CREDIT_TABLE.indexOf(selected);
      next = CREDIT_TABLE[index + 1] || null;
    }
    return { selected, next };
  }

  function updateRentPreset() {
    const type = $('propertyType').value;
    $('rentRate').value = type === 'commercial' ? '0.70' : '0.50';
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function applyProgress(cash, combined, future) {
    const max = Math.max(cash, combined, future, 1);
    $('cashBar').style.width = `${Math.max((cash / max) * 100, cash > 0 ? 4 : 0)}%`;
    $('combinedBar').style.width = `${Math.max((combined / max) * 100, combined > 0 ? 4 : 0)}%`;
    $('futureBar').style.width = `${Math.max((future / max) * 100, future > 0 ? 4 : 0)}%`;
  }

  function calculate() {
    const budget = parseMoney($('monthlyBudget').value);
    const capital = parseMoney($('availableCapital').value);
    const rentRate = Math.max(Number($('rentRate').value) || 0, 0) / 100;
    const appreciation = Math.max(Number($('appreciationRate').value) || 0, 0) / 100;
    const years = Math.max(Number($('horizonYears').value) || 1, 1);
    const { selected, next } = selectBand(budget);

    if (!selected) {
      const minimum = CREDIT_TABLE[0];
      $('calculatorError').textContent = `A primeira faixa cadastrada começa em ${money.format(minimum.installment)} por mês. Faltam ${money.format(Math.max(minimum.installment - budget, 0))}.`;
      $('results').hidden = true;
      return;
    }

    $('calculatorError').textContent = '';
    const combined = capital + selected.credit;
    const monthlyRent = combined * rentRate;
    const futureProperty = combined * Math.pow(1 + appreciation, years);
    const futureRent = futureProperty * rentRate;
    const budgetGap = budget - selected.installment;

    state.lastResult = {
      budget, capital, rentRate, appreciation, years,
      credit: selected.credit,
      installment: selected.installment,
      term: selected.term,
      combined, monthlyRent, futureProperty, futureRent,
      next
    };

    const firstName = (state.lead?.name || '').trim().split(/\s+/)[0];
    setText('resultGreeting', firstName ? `${firstName}, veja o seu cenário` : 'Veja o que seu orçamento pode movimentar');
    setText('budgetBadge', `${wholeMoney.format(budget)}/mês`);
    setText('resultCredit', money.format(selected.credit));
    setText('resultTerm', `${selected.term} meses · faixa cadastrada`);
    setText('resultInstallment', money.format(selected.installment));
    setText('resultBudgetGap', budgetGap > 0 ? `Sobra ${money.format(budgetGap)} no orçamento mensal` : 'Parcela no limite do orçamento');
    setText('resultCombined', money.format(combined));
    setText('resultRent', money.format(monthlyRent));
    setText('resultRentRate', `${numberBR.format(rentRate * 100)}% ao mês sobre o poder de compra combinado`);

    setText('cashPathValue', money.format(capital));
    setText('plannedPathValue', money.format(selected.credit));
    setText('leveragePathValue', money.format(combined));
    setText('rentPathValue', `${money.format(monthlyRent)}/mês`);

    setText('projectionTitle', `Cenário em ${years} ${years === 1 ? 'ano' : 'anos'}`);
    setText('futurePropertyValue', money.format(futureProperty));
    setText('futureRentValue', `Aluguel projetado: ${money.format(futureRent)}/mês`);
    setText('cashBarValue', money.format(capital));
    setText('combinedBarValue', money.format(combined));
    setText('futureBarValue', money.format(futureProperty));
    applyProgress(capital, combined, futureProperty);

    if (next) {
      $('nextBandPanel').hidden = false;
      setText('nextCredit', money.format(next.credit));
      setText('nextInstallment', money.format(next.installment));
      setText('nextDifference', `${money.format(Math.max(next.installment - budget, 0))}/mês`);
    } else {
      $('nextBandPanel').hidden = true;
    }

    $('results').hidden = false;
    requestAnimationFrame(() => $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function resultMessage() {
    const r = state.lastResult;
    if (!r) return 'Olá! Quero conhecer a Calculadora de Alavancagem.';
    return [
      `Olá! Fiz a Calculadora de Alavancagem.`,
      `Nome: ${state.lead?.name || 'Não informado'}`,
      `Orçamento mensal: ${money.format(r.budget)}`,
      `Capital disponível: ${money.format(r.capital)}`,
      `Crédito encontrado: ${money.format(r.credit)}`,
      `Parcela: ${money.format(r.installment)} por ${r.term} meses`,
      `Poder de compra combinado: ${money.format(r.combined)}`,
      `Aluguel estimado: ${money.format(r.monthlyRent)}/mês`,
      `Quero uma assessoria gratuita para entender essa estratégia.`
    ].join('\n');
  }

  function openWhatsApp(message) {
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  }

  function initEvents() {
    ['monthlyBudget', 'availableCapital'].forEach((id) => {
      $(id).addEventListener('input', (event) => formatMoneyInput(event.target));
      $(id).addEventListener('focus', (event) => event.target.select());
    });

    $('propertyType').addEventListener('change', updateRentPreset);

    $('leadForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const lead = {
        name: $('leadName').value.trim(),
        email: $('leadEmail').value.trim(),
        phone: $('leadPhone').value.trim(),
        createdAt: new Date().toISOString()
      };

      if (lead.name.length < 2) {
        $('leadStatus').textContent = 'Digite seu nome para continuar.';
        return;
      }
      if (!validEmail(lead.email)) {
        $('leadStatus').textContent = 'Digite um e-mail válido para continuar.';
        return;
      }
      if (!$('leadConsent').checked) {
        $('leadStatus').textContent = 'Confirme a autorização de contato para continuar.';
        return;
      }

      const button = $('leadSubmit');
      button.disabled = true;
      button.textContent = 'Liberando acesso...';
      $('leadStatus').textContent = '';
      saveLead(lead);
      unlockCalculator(lead);
      sendLead(lead).then((result) => {
        if (!result.ok && !result.skipped) showToast('Acesso liberado. O cadastro será confirmado pelo canal de atendimento.');
      });
      button.disabled = false;
      button.textContent = 'Acessar a calculadora';
    });

    $('calculatorForm').addEventListener('submit', (event) => {
      event.preventDefault();
      calculate();
    });

    $('changeLeadBtn').addEventListener('click', () => {
      localStorage.removeItem('calc_alavancagem_lead');
      location.reload();
    });

    $('advisoryBtn').addEventListener('click', () => openWhatsApp(resultMessage()));
    $('groupBtn').addEventListener('click', () => {
      if (CONFIG.whatsappGroupUrl) {
        window.open(CONFIG.whatsappGroupUrl, '_blank', 'noopener');
      } else {
        openWhatsApp('Olá! Fiz a Calculadora de Alavancagem e quero entrar no grupo do WhatsApp.');
      }
    });
    $('shareBtn').addEventListener('click', async () => {
      const text = resultMessage();
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Calculadora de Alavancagem', text });
          return;
        } catch (_) {}
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Resumo copiado para compartilhar.');
      } catch (_) {
        openWhatsApp(text);
      }
    });
  }

  function init() {
    initEvents();
    updateRentPreset();
    const storedLead = loadLead();
    if (storedLead) unlockCalculator(storedLead);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=100').catch(() => {}));
    }
  }

  init();
})();
