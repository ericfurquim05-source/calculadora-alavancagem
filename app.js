(() => {
  'use strict';

  const CONFIG = {
    version: '1.2.0',
    leadEndpoint: 'https://formsubmit.co/ajax/empresasa187@gmail.com',
    whatsappNumber: '5551980554326',
    whatsappGroupUrl: '',
    consultantName: 'Eric Furquin'
  };

  const MODEL = {
    term: 220,
    adminRate: 0.242,
    reducedFundShare: 0.50,
    residentialRentRate: 0.005,
    highYieldRentRate: 0.01,
    shortStayRentRate: 0.01,
    annualAppreciationRate: 0.0482,
    ownCapitalShare: 0.25,
    projectionYears: 5,
    saleLowRate: 0.20,
    saleHighRate: 0.40
  };

  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
  const wholeMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

  const state = {
    lead: null,
    lastResult: null
  };

  function parseMoney(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function formatMoneyInput(input) {
    const value = parseMoney(input.value);
    input.value = value ? new Intl.NumberFormat('pt-BR').format(value) : '';
  }

  function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

  function validPhone(value) {
    const digits = onlyDigits(value);
    return digits.length === 10 || digits.length === 11;
  }

  function loadLead() {
    try {
      const stored = JSON.parse(localStorage.getItem('calc_alavancagem_lead') || 'null');
      if (stored?.name && stored?.email && stored?.whatsapp) return stored;
    } catch (_) {}
    return null;
  }

  function saveLead(lead) {
    try {
      localStorage.setItem('calc_alavancagem_lead', JSON.stringify(lead));
    } catch (_) {}
  }

  function clearLead() {
    try {
      localStorage.removeItem('calc_alavancagem_lead');
    } catch (_) {}
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
      whatsapp: lead.whatsapp,
      email: lead.email,
      origem: 'Calculadora de Alavancagem Patrimonial',
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

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function calculateCreditFromReducedPayment(payment) {
    return payment * MODEL.term / (MODEL.reducedFundShare + MODEL.adminRate);
  }

  function calculateFullPayment(credit) {
    return credit * (1 + MODEL.adminRate) / MODEL.term;
  }

  function applyIncomeBars(residential, commercial, shortStay) {
    const maximum = Math.max(shortStay, commercial, residential, 1);
    $('traditionalBar').style.width = `${Math.max((residential / maximum) * 100, 4)}%`;
    $('commercialBar').style.width = `${Math.max((commercial / maximum) * 100, 4)}%`;
    $('shortStayBar').style.width = `${Math.max((shortStay / maximum) * 100, 4)}%`;
  }

  function calculate() {
    const budget = parseMoney($('monthlyBudget').value);
    const capital = parseMoney($('availableCapital').value);

    if (budget < 100) {
      $('calculatorError').textContent = 'Informe um aporte mensal de pelo menos R$ 100,00 para fazer a simulação.';
      $('results').hidden = true;
      return;
    }

    $('calculatorError').textContent = '';

    const credit = calculateCreditFromReducedPayment(budget);
    const fullInstallment = calculateFullPayment(credit);
    const residentialRent = credit * MODEL.residentialRentRate;
    const commercialRent = credit * MODEL.highYieldRentRate;
    const shortStayRent = credit * MODEL.shortStayRentRate;
    const saleLow = credit * MODEL.saleLowRate;
    const saleHigh = credit * MODEL.saleHighRate;

    const ownCapital = credit * MODEL.ownCapitalShare;
    const assetMultiple = credit / ownCapital;
    const finalProperty = credit * Math.pow(1 + MODEL.annualAppreciationRate, MODEL.projectionYears);
    const appreciationGain = finalProperty - credit;
    const grossRentFiveYears = commercialRent * MODEL.projectionYears * 12;
    const economicGenerated = appreciationGain + grossRentFiveYears;
    const generatedMultiple = economicGenerated / ownCapital;
    const rentDifference = commercialRent - fullInstallment;
    const rentCoverage = commercialRent / fullInstallment;

    state.lastResult = {
      budget,
      capital,
      credit,
      fullInstallment,
      residentialRent,
      commercialRent,
      shortStayRent,
      saleLow,
      saleHigh,
      term: MODEL.term,
      ownCapital,
      assetMultiple,
      finalProperty,
      grossRentFiveYears,
      economicGenerated,
      generatedMultiple,
      rentDifference,
      rentCoverage
    };

    const firstName = (state.lead?.name || '').trim().split(/\s+/)[0];
    setText('resultGreeting', firstName ? `${firstName}, veja o que seu aporte pode movimentar` : 'Veja o que seu aporte pode movimentar');
    setText('budgetBadge', `${wholeMoney.format(budget)}/mês`);
    setText('resultCreditHero', wholeMoney.format(credit));
    setText('resultCredit', money.format(credit));
    setText('resultInstallment', money.format(budget));
    setText('resultFullInstallment', money.format(fullInstallment));
    setText('resultTerm', `${MODEL.term} meses`);
    setText('resultCreditNote', `50% do fundo comum + ${(MODEL.adminRate * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de taxa`);

    if (capital > 0) {
      $('capitalNotice').hidden = false;
      setText('capitalNoticeValue', money.format(capital));
    } else {
      $('capitalNotice').hidden = true;
    }

    setText('leverageOwnCapital', money.format(ownCapital));
    setText('leverageAsset', money.format(credit));
    setText('leverageMultiplier', `${assetMultiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× o capital próprio`);
    setText('leverageFinalProperty', money.format(finalProperty));
    setText('leverageRentFiveYears', money.format(grossRentFiveYears));
    setText('leverageGenerated', money.format(economicGenerated));
    setText('leverageGeneratedMultiple', `${generatedMultiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× o capital próprio de referência`);

    setText('rentReferenceMonthly', `${money.format(commercialRent)}/mês`);
    setText('rentFullInstallment', `${money.format(fullInstallment)}/mês`);
    setText('rentDifference', `${rentDifference >= 0 ? '+' : ''}${money.format(rentDifference)}/mês`);
    setText('rentCoverageText', `No cenário ilustrativo, o aluguel bruto representa ${percent.format(rentCoverage * 100)}% da parcela integral estimada.`);

    setText('homeValue', money.format(credit));
    setText('traditionalRent', `${money.format(residentialRent)}/mês`);
    setText('traditionalRentAnnual', `${money.format(residentialRent * 12)} por ano em receita bruta ilustrativa de 0,50% ao mês.`);
    setText('commercialRent', `${money.format(commercialRent)}/mês`);
    setText('commercialRentAnnual', `${money.format(commercialRent * 12)} por ano em receita bruta ilustrativa de 1% ao mês.`);
    setText('shortStayRent', `${money.format(shortStayRent)}/mês`);
    setText('shortStayRentAnnual', `${money.format(shortStayRent * 12)} por ano em receita bruta ilustrativa de 1% ao mês.`);
    setText('saleRange', `${wholeMoney.format(saleLow)} a ${wholeMoney.format(saleHigh)}`);
    setText('businessValue', money.format(credit));

    setText('traditionalBarValue', money.format(residentialRent));
    setText('commercialBarValue', money.format(commercialRent));
    setText('shortStayBarValue', money.format(shortStayRent));
    applyIncomeBars(residentialRent, commercialRent, shortStayRent);

    $('results').hidden = false;
    requestAnimationFrame(() => $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function resultMessage() {
    const r = state.lastResult;
    if (!r) return 'Olá! Quero conhecer a Calculadora de Alavancagem Patrimonial.';
    const lines = [
      'Olá! Fiz a Calculadora de Alavancagem Patrimonial.',
      `Nome: ${state.lead?.name || 'Não informado'}`,
      `WhatsApp cadastrado: ${state.lead?.whatsapp || 'Não informado'}`,
      `Aporte mensal: ${money.format(r.budget)}`,
      `Crédito imobiliário estimado: ${money.format(r.credit)}`,
      `Parcela reduzida inicial: ${money.format(r.budget)}`,
      `Parcela integral estimada: ${money.format(r.fullInstallment)}`,
      `Renda bruta ilustrativa de 1%: ${money.format(r.commercialRent)}/mês`,
      `Valor estimado do imóvel em 5 anos: ${money.format(r.finalProperty)}`,
      `Valor econômico bruto ilustrativo em 5 anos: ${money.format(r.economicGenerated)}`
    ];
    if (r.capital > 0) lines.push(`Recurso próprio disponível: ${money.format(r.capital)}`);
    lines.push('Quero receber uma consultoria e um planejamento gratuitos com base no meu objetivo.');
    return lines.join('\n');
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

    $('leadWhatsapp').addEventListener('input', (event) => {
      event.target.value = formatPhone(event.target.value);
    });

    $('leadForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const lead = {
        name: $('leadName').value.trim(),
        whatsapp: $('leadWhatsapp').value.trim(),
        email: $('leadEmail').value.trim(),
        createdAt: new Date().toISOString()
      };

      if (lead.name.length < 2) {
        $('leadStatus').textContent = 'Digite seu nome para continuar.';
        return;
      }
      if (!validPhone(lead.whatsapp)) {
        $('leadStatus').textContent = 'Digite um número de WhatsApp válido com DDD.';
        return;
      }
      if (!validEmail(lead.email)) {
        $('leadStatus').textContent = 'Digite um e-mail válido para continuar.';
        return;
      }
      if (!$('leadConsent').checked) {
        $('leadStatus').textContent = 'Confirme a autorização para continuar.';
        return;
      }

      const button = $('leadSubmit');
      button.disabled = true;
      button.textContent = 'Liberando acesso...';
      $('leadStatus').textContent = '';
      saveLead(lead);
      unlockCalculator(lead);
      sendLead(lead).then((result) => {
        if (!result.ok && !result.skipped) showToast('Acesso liberado. O contato poderá ser confirmado pela equipe.');
      });
      button.disabled = false;
      button.textContent = 'Acessar gratuitamente';
    });

    $('calculatorForm').addEventListener('submit', (event) => {
      event.preventDefault();
      calculate();
    });

    $('changeLeadBtn').addEventListener('click', () => {
      clearLead();
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
          await navigator.share({ title: 'Calculadora de Alavancagem Patrimonial', text });
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
    const storedLead = loadLead();
    if (storedLead) unlockCalculator(storedLead);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=120').catch(() => {}));
    }
  }

  init();
})();
