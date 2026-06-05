/**
 * ============================================================
 * Consórcio Pro — Controlador da Aplicação
 * ============================================================
 * Responsável por toda a interação com o DOM, eventos e
 * atualização reativa da interface.
 */

(function () {
    'use strict';

    // ── Estado da Aplicação ────────────────────────────────────
    const state = {
        valorCarta: 0,
        prazo: 0,
        taxaAdmin: 0,
        fundoReserva: 0,
        taxaCorrecao: 0,
        lanceProprio: 0,
        lanceEmbutido: 0,
        abatimento: 'parcela',
        taxaJuros: 0,
        taxaTR: 0,
        prazoFinanciamento: 0,
        sistemaAmortizacao: 'price'
    };
    
    // Instâncias do Chart.js
    const chartInstances = {};

    // ── Seletores ──────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Inputs — Consórcio
    const elValorCarta = $('#input-valor-carta');
    const elPrazo = $('#input-prazo');
    const elSliderPrazo = $('#slider-prazo');
    const elTaxaAdmin = $('#input-taxa-admin');
    const elFundoReserva = $('#input-fundo-reserva');
    const elTaxaCorrecao = $('#input-taxa-correcao');
    const elValorLanceProprio = $('#input-lance-proprio');
    const elValorLanceEmbutido = $('#input-lance-embutido');

    // Inputs — Financiamento (tela principal)
    const elTaxaJurosMain = $('#input-taxa-juros-main');
    const elTaxaTRMain = $('#input-taxa-tr-main');
    const elPrazoFin = $('#input-prazo-fin');
    const elSliderPrazoFin = $('#slider-prazo-fin');

    // Inputs — Financiamento (comparador)
    const elTaxaJuros = $('#input-taxa-juros');
    const elTaxaTR = $('#input-taxa-tr');
    const elPrazoFinComp = $('#input-prazo-fin-comp');
    const elEntradaFin = $('#input-entrada-fin');

    // Toggle Buttons
    const elToggleAbatimento = $('#toggle-abatimento');
    const elToggleAmortizacao = $('#toggle-amortizacao');
    const elToggleAmortizacaoMain = $('#toggle-amortizacao-main');

    // ── Formatação de Inputs Monetários (tempo real) ────────────
    function formatarEmTempoReal(valor) {
        // Recebe string "limpa" de dígitos, retorna "100.000,00"
        let nums = valor.replace(/\D/g, ''); // só dígitos
        if (nums === '') return '';
        // Tratar como centavos: últimos 2 dígitos são decimais
        nums = nums.replace(/^0+/, '') || '0'; // remove zeros à esquerda
        while (nums.length < 3) nums = '0' + nums; // garantir pelo menos 0,0X
        const inteiro = nums.slice(0, -2);
        const decimal = nums.slice(-2);
        // Adicionar pontos de milhar
        const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return comPontos + ',' + decimal;
    }

    function setupCurrencyInput(input, stateKey) {
        if (!input) return;

        input.addEventListener('input', function () {
            if (lanceModes[stateKey] === 'pct') {
                state[stateKey] = parseFloat(this.value.replace(',', '.')) || 0;
                recalcular();
                return;
            }
            const formatted = formatarEmTempoReal(this.value);
            // Salvar posição do cursor
            this.value = formatted;
            // Atualizar state
            state[stateKey] = Calculator.parseMoeda(formatted);
            recalcular();
        });

        input.addEventListener('focus', function () {
            if (Calculator.parseMoeda(this.value) === 0) this.value = '';
        });

        input.addEventListener('blur', function () {
            if (this.value === '' || Calculator.parseMoeda(this.value) === 0) {
                this.value = '';
                state[stateKey] = 0;
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') this.blur();
        });
    }

    // ── Modos de Lance (R$ / %) ───────────────────────────────
    const lanceModes = { lanceProprio: 'pct', lanceEmbutido: 'pct' };

    function setupLanceModeToggle(toggleId, inputId, prefixId, stateKey) {
        const toggle = $(toggleId);
        if (!toggle) return;

        toggle.addEventListener('click', function (e) {
            const btn = e.target.closest('.lance-mode-btn');
            if (!btn) return;
            toggle.querySelectorAll('.lance-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.dataset.mode;
            lanceModes[stateKey] = mode;
            const prefix = $(prefixId);
            const input = $(inputId);

            if (mode === 'pct') {
                if (prefix) prefix.textContent = '%';
                if (input) { input.value = ''; input.placeholder = '0'; input.type = 'number'; input.step = '0.1'; input.min = '0'; input.max = '100'; }
            } else {
                if (prefix) prefix.textContent = 'R$';
                if (input) { input.value = ''; input.placeholder = '0,00'; input.type = 'text'; input.removeAttribute('step'); input.removeAttribute('min'); input.removeAttribute('max'); }
            }

            state[stateKey] = 0;
            recalcular();
        });
    }

    function setupNumericInput(input, stateKey) {
        if (!input) return;
        input.addEventListener('input', function () {
            state[stateKey] = parseFloat(this.value) || 0;
            recalcular();
        });
    }

    function setupToggle(container, stateKey) {
        if (!container) return;
        container.addEventListener('click', function (e) {
            const btn = e.target.closest('.toggle-btn');
            if (!btn) return;
            container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state[stateKey] = btn.dataset.value;
            recalcular();
        });
    }

    // ── Sincronização entre páginas ────────────────────────────
    function syncInputValue(el, value) {
        if (el && document.activeElement !== el) {
            el.value = value;
        }
    }

    function syncToggle(containerSel, activeValue) {
        const container = $(containerSel);
        if (!container) return;
        container.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === activeValue);
        });
    }

    // ── Navegação ──────────────────────────────────────────────
    function setupNavigation() {
        $$('.nav-link').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const targetSection = this.dataset.section;

                // Update active link
                $$('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Show target section
                $$('.section').forEach(s => s.classList.remove('active-section'));
                $(`#${targetSection}`).classList.add('active-section');

                // Smooth scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Redraw charts if dashboard
                if (targetSection === 'dashboard') {
                    setTimeout(() => drawAllCharts(), 100);
                    // Disparar chatbot se a economia for positiva

                } else if (targetSection === 'simulador') {
                    setTimeout(() => drawEvolucaoChart('canvas-evolucao-main'), 100);
                }
            });
        });
    }



    // ── Motor de Recálculo Reativo ─────────────────────────────
    function recalcular() {
        let { valorCarta, prazo, taxaAdmin, fundoReserva, taxaCorrecao, lanceProprio, lanceEmbutido, abatimento, taxaJuros, prazoFinanciamento, sistemaAmortizacao } = state;

        // Converter % para R$ se modo percentual ativo
        if (lanceModes.lanceProprio === 'pct' && valorCarta > 0) {
            lanceProprio = valorCarta * (lanceProprio / 100);
        }
        if (lanceModes.lanceEmbutido === 'pct' && valorCarta > 0) {
            lanceEmbutido = valorCarta * (lanceEmbutido / 100);
        }

        // 1. Parcela Básica
        const basica = Calculator.parcelaBasicaConsorcio(valorCarta, taxaAdmin, fundoReserva, prazo, taxaCorrecao);
        $('#valor-parcela-basica').textContent = Calculator.formatarMoeda(basica.primeiraParcela);
        $('#detalhe-parcela-basica').textContent =
            `Carta ${Calculator.formatarMoeda(basica.parcelaCarta)} + Admin ${Calculator.formatarMoeda(basica.parcelaAdmin)} + Reserva ${Calculator.formatarMoeda(basica.parcelaReserva)}`;
            
        const elUltimaBasica = $('#ultima-parcela-basica');
        if (elUltimaBasica) {
            if (taxaCorrecao > 0) {
                elUltimaBasica.style.display = 'block';
                elUltimaBasica.textContent = `Última est.: ${Calculator.formatarMoeda(basica.ultimaParcela)}`;
                const labelEl = $('#label-parcela-basica');
                if (labelEl) labelEl.textContent = 'Parcela Inicial';
            } else {
                elUltimaBasica.style.display = 'none';
                const labelEl = $('#label-parcela-basica');
                if (labelEl) labelEl.textContent = 'Valor da Parcela';
            }
        }

        // 2. Lance
        const lance = Calculator.calcularLance(valorCarta, taxaAdmin, fundoReserva, prazo, lanceProprio, lanceEmbutido, abatimento, taxaCorrecao);

        const totalLance = lanceProprio + lanceEmbutido;

        // Lance percentage
        const lanceProprioPct = valorCarta > 0 ? (lanceProprio / valorCarta * 100) : 0;
        const lanceEmbutidoPct = valorCarta > 0 ? (lanceEmbutido / valorCarta * 100) : 0;
        const totalLancePct = valorCarta > 0 ? (totalLance / valorCarta * 100) : 0;

        $('#pct-lance-proprio').textContent = `${Calculator.formatarNumero(lanceProprioPct, 1)}% da carta`;
        $('#pct-lance-embutido').textContent = `${Calculator.formatarNumero(lanceEmbutidoPct, 1)}% da carta`;
        $('#info-total-lance').textContent = `Total Ofertado: ${Calculator.formatarMoeda(totalLance)} (${Calculator.formatarNumero(totalLancePct, 1)}% da carta)`;

        // Lance results
        $('#nova-parcela').textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        $('#novo-prazo').textContent = `${lance.novoPrazo} meses`;
        $('#economia-parcela').textContent = `- ${Calculator.formatarMoeda(lance.economiaParcela)}`;
        $('#total-pago-consorcio').textContent = Calculator.formatarMoeda(lance.totalPago);

        const elUltimaLance = $('#ultima-parcela-consorcio');
        if (elUltimaLance) {
            if (taxaCorrecao > 0) {
                elUltimaLance.style.display = 'block';
                elUltimaLance.textContent = `Última est.: ${Calculator.formatarMoeda(lance.ultimaParcela)}`;
                const labelEl = $('#label-nova-parcela');
                if (labelEl) labelEl.textContent = 'Nova Parcela Inicial';
            } else {
                elUltimaLance.style.display = 'none';
                const labelEl = $('#label-nova-parcela');
                if (labelEl) labelEl.textContent = 'Novo Valor da Parcela';
            }
        }

        // Animate lance result cards
        animatePulse('#lance-results');

        // 3. Overview
        // Elementos removidos em favor da tabela comparativa na main

        // Timeline
        const timelineLancePct = lance.totalPago > 0 ? (totalLance / lance.totalPago) * 100 : 0;
        $('#timeline-lance-seg').style.width = `${timelineLancePct}%`;
        $('#timeline-parcela-seg').style.width = `${100 - timelineLancePct}%`;
        $('#timeline-end-label').textContent = `Mês ${lance.novoPrazo}`;

        // 4. Financiamento (usando prazoFinanciamento independente e TR)
        const entrada = lanceProprio;
        const valorBem = lance.cartaEfetiva;
        elEntradaFin.value = Calculator.formatarInputMoeda(entrada);
        const fin = Calculator.calcularFinanciamento(valorBem, entrada, taxaJuros, prazoFinanciamento, state.taxaTR);

        const taxaMes = Calculator.taxaMensal(taxaJuros);
        const taxaMesStr = `Equivalente a ${Calculator.formatarNumero(taxaMes * 100, 2)}% ao mês`;
        $('#taxa-mensal-equivalente').textContent = taxaMesStr;
        const elTaxaMesMain = $('#taxa-mensal-main');
        if (elTaxaMesMain) elTaxaMesMain.textContent = taxaMesStr;

        const finAtivo = sistemaAmortizacao === 'price' ? fin.price : fin.sac;
        const parcelaFin = sistemaAmortizacao === 'price' ? finAtivo.parcela : finAtivo.primeiraParcela;
        const labelSistema = sistemaAmortizacao === 'price' ? 'Price' : 'SAC (1ª parcela)';
        const detalheFinStr = `${labelSistema} | Financiado: ${Calculator.formatarMoeda(fin.valorFinanciado)} em ${prazoFinanciamento}m`;

        // Comparador page
        $('#parcela-financiamento').textContent = Calculator.formatarMoeda(parcelaFin);
        $('#detalhe-financiamento').textContent = detalheFinStr;

        // Main page financing results
        const elParcelaFinMain = $('#parcela-fin-main');
        if (elParcelaFinMain) elParcelaFinMain.textContent = Calculator.formatarMoeda(parcelaFin);
        const elDetalheFinMain = $('#detalhe-fin-main');
        if (elDetalheFinMain) elDetalheFinMain.textContent = detalheFinStr;

        // 5. Comparação
        const isComparativo = (prazoFinanciamento > 0 && taxaJuros > 0);
        
        const totalConsorcio = lance.totalPago;
        const totalFinanciamento = isComparativo ? finAtivo.totalPago : 0;
        const dispParcelaFin = isComparativo ? parcelaFin : 0;
        const dispPrazoFin = isComparativo ? prazoFinanciamento : 0;
        const dispEntradaFin = isComparativo ? entrada : 0;
        const dispJurosFin = isComparativo ? finAtivo.totalJuros : 0;

        const maxTotal = Math.max(totalConsorcio, totalFinanciamento, 1);

        $('#comp-total-consorcio').textContent = Calculator.formatarMoeda(totalConsorcio);
        $('#comp-total-financiamento').textContent = Calculator.formatarMoeda(totalFinanciamento);
        $('#compbar-consorcio').style.width = `${(totalConsorcio / maxTotal) * 100}%`;
        $('#compbar-financiamento').style.width = `${(totalFinanciamento / maxTotal) * 100}%`;

        // Tabela comparativa
        const labelCompParcela = $('#label-comp-parcela');
        if (labelCompParcela) labelCompParcela.textContent = taxaCorrecao > 0 ? 'Parcela Inicial' : 'Parcela Mensal';
        $('#tab-parcela-consorcio').textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        $('#tab-parcela-financiamento').textContent = Calculator.formatarMoeda(dispParcelaFin);
        $('#tab-prazo-consorcio').textContent = `${lance.novoPrazo} meses`;
        $('#tab-prazo-financiamento').textContent = `${dispPrazoFin} meses`;
        $('#tab-lance-consorcio').textContent = Calculator.formatarMoeda(totalLance);
        $('#tab-entrada-financiamento').textContent = Calculator.formatarMoeda(dispEntradaFin);
        $('#tab-custo-consorcio').textContent = Calculator.formatarMoeda(totalConsorcio);
        $('#tab-custo-financiamento').textContent = Calculator.formatarMoeda(totalFinanciamento);
        $('#tab-juros-consorcio').textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        $('#tab-juros-financiamento').textContent = Calculator.formatarMoeda(dispJurosFin);

        // Update the main dashboard comparative table
        const labelCompParcelaMain = $('#label-comp-parcela-main');
        if (labelCompParcelaMain) labelCompParcelaMain.textContent = taxaCorrecao > 0 ? 'Parcela Inicial' : 'Parcela Mensal';
        if ($('#tab-parcela-consorcio-main')) $('#tab-parcela-consorcio-main').textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        if ($('#tab-parcela-financiamento-main')) $('#tab-parcela-financiamento-main').textContent = Calculator.formatarMoeda(dispParcelaFin);
        if ($('#tab-prazo-consorcio-main')) $('#tab-prazo-consorcio-main').textContent = `${lance.novoPrazo} meses`;
        if ($('#tab-prazo-financiamento-main')) $('#tab-prazo-financiamento-main').textContent = `${dispPrazoFin} meses`;
        if ($('#tab-lance-consorcio-main')) $('#tab-lance-consorcio-main').textContent = Calculator.formatarMoeda(totalLance);
        if ($('#tab-entrada-financiamento-main')) $('#tab-entrada-financiamento-main').textContent = Calculator.formatarMoeda(dispEntradaFin);
        if ($('#tab-custo-consorcio-main')) $('#tab-custo-consorcio-main').textContent = Calculator.formatarMoeda(totalConsorcio);
        if ($('#tab-custo-financiamento-main')) $('#tab-custo-financiamento-main').textContent = Calculator.formatarMoeda(totalFinanciamento);
        if ($('#tab-juros-consorcio-main')) $('#tab-juros-consorcio-main').textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        if ($('#tab-juros-financiamento-main')) $('#tab-juros-financiamento-main').textContent = Calculator.formatarMoeda(dispJurosFin);

        highlightWinner('#tab-parcela-consorcio-main', '#tab-parcela-financiamento-main', lance.novaParcela, dispParcelaFin, true);
        highlightWinner('#tab-prazo-consorcio-main', '#tab-prazo-financiamento-main', lance.novoPrazo, dispPrazoFin, true);
        highlightWinner('#tab-custo-consorcio-main', '#tab-custo-financiamento-main', totalConsorcio, totalFinanciamento, true);
        highlightWinner('#tab-juros-consorcio-main', '#tab-juros-financiamento-main', lance.custoConsorcio, dispJurosFin, true);

        // Highlight winner
        highlightWinner('#tab-parcela-consorcio', '#tab-parcela-financiamento', lance.novaParcela, dispParcelaFin, true);
        highlightWinner('#tab-prazo-consorcio', '#tab-prazo-financiamento', lance.novoPrazo, dispPrazoFin, true);
        highlightWinner('#tab-custo-consorcio', '#tab-custo-financiamento', totalConsorcio, totalFinanciamento, true);
        highlightWinner('#tab-juros-consorcio', '#tab-juros-financiamento', lance.custoConsorcio, dispJurosFin, true);

        // 6. Veredito
        const economia = totalFinanciamento - totalConsorcio;

        // Comparador verdict
        const verdictBox = $('#verdict-box');
        if (verdictBox) {
            if (economia > 0) {
                verdictBox.className = 'verdict-box positive';
                $('#verdict-title').textContent = 'Consórcio é mais vantajoso!';
                $('#verdict-detail').textContent = `Você economiza ${Calculator.formatarMoeda(economia)} escolhendo o consórcio.`;
            } else if (economia < 0) {
                verdictBox.className = 'verdict-box negative';
                $('#verdict-title').textContent = 'Financiamento é mais vantajoso!';
                $('#verdict-detail').textContent = `Você economiza ${Calculator.formatarMoeda(Math.abs(economia))} escolhendo o financiamento.`;
            } else {
                verdictBox.className = 'verdict-box neutral';
                $('#verdict-title').textContent = 'Ambos possuem custo semelhante';
                $('#verdict-detail').textContent = `A diferença é praticamente zero.`;
            }
            verdictBox.style.display = isComparativo ? 'flex' : 'none';
        }

        // Main page verdict
        const verdictBoxMain = $('#verdict-box-main');
        if (verdictBoxMain) {
            if (economia > 0) {
                verdictBoxMain.className = 'verdict-box positive';
                $('#verdict-title-main').textContent = 'Consórcio é mais vantajoso!';
                $('#verdict-detail-main').textContent = `Economia de ${Calculator.formatarMoeda(economia)} vs financiamento.`;
            } else if (economia < 0) {
                verdictBoxMain.className = 'verdict-box negative';
                $('#verdict-title-main').textContent = 'Financiamento é mais vantajoso!';
                $('#verdict-detail-main').textContent = `Economia de ${Calculator.formatarMoeda(Math.abs(economia))} vs consórcio.`;
            } else {
                verdictBoxMain.className = 'verdict-box neutral';
                $('#verdict-title-main').textContent = 'Custo semelhante';
                $('#verdict-detail-main').textContent = 'Ambas as opções têm custo similar.';
            }
            verdictBoxMain.style.display = isComparativo ? 'flex' : 'none';
        }

        // 7. Dashboard KPIs
        const elCarta = $('#kpi-valor-carta');
        if (elCarta) elCarta.textContent = Calculator.formatarMoeda((valorCarta - lance.lanceProprio - lance.lanceEmbutido) + lance.lanceProprio);
        
        const elLanceProp = $('#kpi-valor-lance-proprio');
        if (elLanceProp) elLanceProp.textContent = Calculator.formatarMoeda(lance.lanceProprio);
        
        const elLanceEmb = $('#kpi-valor-lance-embutido');
        if (elLanceEmb) elLanceEmb.textContent = Calculator.formatarMoeda(lance.lanceEmbutido);

        const elCredLiq = $('#kpi-valor-credito-liq');
        if (elCredLiq) elCredLiq.textContent = Calculator.formatarMoeda(valorCarta - lance.lanceProprio - lance.lanceEmbutido);

        const elParcela = $('#kpi-valor-parcela');
        if (elParcela) elParcela.textContent = Calculator.formatarMoeda(lance.novaParcela);

        const elEco = $('#kpi-valor-economia');
        const kpiEcoCard = $('#kpi-economia');
        if (elEco) {
            elEco.textContent = Calculator.formatarMoeda(Math.max(0, economia));
            if (kpiEcoCard) {
                if (economia > 0) {
                    kpiEcoCard.classList.add('positive');
                } else {
                    kpiEcoCard.classList.remove('positive');
                }
                kpiEcoCard.style.display = isComparativo ? 'flex' : 'none';
            }
        }

        const elDonutFin = $('#donut-financiamento');
        if (elDonutFin) elDonutFin.style.display = isComparativo ? 'flex' : 'none';

        if (finAtivo && finAtivo.tabela) {
        }  // 9. Store calculated data for charts
        state._lance = lance;
        state._fin = fin;
        state._finAtivo = finAtivo;

        // 10. Draw main page chart (always when simulador visible)
        if ($('#simulador').classList.contains('active-section')) {
            drawEvolucaoChart('canvas-evolucao-main');
        }

        // 11. Dashboard charts (if dashboard visible)
        if ($('#dashboard').classList.contains('active-section')) {
            drawAllCharts();
        }

        // 12. Sync inputs between pages
        syncInputValue(elTaxaJuros, taxaJuros || '');
        syncInputValue(elTaxaJurosMain, taxaJuros || '');
        syncInputValue(elTaxaTR, state.taxaTR || '');
        syncInputValue(elTaxaTRMain, state.taxaTR || '');
        syncInputValue(elPrazoFin, prazoFinanciamento || '');
        syncInputValue(elPrazoFinComp, prazoFinanciamento || '');
        syncInputValue(elSliderPrazoFin, prazoFinanciamento || 12);
        syncToggle('#toggle-amortizacao', sistemaAmortizacao);
        syncToggle('#toggle-amortizacao-main', sistemaAmortizacao);
    }

    function highlightWinner(sel1, sel2, val1, val2, lowerIsWin) {
        const el1 = $(sel1);
        const el2 = $(sel2);
        if (!el1 || !el2) return;
        el1.classList.remove('winner', 'loser');
        el2.classList.remove('winner', 'loser');
        if (lowerIsWin) {
            if (val1 < val2) { el1.classList.add('winner'); el2.classList.add('loser'); }
            else if (val2 < val1) { el2.classList.add('winner'); el1.classList.add('loser'); }
        } else {
            if (val1 > val2) { el1.classList.add('winner'); el2.classList.add('loser'); }
            else if (val2 > val1) { el2.classList.add('winner'); el1.classList.add('loser'); }
        }
    }

    function animatePulse(selector) {
        const el = $(selector);
        if (!el) return;
        el.classList.remove('pulse');
        void el.offsetWidth; // force reflow
        el.classList.add('pulse');
    }

    // ── Gráficos (Chart.js) ────────────────────────────────────
    function getThemeColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            text: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            tooltipBg: isDark ? 'rgba(15,23,50,0.9)' : 'rgba(255,255,255,0.95)',
            tooltipText: isDark ? '#fff' : '#000',
            consorcio: '#3b82f6',
            consorcioFill: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)',
            price: '#ef4444',
            priceFill: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.2)',
            sac: '#f0b429',
            sacFill: isDark ? 'rgba(240, 180, 41, 0.15)' : 'rgba(240, 180, 41, 0.2)'
        };
    }

    function drawAllCharts() {
        drawEvolucaoChart('canvas-evolucao');
        drawDonutChart('canvas-donut-consorcio', 'consorcio');
        drawDonutChart('canvas-donut-financiamento', 'financiamento');
    }

    function drawEvolucaoChart(canvasId) {
        const canvas = $(`#${canvasId}`);
        if (!canvas) return;
        
        // Pega os dados mais recentes do state (calculados no recalcular)
        const lance = state._lance;
        const fin = state._fin;
        if (!lance || !fin) return;

        const priceData = fin.price.tabela.map(r => r.parcela);
        const sacData = fin.sac.tabela.map(r => r.parcela);
        const consorcioData = lance.tabela.map(r => r.parcela);
        const maxMes = Math.max(state.prazoFinanciamento || 0, lance.novoPrazo);

        // Cria array de labels do eixo X (ex: 0, 1, 2... meses)
        const labels = Array.from({ length: maxMes }, (_, i) => i + 1);

        const theme = getThemeColors();

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        Chart.defaults.font.family = "'Inter', sans-serif";

        const chartType = 'bar';

        chartInstances[canvasId] = new Chart(canvas, {
            type: chartType, 
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Consórcio',
                        data: consorcioData,
                        borderColor: '#10b981', 
                        backgroundColor: '#10b981',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Financ. (Price)',
                        data: priceData,
                        borderColor: '#ef4444', 
                        backgroundColor: '#ef4444',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Financ. (SAC)',
                        data: sacData,
                        borderColor: '#f59e0b', 
                        backgroundColor: '#f59e0b',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            boxWidth: 8,
                            color: theme.text,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: 500
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        cornerRadius: 8,
                        callbacks: {
                            title: (ctx) => `Mês ${ctx[0].label}`,
                            label: (ctx) => `${ctx.dataset.label}: ${Calculator.formatarMoeda(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { 
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: theme.text,
                            maxRotation: 0,
                            maxTicksLimit: 6,
                            font: { size: 11 },
                            callback: function(val, index) {
                                return `Mês ${val+1}`;
                            }
                        }
                    },
                    y: {
                        grid: { 
                            color: theme.grid,
                            drawBorder: false,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            color: theme.text,
                            font: { size: 11 },
                            callback: (val) => Calculator.formatarMoeda(val).replace(',00', '')
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function drawDonutChart(canvasId, type) {
        const canvas = $(`#${canvasId}`);
        if (!canvas) return;

        let segments;
        if (type === 'consorcio') {
            const lance = state._lance || Calculator.calcularLance(state.valorCarta, state.taxaAdmin, state.fundoReserva, state.prazo, state.lanceProprio, state.lanceEmbutido, state.abatimento, state.taxaCorrecao);
            const amort = lance.cartaEfetiva;
            const admin = lance.totalAdmin;
            const reserva = lance.totalReserva;
            const lanceVal = state.lanceProprio;
            segments = [
                { label: 'Amortização (Líquido)', value: Math.max(0, amort - lanceVal), color: '#3b82f6' },
                { label: 'Taxas e Admin', value: admin + reserva, color: '#10b981' },
                { label: 'Juros', value: 0, color: '#ef4444' },
                { label: 'Lance (Próprio)', value: lanceVal, color: '#f0b429' }
            ];
            $('#donut-total-consorcio').textContent = Calculator.formatarMoeda(lance.totalPago);
        } else {
            const lance = state._lance || Calculator.calcularLance(state.valorCarta, state.taxaAdmin, state.fundoReserva, state.prazo, state.lanceProprio, state.lanceEmbutido, state.abatimento, state.taxaCorrecao);
            const fin = state._fin || Calculator.calcularFinanciamento(lance.cartaEfetiva, state.lanceProprio, state.taxaJuros, state.prazoFinanciamento);
            const finAtivo = state.sistemaAmortizacao === 'price' ? fin.price : fin.sac;
            const amort = fin.valorFinanciado;
            const juros = finAtivo.totalJuros;
            const entrada = fin.entrada;
            segments = [
                { label: 'Amortização', value: amort, color: '#3b82f6' },
                { label: 'Taxas e Admin', value: 0, color: '#10b981' },
                { label: 'Juros (Total)', value: juros, color: '#ef4444' },
                { label: 'Entrada', value: entrada, color: '#f0b429' }
            ];
            $('#donut-total-financiamento').textContent = Calculator.formatarMoeda(finAtivo.totalPago);
        }

        const data = segments.filter(s => s.value > 0);
        const theme = getThemeColors();

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        chartInstances[canvasId] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderWidth: 2,
                    borderColor: document.body.classList.contains('dark-mode') ? '#0f1732' : '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${Calculator.formatarMoeda(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }

    // ── Slider sync ────────────────────────────────────────────
    function setupSliderSync() {
        // Carta de Crédito slider
        const sliderCarta = $('#slider-valor-carta');
        if (sliderCarta && elValorCarta) {
            sliderCarta.addEventListener('input', function () {
                const val = parseFloat(this.value);
                state.valorCarta = val;
                elValorCarta.value = formatarEmTempoReal(val.toFixed(2).replace('.', ','));
                recalcular();
            });
            elValorCarta.addEventListener('input', function () {
                sliderCarta.value = state.valorCarta;
            });
        }

        // Parcela Reversa slider
        const sliderParcela = $('#slider-parcela-reversa');
        if (sliderParcela) {
            sliderParcela.addEventListener('input', function () {
                const parcelaDesejada = parseFloat(this.value);
                $('#label-slider-parcela').textContent = Calculator.formatarMoeda(parcelaDesejada);
                
                // Cálculo reverso: Parcela = (Valor * (1 + Taxa/100)) / Prazo
                // Valor = (Parcela * Prazo) / (1 + Taxa/100)
                const taxaTotalAdmin = (state.taxaAdmin || 0) + (state.fundoReserva || 0);
                const prazo = state.prazo || 12;
                
                let novoValorCarta = (parcelaDesejada * prazo) / (1 + (taxaTotalAdmin / 100));
                
                state.valorCarta = novoValorCarta;
                elValorCarta.value = formatarEmTempoReal(novoValorCarta.toFixed(2).replace('.', ','));
                if (sliderCarta) sliderCarta.value = novoValorCarta;
                
                recalcular();
            });
        }

        // Consórcio prazo slider
        if (elSliderPrazo && elPrazo) {
            elSliderPrazo.addEventListener('input', function () {
                elPrazo.value = this.value;
                state.prazo = parseInt(this.value);
                recalcular();
            });

            elPrazo.addEventListener('input', function () {
                const val = parseInt(this.value) || 12;
                elSliderPrazo.value = val;
                state.prazo = val;
                recalcular();
            });
        }

        // Financiamento prazo slider
        if (elSliderPrazoFin && elPrazoFin) {
            elSliderPrazoFin.addEventListener('input', function () {
                elPrazoFin.value = this.value;
                state.prazoFinanciamento = parseInt(this.value);
                recalcular();
            });
        }
    }

    // ── Chart Type Toggles ─────────────────────────────────────
    function setupChartToggles() {
        const selMain = $('#select-chart-type-main');
        if (selMain) {
            selMain.addEventListener('change', () => {
                if ($('#canvas-evolucao-main')) drawEvolucaoChart('canvas-evolucao-main');
            });
        }
        const selDashboard = $('#select-chart-type-evolucao');
        if (selDashboard) {
            selDashboard.addEventListener('change', () => {
                if ($('#canvas-evolucao')) drawEvolucaoChart('canvas-evolucao');
            });
        }
    }

    // ── Inicialização ──────────────────────────────────────────
    function init() {
        setupNavigation();
        setupChartToggles();

        setupCurrencyInput(elValorCarta, 'valorCarta');
        setupCurrencyInput(elValorLanceProprio, 'lanceProprio');
        setupCurrencyInput(elValorLanceEmbutido, 'lanceEmbutido');

        setupLanceModeToggle('#toggle-modo-lance-proprio', '#input-lance-proprio', '#prefix-lance-proprio', 'lanceProprio');
        setupLanceModeToggle('#toggle-modo-lance-embutido', '#input-lance-embutido', '#prefix-lance-embutido', 'lanceEmbutido');

        // Quando em modo %, os inputs de lance viram type=number — precisam de handler numérico
        // O setupCurrencyInput já lida com type=text. Para %, adicionamos listener extra:
        [elValorLanceProprio, elValorLanceEmbutido].forEach((el, i) => {
            if (!el) return;
            const key = i === 0 ? 'lanceProprio' : 'lanceEmbutido';
            el.addEventListener('input', function () {
                if (lanceModes[key] === 'pct') {
                    state[key] = parseFloat(this.value) || 0;
                    recalcular();
                }
            });
        });

        // Setup numeric inputs — Consórcio
        setupNumericInput(elPrazo, 'prazo');
        setupNumericInput(elTaxaAdmin, 'taxaAdmin');
        setupNumericInput(elFundoReserva, 'fundoReserva');
        setupNumericInput(elTaxaCorrecao, 'taxaCorrecao');
        setupNumericInput(elTaxaJuros, 'taxaJuros');
        setupNumericInput(elTaxaJurosMain, 'taxaJuros');
        setupNumericInput(elTaxaTR, 'taxaTR');
        setupNumericInput(elTaxaTRMain, 'taxaTR');
        setupNumericInput(elPrazoFin, 'prazoFinanciamento');
        setupNumericInput(elPrazoFinComp, 'prazoFinanciamento');

        // Toggles
        setupToggle(elToggleAbatimento, 'abatimento');
        setupToggle(elToggleAmortizacao, 'sistemaAmortizacao');
        setupToggle(elToggleAmortizacaoMain, 'sistemaAmortizacao');

        // Navigation
        setupNavigation();

        // Sliders
        setupSliderSync();

        // Theme Toggle
        const themeBtn = $('#theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                try {
                    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
                } catch (e) { console.warn('localStorage indisponivel', e); }
                // Redraw visible charts
                if ($('#simulador').classList.contains('active-section')) {
                    drawEvolucaoChart('canvas-evolucao-main');
                }
                if ($('#dashboard').classList.contains('active-section')) {
                    drawAllCharts();
                }
            });
            // Carregar preferencia
            try {
                if (localStorage.getItem('theme') === 'dark') {
                    document.body.classList.add('dark-mode');
                }
            } catch (e) { console.warn('localStorage indisponivel', e); }
        }

        // Initial calculation
        recalcular();

        // Resize handler for charts
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if ($('#simulador').classList.contains('active-section')) {
                    drawEvolucaoChart('canvas-evolucao-main');
                }
                if ($('#dashboard').classList.contains('active-section')) {
                    drawAllCharts();
                }
            }, 200);
        });

        // Exportar PDF
        const btnExportPdf = $('#btn-export-pdf');
        if (btnExportPdf) {
            btnExportPdf.addEventListener('click', async () => {
                if (state.valorCarta <= 0) {
                    alert('Por favor, preencha o valor da carta de crédito do consórcio antes de gerar a proposta.');
                    return;
                }

                const originalText = btnExportPdf.innerHTML;
                btnExportPdf.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Processando Arquivo...';
                btnExportPdf.style.opacity = '0.7';
                btnExportPdf.style.pointerEvents = 'none';

                try {
                    const overlay = $('#pdf-loading-overlay');
                    if (overlay) overlay.classList.add('active');
                    
                    // Allow UI to render the overlay before freezing thread
                    await new Promise(r => setTimeout(r, 100));

                    // ── 1. GERAR O PDF (PDFMAKE VETORIAL NATIVO) ──
                    const fmtMoeda = (v) => Calculator.formatarMoeda(v);
                    
                    const valorBem = state._lance ? state._lance.cartaEfetiva : state.valorCarta;
                    const parcelaC = state._lance ? state._lance.novaParcela : 0;
                    const totalC = state._lance ? state._lance.totalPago : 0;
                    const totalF = state._finAtivo ? state._finAtivo.totalPago : 0;
                    const parcelaF = state._finAtivo ? (state._finAtivo.tabela[0]?.parcela || 0) : 0;
                    const prazoC = state._lance ? state._lance.novoPrazo : state.prazo;
                    const prazoF = state.prazoFinanciamento || 0;
                    const taxaJuros = state.taxaJuros || 0;
                    const isComparativo = (prazoF > 0 && taxaJuros > 0);

                    const docDefinition = {
                        pageSize: 'A4',
                        pageMargins: [30, 30, 30, 30],
                        defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1e293b' },
                        styles: {
                            headerTitle: { fontSize: 22, bold: true, color: '#00e5ff' },
                            headerSub: { fontSize: 10, color: '#94a3b8' },
                            headerDate: { fontSize: 9, color: '#94a3b8', alignment: 'right' },
                            
                            sectionTitle: { fontSize: 14, bold: true, color: '#0f172a', margin: [0, 15, 0, 10] },
                            
                            tableHeaderLine: { bold: true, fontSize: 9, color: '#ffffff', fillColor: '#0f172a', alignment: 'center', margin: [4, 6, 4, 6] },
                            tableCellLabel: { bold: true, fontSize: 10, color: '#475569', fillColor: '#f8fafc', margin: [4, 6, 4, 6] },
                            tableCellC: { bold: true, fontSize: 10, color: '#0e7490', alignment: 'center', margin: [4, 6, 4, 6] },
                            tableCellF: { bold: true, fontSize: 10, color: '#be123c', alignment: 'center', margin: [4, 6, 4, 6] },
                            tableCellR: { bold: true, fontSize: 9, alignment: 'center', margin: [4, 6, 4, 6] },
                            
                            tagWin: { color: '#166534', bold: true },
                            tagLoss: { color: '#991b1b', bold: true },
                            tagNeutral: { color: '#475569', bold: true },
                            
                            soloLabel: { bold: true, color: '#475569', fontSize: 10 },
                            soloVal: { bold: true, color: '#0f172a', fontSize: 10, alignment: 'right' },
                            soloTotal: { bold: true, color: '#ffffff', fontSize: 11, fillColor: '#0e7490', margin: [5, 8, 5, 8] },
                            
                            verdictTitle: { fontSize: 9, bold: true, color: '#047857', alignment: 'center', margin: [0,0,0,2] },
                            verdictVal: { fontSize: 20, bold: true, color: '#059669', alignment: 'center', margin: [0,0,0,2] },
                            verdictSub: { fontSize: 10, color: '#065f46', alignment: 'center' }
                        },
                        content: [
                            // CABEÇALHO
                            {
                                table: {
                                    widths: ['*'],
                                    body: [
                                        [
                                            {
                                                fillColor: '#0f172a',
                                                border: [false, false, false, false],
                                                margin: [20, 20, 20, 20],
                                                columns: [
                                                    {
                                                        width: '*',
                                                        stack: [
                                                            { text: 'ConsórcioPro', style: 'headerTitle' },
                                                            { text: 'Análise Técnica Comparativa de Viabilidade Financeira', style: 'headerSub' }
                                                        ]
                                                    },
                                                    {
                                                        width: 'auto',
                                                        stack: [
                                                            { text: `Data: ${new Date().toLocaleDateString('pt-BR')}`, style: 'headerDate' }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    ]
                                },
                                margin: [-30, -30, -30, 20]
                            }
                        ]
                    };

                    // TABELAS
                    if (isComparativo) {
                        const custoJurosF = state._finAtivo ? state._finAtivo.totalJuros : 0;
                        const custoAdmC = state._lance ? (state._lance.totalAdmin + state._lance.totalReserva) : 0;
                        const cetC = state._lance ? state._lance.cetConsorcio : 0;
                        const diffTotal = totalF - totalC;

                        const tagRes = (vC, vF, lowerWins = true) => {
                            if (lowerWins) {
                                if (vC < vF) return { text: '✓ VANTAGEM', style: 'tagWin' };
                                if (vC > vF) return { text: '✗ DESVANTAGEM', style: 'tagLoss' };
                            } else {
                                if (vC > vF) return { text: '✓ VANTAGEM', style: 'tagWin' };
                                if (vC < vF) return { text: '✗ DESVANTAGEM', style: 'tagLoss' };
                            }
                            return { text: '= EQUIVALENTE', style: 'tagNeutral' };
                        };

                        docDefinition.content.push({ text: 'QUADRO COMPARATIVO TÉCNICO', style: 'sectionTitle' });
                        docDefinition.content.push({
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'INDICADOR', style: 'tableHeaderLine', fillColor: '#1e293b', alignment: 'left' },
                                        { text: 'CONSÓRCIO', style: 'tableHeaderLine', fillColor: '#0e7490' },
                                        { text: 'FINANCIAMENTO', style: 'tableHeaderLine', fillColor: '#be123c' },
                                        { text: 'RESULTADO', style: 'tableHeaderLine' }
                                    ],
                                    [
                                        { text: 'Crédito Contratado', style: 'tableCellLabel' },
                                        { text: fmtMoeda(valorBem), style: 'tableCellC' },
                                        { text: fmtMoeda(valorBem), style: 'tableCellF' },
                                        { text: '= IGUAL', style: ['tableCellR', 'tagNeutral'] }
                                    ],
                                    [
                                        { text: 'Lance / Entrada Ofertada', style: 'tableCellLabel' },
                                        { 
                                            text: [
                                                { text: fmtMoeda(state._lance ? state._lance.totalLanceOfertado : 0) },
                                                { text: `\n(${fmtMoeda(state._lance ? state._lance.lanceProprio : 0)} Próprio + ${fmtMoeda(state._lance ? state._lance.lanceEmbutido : 0)} Emb.)`, fontSize: 8, color: '#475569', bold: false }
                                            ],
                                            style: 'tableCellC'
                                        },
                                        { 
                                            text: [
                                                { text: fmtMoeda(state._lance ? state._lance.lanceProprio : 0) },
                                                { text: `\n(Entrada em Dinheiro)`, fontSize: 8, color: '#475569', bold: false }
                                            ],
                                            style: 'tableCellF'
                                        },
                                        { text: '-', style: ['tableCellR', 'tagNeutral'] }
                                    ],
                                    [
                                        { text: 'Prazo da Operação', style: 'tableCellLabel' },
                                        { text: `${prazoC} meses`, style: 'tableCellC' },
                                        { text: `${prazoF} meses`, style: 'tableCellF' },
                                        { ...tagRes(prazoC, prazoF), style: ['tableCellR', tagRes(prazoC, prazoF).style] }
                                    ],
                                    [
                                        { text: 'Parcela Mensal', style: 'tableCellLabel' },
                                        { text: fmtMoeda(parcelaC), style: 'tableCellC' },
                                        { text: fmtMoeda(parcelaF), style: 'tableCellF' },
                                        { ...tagRes(parcelaC, parcelaF), style: ['tableCellR', tagRes(parcelaC, parcelaF).style] }
                                    ],
                                    [
                                        { text: 'Custo com Juros / Taxas', style: 'tableCellLabel' },
                                        { text: fmtMoeda(custoAdmC), style: 'tableCellC' },
                                        { text: fmtMoeda(custoJurosF), style: 'tableCellF' },
                                        { ...tagRes(custoAdmC, custoJurosF), style: ['tableCellR', tagRes(custoAdmC, custoJurosF).style] }
                                    ],
                                    [
                                        { text: 'Taxa Efetiva (CET)', style: 'tableCellLabel' },
                                        { text: `${Calculator.formatarNumero(cetC, 2)}%`, style: 'tableCellC' },
                                        { text: `${taxaJuros}% a.a.`, style: 'tableCellF' },
                                        { ...tagRes(cetC, taxaJuros), style: ['tableCellR', tagRes(cetC, taxaJuros).style] }
                                    ],
                                    [
                                        { text: 'Total Desembolsado', style: 'tableCellLabel', color: '#0f172a' },
                                        { 
                                            text: [
                                                { text: fmtMoeda(totalC), fontSize: 11 },
                                                { text: `\n(Próprio: ${fmtMoeda(state._lance ? state._lance.lanceProprio : 0)} + Parc: ${fmtMoeda(totalC - (state._lance ? state._lance.lanceProprio : 0))})`, fontSize: 8, color: '#475569', bold: false }
                                            ],
                                            style: 'tableCellC'
                                        },
                                        { 
                                            text: [
                                                { text: fmtMoeda(totalF), fontSize: 11 },
                                                { text: `\n(Entrada: ${fmtMoeda(state._lance ? state._lance.lanceProprio : 0)} + Parc: ${fmtMoeda(totalF - (state._lance ? state._lance.lanceProprio : 0))})`, fontSize: 8, color: '#475569', bold: false }
                                            ],
                                            style: 'tableCellF'
                                        },
                                        { ...tagRes(totalC, totalF), style: ['tableCellR', tagRes(totalC, totalF).style], fontSize: 10 }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: () => 1,
                                vLineWidth: () => 0,
                                hLineColor: () => '#e2e8f0',
                                paddingLeft: () => 0,
                                paddingRight: () => 0
                            },
                            margin: [0, 0, 0, 20]
                        });

                        if (diffTotal > 0) {
                            const econPct = totalF > 0 ? ((diffTotal / totalF) * 100).toFixed(1) : '0.0';
                            docDefinition.content.push({
                                table: {
                                    widths: ['*'],
                                    body: [
                                        [
                                            {
                                                fillColor: '#ecfdf5',
                                                border: [true, true, true, true],
                                                borderColor: ['#10b981', '#10b981', '#10b981', '#10b981'],
                                                margin: [15, 15, 15, 15],
                                                stack: [
                                                    { text: 'ECONOMIA TOTAL PROJETADA COM O CONSÓRCIO', style: 'verdictTitle' },
                                                    { text: `+ ${fmtMoeda(diffTotal)}`, style: 'verdictVal' },
                                                    { text: `Representa ${econPct}% de redução sobre o custo do financiamento`, style: 'verdictSub' }
                                                ]
                                            }
                                        ]
                                    ]
                                },
                                layout: { defaultBorder: true },
                                margin: [0, 0, 0, 20]
                            });
                        }
                    } else {
                        docDefinition.content.push({ text: 'PLANO ESTRUTURADO — CONSÓRCIO', style: 'sectionTitle' });
                        docDefinition.content.push({
                            table: {
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        { text: 'Crédito Total (Carta + Próprio):', style: 'soloLabel' },
                                        { text: fmtMoeda((valorBem - (state._lance ? state._lance.lanceProprio : 0) - (state._lance ? state._lance.lanceEmbutido : 0)) + (state._lance ? state._lance.lanceProprio : 0)), style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Lance Próprio:', style: 'soloLabel' },
                                        { text: fmtMoeda(state._lance ? state._lance.lanceProprio : 0), style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Lance Embutido:', style: 'soloLabel' },
                                        { text: fmtMoeda(state._lance ? state._lance.lanceEmbutido : 0), style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Crédito Líquido Disponível:', style: 'soloLabel' },
                                        { text: fmtMoeda(state._lance ? valorBem - state._lance.lanceProprio - state._lance.lanceEmbutido : valorBem), style: 'soloVal', color: '#0e7490' }
                                    ],
                                    [
                                        { text: 'Prazo do Grupo:', style: 'soloLabel' },
                                        { text: `${prazoC} meses`, style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Taxa Administrativa:', style: 'soloLabel' },
                                        { text: `${state.taxaAdmin}% total`, style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Parcela Mensal:', style: 'soloLabel' },
                                        { text: fmtMoeda(parcelaC), style: 'soloVal' }
                                    ],
                                    [
                                        { text: 'Custo Total da Operação:', style: 'soloTotal' },
                                        { 
                                            text: [
                                                { text: fmtMoeda(totalC) },
                                                { text: `\n(${fmtMoeda(state._lance ? state._lance.lanceProprio : 0)} Próprio + ${fmtMoeda(totalC - (state._lance ? state._lance.lanceProprio : 0))} Parcelas)`, fontSize: 9, color: '#cbd5e1', bold: false }
                                            ],
                                            style: 'soloTotal', alignment: 'right' 
                                        }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: (i, node) => (i === node.table.body.length - 1 || i === node.table.body.length) ? 0 : 1,
                                vLineWidth: () => 0,
                                hLineColor: () => '#e2e8f0',
                                paddingLeft: () => 5,
                                paddingRight: () => 5,
                                paddingTop: () => 8,
                                paddingBottom: () => 8
                            },
                            margin: [0, 0, 0, 20]
                        });
                    }

                    // ── 3. GERAR E BAIXAR (PDFMAKE NATIVO) ──
                    pdfMake.createPdf(docDefinition).download('Proposta_Comercial_ConsorcioPro.pdf');

                } catch (err) {
                    console.error('Erro ao gerar PDF:', err);
                    alert('Erro ao gerar a apresentação em PDF. Verifique o console.');
                } finally {
                    const overlay = $('#pdf-loading-overlay');
                    if (overlay) overlay.classList.remove('active');
                }

                btnExportPdf.innerHTML = originalText;
                btnExportPdf.style.opacity = '1';
                btnExportPdf.style.pointerEvents = 'auto';
            });
        }

    }

    // Guarantee page is always visible, even if init() crashes
    function safeStart() {
        // Show body immediately
        document.body.classList.add('loaded');
        try {
            init();
        } catch (e) {
            console.error('Erro ao inicializar app:', e);
        }
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeStart);
    } else {
        safeStart();
    }
})();
