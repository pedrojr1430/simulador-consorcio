const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('Gerar Análise Comparativa', 'Gerar Apresentação');
html = html.replace('<input type="text" id="taxa-juros" class="input-field" value="0" data-type="percent">', '<input type="text" id="taxa-juros" class="input-field" placeholder="0" data-type="percent">');
html = html.replace('<input type="number" id="prazo-financiamento" class="input-field" value="0">', '<input type="number" id="prazo-financiamento" class="input-field" placeholder="0">');

const oldSection = \<div class="overview-metric">
                            <div class="metric-header">
                                <span class="metric-label">Valor da Carta</span>
                                <span class="metric-value" id="overview-carta">R$ 100.000,00</span>
                            </div>
                        </div>
                        <div class="overview-metric">
                            <div class="metric-header">
                                <span class="metric-label">Lance Oferecido</span>
                                <span class="metric-value accent" id="overview-lance">R$ 30.000,00</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-bar-fill emerald" id="bar-lance" style="width: 30%"></div>
                            </div>
                        </div>
                        <div class="overview-metric">
                            <div class="metric-header">
                                <span class="metric-label">Saldo Devedor Após Lance</span>
                                <span class="metric-value" id="overview-saldo">R$ 82.600,00</span>
                            </div>
                            <div class="metric-bar">
                                <div class="metric-bar-fill blue" id="bar-saldo" style="width: 70%"></div>
                            </div>
                        </div>
                        <div class="overview-metric">
                            <div class="metric-header">
                                <span class="metric-label">Total a Desembolsar</span>
                                <span class="metric-value" id="overview-total">R$ 112.600,00</span>
                            </div>
                        </div>
                         <div class="overview-metric">
                            <div class="metric-header">
                                <span class="metric-label">Custo Efetivo Total (%)</span>
                                <span class="metric-value gold" id="overview-cet">18,00%</span>
                            </div>
                        </div>\;

const newSection = \<!-- Tabela Comparativa na Main -->
                        <div class="comparison-table-wrapper" style="margin-top: 0; padding: 0; overflow-x: auto;">
                            <table class="comparison-table" id="tabela-comparativa-main" style="width: 100%; font-size: 0.85rem;">
                                <thead>
                                    <tr>
                                        <th style="padding: 8px;">Critério</th>
                                        <th class="col-consorcio" style="padding: 8px;">Consórcio</th>
                                        <th class="col-financiamento" style="padding: 8px;">Financiamento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td id="label-comp-parcela-main" style="padding: 8px;">Parcela Mensal</td>
                                        <td class="col-consorcio highlight" id="tab-parcela-consorcio-main" style="padding: 8px;">R$ 0,00</td>
                                        <td class="col-financiamento" id="tab-parcela-financiamento-main" style="padding: 8px;">R$ 0,00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px;">Prazo</td>
                                        <td class="col-consorcio" id="tab-prazo-consorcio-main" style="padding: 8px;">0 meses</td>
                                        <td class="col-financiamento" id="tab-prazo-financiamento-main" style="padding: 8px;">0 meses</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px;">Entrada / Lance</td>
                                        <td class="col-consorcio" id="tab-lance-consorcio-main" style="padding: 8px;">R$ 0,00</td>
                                        <td class="col-financiamento" id="tab-entrada-financiamento-main" style="padding: 8px;">R$ 0,00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px;">Custo Total</td>
                                        <td class="col-consorcio" id="tab-custo-consorcio-main" style="padding: 8px;">R$ 0,00</td>
                                        <td class="col-financiamento" id="tab-custo-financiamento-main" style="padding: 8px;">R$ 0,00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px;">Juros / Taxas Pagos</td>
                                        <td class="col-consorcio" id="tab-juros-consorcio-main" style="padding: 8px;">R$ 0,00</td>
                                        <td class="col-financiamento" id="tab-juros-financiamento-main" style="padding: 8px;">R$ 0,00</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>\;

html = html.replace(oldSection, newSection);
fs.writeFileSync('index.html', html, 'utf8');

let appJs = fs.readFileSync('app.js', 'utf8');
const searchAppJs = \        #tab-parcela-consorcio.textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        #tab-parcela-financiamento.textContent = Calculator.formatarMoeda(dispParcelaFin);
        #tab-prazo-consorcio.textContent = \\\\\\ meses\\\;
        #tab-prazo-financiamento.textContent = \\\\\\ meses\\\;
        #tab-lance-consorcio.textContent = Calculator.formatarMoeda(totalLance);
        #tab-entrada-financiamento.textContent = Calculator.formatarMoeda(dispEntradaFin);
        #tab-custo-consorcio.textContent = Calculator.formatarMoeda(totalConsorcio);
        #tab-custo-financiamento.textContent = Calculator.formatarMoeda(totalFinanciamento);
        #tab-juros-consorcio.textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        #tab-juros-financiamento.textContent = Calculator.formatarMoeda(dispJurosFin);\;

const replaceAppJs = \        #tab-parcela-consorcio.textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        #tab-parcela-financiamento.textContent = Calculator.formatarMoeda(dispParcelaFin);
        #tab-prazo-consorcio.textContent = \\\\\\ meses\\\;
        #tab-prazo-financiamento.textContent = \\\\\\ meses\\\;
        #tab-lance-consorcio.textContent = Calculator.formatarMoeda(totalLance);
        #tab-entrada-financiamento.textContent = Calculator.formatarMoeda(dispEntradaFin);
        #tab-custo-consorcio.textContent = Calculator.formatarMoeda(totalConsorcio);
        #tab-custo-financiamento.textContent = Calculator.formatarMoeda(totalFinanciamento);
        #tab-juros-consorcio.textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        #tab-juros-financiamento.textContent = Calculator.formatarMoeda(dispJurosFin);

        const labelCompParcelaMain = #label-comp-parcela-main;
        if (labelCompParcelaMain) labelCompParcelaMain.textContent = taxaCorrecao > 0 ? 'Parcela Inicial' : 'Parcela Mensal';
        if (#tab-parcela-consorcio-main) #tab-parcela-consorcio-main.textContent = Calculator.formatarMoeda(lance.primeiraParcela);
        if (#tab-parcela-financiamento-main) #tab-parcela-financiamento-main.textContent = Calculator.formatarMoeda(dispParcelaFin);
        if (#tab-prazo-consorcio-main) #tab-prazo-consorcio-main.textContent = \\\\\\ meses\\\;
        if (#tab-prazo-financiamento-main) #tab-prazo-financiamento-main.textContent = \\\\\\ meses\\\;
        if (#tab-lance-consorcio-main) #tab-lance-consorcio-main.textContent = Calculator.formatarMoeda(totalLance);
        if (#tab-entrada-financiamento-main) #tab-entrada-financiamento-main.textContent = Calculator.formatarMoeda(dispEntradaFin);
        if (#tab-custo-consorcio-main) #tab-custo-consorcio-main.textContent = Calculator.formatarMoeda(totalConsorcio);
        if (#tab-custo-financiamento-main) #tab-custo-financiamento-main.textContent = Calculator.formatarMoeda(totalFinanciamento);
        if (#tab-juros-consorcio-main) #tab-juros-consorcio-main.textContent = Calculator.formatarMoeda(lance.custoConsorcio);
        if (#tab-juros-financiamento-main) #tab-juros-financiamento-main.textContent = Calculator.formatarMoeda(dispJurosFin);

        highlightWinner('#tab-parcela-consorcio-main', '#tab-parcela-financiamento-main', lance.novaParcela, dispParcelaFin, true);
        highlightWinner('#tab-prazo-consorcio-main', '#tab-prazo-financiamento-main', lance.novoPrazo, dispPrazoFin, true);
        highlightWinner('#tab-custo-consorcio-main', '#tab-custo-financiamento-main', totalConsorcio, totalFinanciamento, true);
        highlightWinner('#tab-juros-consorcio-main', '#tab-juros-financiamento-main', lance.custoConsorcio, dispJurosFin, true);\;

appJs = appJs.replace(searchAppJs, replaceAppJs);
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('done');
