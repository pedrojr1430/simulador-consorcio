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
    const lanceModes = { lanceProprio: 'valor', lanceEmbutido: 'valor' };

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

    // ── Tabela de Amortização Toggle ───────────────────────────
    function setupAmortTable() {
        const btn = $('#btn-toggle-amort');
        const body = $('#amort-table-body');
        if (btn && body) {
            btn.addEventListener('click', () => {
                body.classList.toggle('collapsed');
                btn.classList.toggle('rotated');
            });
        }
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
        $('#overview-carta').textContent = Calculator.formatarMoeda(valorCarta);
        $('#overview-lance').textContent = Calculator.formatarMoeda(totalLance);
        $('#overview-saldo').textContent = Calculator.formatarMoeda(lance.saldoDevedor);
        $('#overview-total').textContent = Calculator.formatarMoeda(lance.totalPago);
        $('#overview-cet').textContent = `${Calculator.formatarNumero(lance.cetConsorcio, 2)}%`;

        // Bars
        const lancePctBar = valorCarta > 0 ? Math.min(100, (totalLance / valorCarta) * 100) : 0;
        $('#bar-lance').style.width = `${lancePctBar}%`;
        const saldoPctBar = valorCarta > 0 ? Math.min(100, (lance.saldoDevedor / basica.totalPagar) * 100) : 0;
        $('#bar-saldo').style.width = `${saldoPctBar}%`;

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
        const totalConsorcio = lance.totalPago;
        const totalFinanciamento = finAtivo.totalPago;
        const maxTotal = Math.max(totalConsorcio, totalFinanciamento, 1);

        $('#comp-total-consorcio').textContent = Calculator.formatarMoeda(totalConsorcio);
        $('#comp-total-financiamento').textContent = Calculator.formatarMoeda(totalFinanciamento);
        $('#compbar-consorcio').style.width = `${(totalConsorcio / maxTotal) * 100}%`;
        $('#compbar-financiamento').style.width = `${(totalFinanciamento / maxTotal) * 100}%`;

        // Tabela comparativa
        const labelCompParcela = $('#label-comp-parcela');
        if (labelCompParcela) labelCompParcela.textContent = taxaCorrecao > 0 ? 'Parcela Inicial' : 'Parcela Mensal';
        $('#tab-parcela-consorcio').textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        $('#tab-parcela-financiamento').textContent = Calculator.formatarMoeda(parcelaFin);
        $('#tab-prazo-consorcio').textContent = `${lance.novoPrazo} meses`;
        $('#tab-prazo-financiamento').textContent = `${prazoFinanciamento} meses`;
        $('#tab-lance-consorcio').textContent = Calculator.formatarMoeda(totalLance);
        $('#tab-entrada-financiamento').textContent = Calculator.formatarMoeda(entrada);
        $('#tab-custo-consorcio').textContent = Calculator.formatarMoeda(totalConsorcio);
        $('#tab-custo-financiamento').textContent = Calculator.formatarMoeda(totalFinanciamento);
        $('#tab-juros-consorcio').textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        $('#tab-juros-financiamento').textContent = Calculator.formatarMoeda(finAtivo.totalJuros);

        // Highlight winner
        highlightWinner('#tab-parcela-consorcio', '#tab-parcela-financiamento', lance.novaParcela, parcelaFin, true);
        highlightWinner('#tab-prazo-consorcio', '#tab-prazo-financiamento', lance.novoPrazo, prazoFinanciamento, true);
        highlightWinner('#tab-custo-consorcio', '#tab-custo-financiamento', totalConsorcio, totalFinanciamento, true);
        highlightWinner('#tab-juros-consorcio', '#tab-juros-financiamento', lance.custoConsorcio, finAtivo.totalJuros, true);

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
        }

        // 7. Dashboard KPIs
        $('#kpi-valor-carta').textContent = Calculator.formatarMoeda(valorCarta);
        $('#kpi-valor-parcela').textContent = Calculator.formatarMoeda(lance.novaParcela);
        $('#kpi-valor-prazo').textContent = `${lance.novoPrazo} meses`;
        $('#kpi-valor-economia').textContent = Calculator.formatarMoeda(Math.max(0, economia));
        if (economia > 0) {
            $('#kpi-economia').classList.add('positive');
        } else {
            $('#kpi-economia').classList.remove('positive');
        }

        // 8. Tabela de Amortização
        buildAmortTable(finAtivo.tabela);

        // 9. Store calculated data for charts
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
        syncInputValue(elTaxaJuros, taxaJuros);
        syncInputValue(elTaxaJurosMain, taxaJuros);
        syncInputValue(elTaxaTR, state.taxaTR);
        syncInputValue(elTaxaTRMain, state.taxaTR);
        syncInputValue(elPrazoFin, prazoFinanciamento);
        syncInputValue(elPrazoFinComp, prazoFinanciamento);
        syncInputValue(elSliderPrazoFin, prazoFinanciamento);
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

    // ── Tabela de Amortização ──────────────────────────────────
    function buildAmortTable(tabela) {
        const tbody = $('#amort-tbody');
        if (!tbody || !tabela) return;

        // Only show first 12, then every 12th, plus last
        const rows = [];
        for (let i = 0; i < tabela.length; i++) {
            if (i < 12 || i % 12 === 0 || i === tabela.length - 1) {
                rows.push(tabela[i]);
            }
        }

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${r.mes}</td>
                <td>${Calculator.formatarMoeda(r.parcela)}</td>
                <td>${Calculator.formatarMoeda(r.juros)}</td>
                <td>${Calculator.formatarMoeda(r.amortizacao)}</td>
                <td>${Calculator.formatarMoeda(r.saldoDevedor)}</td>
            </tr>
        `).join('');
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
        const { valorCarta, prazo, taxaAdmin, fundoReserva, taxaCorrecao, lanceProprio, lanceEmbutido, abatimento, taxaJuros, prazoFinanciamento } = state;
        const lance = Calculator.calcularLance(valorCarta, taxaAdmin, fundoReserva, prazo, lanceProprio, lanceEmbutido, abatimento, taxaCorrecao);
        const fin = Calculator.calcularFinanciamento(lance.cartaEfetiva, lanceProprio, taxaJuros, prazoFinanciamento);

        const priceData = fin.price.tabela.map(r => r.parcela);
        const sacData = fin.sac.tabela.map(r => r.parcela);
        const consorcioData = lance.tabela.map(r => r.parcela);
        const maxMes = Math.max(prazoFinanciamento, lance.novoPrazo);

        // Cria array de labels do eixo X (ex: 0, 1, 2... meses)
        const labels = Array.from({ length: maxMes }, (_, i) => i + 1);

        const theme = getThemeColors();

        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }

        Chart.defaults.font.family = "'Inter', sans-serif";

        chartInstances[canvasId] = new Chart(canvas, {
            type: 'line', 
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Consórcio',
                        data: consorcioData,
                        borderColor: '#06b6d4', 
                        backgroundColor: '#06b6d4',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#06b6d4'
                    },
                    {
                        label: 'Financ. (Price)',
                        data: priceData,
                        borderColor: '#ef4444', 
                        backgroundColor: '#ef4444',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#ef4444'
                    },
                    {
                        label: 'Financ. (SAC)',
                        data: sacData,
                        borderColor: '#f59e0b', 
                        backgroundColor: '#f59e0b',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#f59e0b'
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

    // ── Inicialização ──────────────────────────────────────────
    function init() {
        // Setup currency inputs
        setupCurrencyInput(elValorCarta, 'valorCarta');
        setupCurrencyInput(elValorLanceProprio, 'lanceProprio');
        setupCurrencyInput(elValorLanceEmbutido, 'lanceEmbutido');

        // Lance mode toggles (R$ / %)
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

        // Amort table toggle
        setupAmortTable();

        // Theme Toggle
        const themeBtn = $('#theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
                // Redraw visible charts
                if ($('#simulador').classList.contains('active-section')) {
                    drawEvolucaoChart('canvas-evolucao-main');
                }
                if ($('#dashboard').classList.contains('active-section')) {
                    drawAllCharts();
                }
            });
            // Carregar preferencia
            if (localStorage.getItem('theme') === 'dark') {
                document.body.classList.add('dark-mode');
            }
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
                btnExportPdf.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Gerando Proposta com IA...';
                btnExportPdf.style.opacity = '0.7';
                btnExportPdf.style.pointerEvents = 'none';

                try {
                    // ── 1. BUSCAR PARECER DA IA ──
                    const totalConsorcio = state._lance ? state._lance.totalPago : 0;
                    const totalFinanciamento = state._finAtivo ? state._finAtivo.totalPago : 0;
                    const economia = totalFinanciamento - totalConsorcio;
                    const economiaStr = economia > 0 ? Calculator.formatarMoeda(economia) : 'R$ 0,00';

                    const payload = {
                        valorCarta: Calculator.formatarMoeda(state.valorCarta || 0),
                        valorParcela: Calculator.formatarMoeda(state._lance ? state._lance.novaParcela : 0),
                        prazo: state._lance ? state._lance.novoPrazo : 0,
                        lance: Calculator.formatarMoeda(state.lanceProprio + state.lanceEmbutido),
                        economiaTotal: economiaStr,
                        parcelaFinanciamento: state._finAtivo && state._finAtivo.tabela && state._finAtivo.tabela[0] ? Calculator.formatarMoeda(state._finAtivo.tabela[0].parcela) : 'R$ 0,00',
                        prazoFinanciamento: state.prazoFinanciamento || 0,
                        totalConsorcio: Calculator.formatarMoeda(totalConsorcio),
                        totalFinanciamento: Calculator.formatarMoeda(totalFinanciamento),
                        isComparativo: (state.prazoFinanciamento > 0 && state.taxaJuros > 0)
                    };

                    let iaText = '';
                    try {
                        const response = await fetch('/api/generate-pitch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (response.ok) {
                            const data = await response.json();
                            iaText = data.text;
                        }
                    } catch (e) {
                        console.error('Falha ao comunicar com IA', e);
                    }

                    // ── 2. GERAR O PDF VIA HTML2PDF ──
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

                    // Pega o gráfico
                    let chartImg = '';
                    if (chartInstances['canvas-evolucao-main']) chartImg = chartInstances['canvas-evolucao-main'].toBase64Image('image/png', 1.0);
                    else if (chartInstances['canvas-evolucao']) chartImg = chartInstances['canvas-evolucao'].toBase64Image('image/png', 1.0);

                    // Cria um container off-screen para o template PDF
                    const pdfContainer = document.createElement('div');
                    pdfContainer.style.width = '794px'; // Largura A4 padrão a 96 DPI
                    pdfContainer.style.background = '#ffffff';
                    pdfContainer.style.color = '#1e293b';
                    pdfContainer.style.fontFamily = 'Inter, sans-serif';
                    pdfContainer.style.padding = '0';
                    pdfContainer.style.margin = '0';
                    pdfContainer.style.position = 'fixed';
                    pdfContainer.style.top = '0';
                    pdfContainer.style.left = '0';
                    pdfContainer.style.zIndex = '-9999';
                    pdfContainer.style.opacity = '0';
                    pdfContainer.style.pointerEvents = 'none';
                    // CSS Interno para o PDF
                    const pdfCSS = `
                        <style>
                            .pdf-wrapper { padding: 40px; box-sizing: border-box; }
                            .pdf-header { background: #0f172a; padding: 30px 40px; color: white; display: flex; justify-content: space-between; align-items: center; margin: -40px -40px 30px -40px; }
                            .pdf-title-box h1 { margin: 0; color: #06b6d4; font-size: 28px; font-weight: 800; }
                            .pdf-title-box p { margin: 5px 0 0 0; color: #e2e8f0; font-size: 14px; }
                            .pdf-date { text-align: right; color: #94a3b8; font-size: 12px; }
                            
                            .pdf-ia-box { background: #f8fafc; border-left: 4px solid #06b6d4; padding: 20px 25px; border-radius: 0 8px 8px 0; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
                            .pdf-ia-title { color: #0f172a; font-weight: 700; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
                            .pdf-ia-content { font-size: 13px; line-height: 1.6; color: #334155; }
                            .pdf-ia-content p { margin-top: 0; margin-bottom: 10px; }
                            .pdf-ia-content ul { margin: 0 0 10px 0; padding-left: 20px; }
                            
                            .pdf-section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
                            
                            .pdf-cards { display: flex; gap: 20px; margin-bottom: 20px; }
                            .pdf-card { flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
                            .pdf-card-title { font-size: 16px; font-weight: 700; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                            .pdf-card-title.consorcio { color: #06b6d4; }
                            .pdf-card-title.financiamento { color: #ef4444; }
                            .pdf-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 4px; }
                            .pdf-row:last-child { border: none; }
                            .pdf-row-label { font-weight: 600; color: #475569; }
                            .pdf-row-val { color: #0f172a; }
                            .pdf-total { margin-top: 15px; background: #f8fafc; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; color: #0f172a; }
                            
                            .pdf-verdict { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 30px; }
                            .pdf-verdict-title { font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; margin: 0 0 5px 0; }
                            .pdf-verdict-val { font-size: 22px; font-weight: 800; color: #059669; margin: 0; }
                            
                            .pdf-chart { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px; }
                            .pdf-chart img { max-width: 100%; height: auto; max-height: 250px; }
                            
                            .pdf-footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; }
                        </style>
                    `;

                    // IA HTML
                    const iaHtml = iaText ? `
                        <div class="pdf-ia-box">
                            <div class="pdf-ia-title">
                                Parecer do Especialista (Inteligência Artificial)
                            </div>
                            <div class="pdf-ia-content">${iaText}</div>
                        </div>
                    ` : '';

                    // Cards HTML
                    let cardsHtml = '';
                    let verdictHtml = '';

                    if (isComparativo) {
                        cardsHtml = `
                            <div class="pdf-cards">
                                <div class="pdf-card">
                                    <h3 class="pdf-card-title consorcio">Consórcio</h3>
                                    <div class="pdf-row"><span class="pdf-row-label">Crédito:</span><span class="pdf-row-val">${fmtMoeda(valorBem)}</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Prazo:</span><span class="pdf-row-val">${prazoC} meses</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Taxa Adm.:</span><span class="pdf-row-val">${state.taxaAdmin}% total</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Parcela Mensal:</span><span class="pdf-row-val">${fmtMoeda(parcelaC)}</span></div>
                                    <div class="pdf-total"><span>Custo Final:</span><span>${fmtMoeda(totalC)}</span></div>
                                </div>
                                <div class="pdf-card">
                                    <h3 class="pdf-card-title financiamento">Financiamento Bancário</h3>
                                    <div class="pdf-row"><span class="pdf-row-label">Crédito:</span><span class="pdf-row-val">${fmtMoeda(valorBem)}</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Prazo:</span><span class="pdf-row-val">${prazoF} meses</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Juros:</span><span class="pdf-row-val">${taxaJuros}% a.a.</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">1ª Parcela:</span><span class="pdf-row-val">${fmtMoeda(parcelaF)}</span></div>
                                    <div class="pdf-total"><span>Custo Final:</span><span>${fmtMoeda(totalF)}</span></div>
                                </div>
                            </div>
                        `;
                        if (economia > 0) {
                            verdictHtml = `
                                <div class="pdf-verdict">
                                    <p class="pdf-verdict-title">Lucro / Economia Gerada no Consórcio</p>
                                    <p class="pdf-verdict-val">+ ${fmtMoeda(economia)}</p>
                                </div>
                            `;
                        }
                    } else {
                        cardsHtml = `
                            <div class="pdf-cards" style="justify-content: center;">
                                <div class="pdf-card" style="max-width: 400px;">
                                    <h3 class="pdf-card-title consorcio">Plano Estruturado - Consórcio</h3>
                                    <div class="pdf-row"><span class="pdf-row-label">Crédito (Capital):</span><span class="pdf-row-val">${fmtMoeda(valorBem)}</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Prazo do Grupo:</span><span class="pdf-row-val">${prazoC} meses</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Taxa Administrativa:</span><span class="pdf-row-val">${state.taxaAdmin}% total</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Lance Ofertado:</span><span class="pdf-row-val">${fmtMoeda(state.lanceProprio + state.lanceEmbutido)}</span></div>
                                    <div class="pdf-row"><span class="pdf-row-label">Parcela Mensal:</span><span class="pdf-row-val">${fmtMoeda(parcelaC)}</span></div>
                                    <div class="pdf-total"><span>Custo Total da Operação:</span><span>${fmtMoeda(totalC)}</span></div>
                                </div>
                            </div>
                        `;
                    }

                    // Chart HTML
                    const chartHtml = chartImg ? `
                        <div class="pdf-chart">
                            <h3 style="font-size: 14px; margin: 0 0 10px 0; color: #475569;">Evolução Financeira ao Longo do Tempo</h3>
                            <img src="${chartImg}" alt="Gráfico">
                        </div>
                    ` : '';

                    const fullHtml = `
                        ${pdfCSS}
                        <div class="pdf-wrapper">
                            <div class="pdf-header">
                                <div class="pdf-title-box">
                                    <h1>ConsórcioPro</h1>
                                    <p>Apresentação Comercial de Viabilidade</p>
                                </div>
                                <div class="pdf-date">
                                    Data: ${new Date().toLocaleDateString('pt-BR')}<br>
                                    Proposta Oficial
                                </div>
                            </div>
                            
                            ${iaHtml}
                            
                            <h2 class="pdf-section-title">Resumo Financeiro da Operação</h2>
                            ${cardsHtml}
                            ${verdictHtml}
                            ${chartHtml}
                            
                            <div class="pdf-footer">
                                Este documento é uma simulação estratégica (Análise por IA) e não configura proposta oficial vinculativa.<br>
                                Valores sujeitos a alteração conforme tabela da administradora e análise de crédito.
                            </div>
                        </div>
                    `;

                    pdfContainer.innerHTML = fullHtml;
                    document.body.appendChild(pdfContainer);

                    // Gerar o PDF usando html2pdf
                    const opt = {
                        margin:       0,
                        filename:     'Proposta_Comercial_ConsorcioPro.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    await html2pdf().set(opt).from(pdfContainer).save();
                    
                    // Cleanup
                    document.body.removeChild(pdfContainer);

                } catch (err) {
                    console.error('Erro ao gerar PDF:', err);
                    alert('Erro ao gerar a apresentação em PDF. Verifique o console.');
                }

                btnExportPdf.innerHTML = originalText;
                btnExportPdf.style.opacity = '1';
                btnExportPdf.style.pointerEvents = 'auto';
            });
        }

        // Entrance animations
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
