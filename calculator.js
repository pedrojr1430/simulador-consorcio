/**
 * ============================================================
 * Consórcio Pro — Motor de Cálculos Financeiros
 * ============================================================
 * Funções puras para cálculos de consórcio e financiamento.
 * Nenhuma manipulação de DOM acontece aqui.
 */

const Calculator = (() => {

    // ── Consórcio ──────────────────────────────────────────────

    function simularEvolucaoConsorcio(saldoDevedorInicial, prazoOriginal, abatimento, valorParcelaBase, taxaCorrecaoAnual) {
        let saldoDevedor = saldoDevedorInicial;
        let taxaAnualDecimal = taxaCorrecaoAnual / 100;
        let parcelaAtual = valorParcelaBase;
        let totalPago = 0;
        const tabela = [];
        let mes = 1;

        if (abatimento === 'parcela') {
            let prazoRestante = prazoOriginal;
            parcelaAtual = prazoRestante > 0 ? saldoDevedor / prazoRestante : 0;
            for (; mes <= prazoOriginal; mes++) {
                if (mes > 1 && (mes - 1) % 12 === 0) {
                    saldoDevedor = saldoDevedor * (1 + taxaAnualDecimal);
                    parcelaAtual = saldoDevedor / prazoRestante;
                }
                saldoDevedor = Math.max(0, saldoDevedor - parcelaAtual);
                totalPago += parcelaAtual;
                prazoRestante--;
                tabela.push({ mes, parcela: parcelaAtual, saldoDevedor });
            }
        } else {
            while (saldoDevedor > 0.01) {
                if (mes > 1 && (mes - 1) % 12 === 0) {
                    saldoDevedor = saldoDevedor * (1 + taxaAnualDecimal);
                    parcelaAtual = parcelaAtual * (1 + taxaAnualDecimal);
                }
                
                let parcelaPaga = Math.min(parcelaAtual, saldoDevedor);
                saldoDevedor = Math.max(0, saldoDevedor - parcelaPaga);
                totalPago += parcelaPaga;
                tabela.push({ mes, parcela: parcelaPaga, saldoDevedor });
                mes++;
                
                if (mes > 1000) break; // Segurança
            }
        }

        return {
            primeiraParcela: tabela.length > 0 ? tabela[0].parcela : 0,
            ultimaParcela: tabela.length > 0 ? tabela[tabela.length - 1].parcela : 0,
            prazoFinal: tabela.length,
            totalPago,
            tabela
        };
    }

    /**
     * Calcula a parcela mensal padrão do consórcio (sem lance).
     */
    function parcelaBasicaConsorcio(valorCarta, taxaAdmin, fundoReserva, prazo, taxaCorrecaoAnual = 0) {
        const totalAdmin = valorCarta * (taxaAdmin / 100);
        const totalReserva = valorCarta * (fundoReserva / 100);
        const totalSemCorrecao = valorCarta + totalAdmin + totalReserva;
        
        let parcelaInicial = totalSemCorrecao / prazo;
        
        let sim = simularEvolucaoConsorcio(totalSemCorrecao, prazo, 'parcela', parcelaInicial, taxaCorrecaoAnual);

        return {
            parcela: sim.primeiraParcela,
            primeiraParcela: sim.primeiraParcela,
            ultimaParcela: sim.ultimaParcela,
            totalAdmin: totalAdmin,
            totalReserva: totalReserva,
            totalPagar: sim.totalPago,
            tabela: sim.tabela,
            parcelaCarta: valorCarta / prazo,
            parcelaAdmin: totalAdmin / prazo,
            parcelaReserva: totalReserva / prazo
        };
    }

    /**
     * Calcula o impacto do lance no consórcio.
     * @param {number} valorCarta - Valor da carta de crédito original
     * @param {number} taxaAdmin - Taxa de administração (%)
     * @param {number} fundoReserva - Fundo de reserva (%)
     * @param {number} prazo - Prazo total em meses
     * @param {number} lanceProprio - Valor do lance com recursos próprios
     * @param {number} lanceEmbutido - Valor do lance embutido na própria carta
     * @param {'parcela'|'prazo'} abatimento - Tipo de abatimento
     */
    function calcularLance(valorCarta, taxaAdmin, fundoReserva, prazo, lanceProprio, lanceEmbutido, abatimento, taxaCorrecaoAnual = 0) {
        const taxaAdminDecimal = taxaAdmin / 100;
        const fundoReservaDecimal = fundoReserva / 100;

        const totalAdmin = valorCarta * taxaAdminDecimal;
        const totalReserva = valorCarta * fundoReservaDecimal;
        const cartaEfetiva = valorCarta - lanceEmbutido;
        const totalSemLance = valorCarta + totalAdmin + totalReserva;
        const totalLanceOfertado = lanceProprio + lanceEmbutido;
        const saldoAposLance = Math.max(0, totalSemLance - totalLanceOfertado);

        const parcelaOriginalSemCorrecao = totalSemLance / prazo;

        let sim = simularEvolucaoConsorcio(saldoAposLance, prazo, abatimento, parcelaOriginalSemCorrecao, taxaCorrecaoAnual);

        const novaParcela = sim.primeiraParcela;
        const novoPrazo = sim.prazoFinal;
        const totalPago = sim.totalPago;

        const basica = parcelaBasicaConsorcio(valorCarta, taxaAdmin, fundoReserva, prazo, taxaCorrecaoAnual);

        const economiaParcela = basica.primeiraParcela - novaParcela;
        const economiaPrazo = prazo - novoPrazo;

        const custoTotal = totalPago - cartaEfetiva;
        const cetConsorcio = cartaEfetiva > 0 ? (custoTotal / cartaEfetiva) * 100 : 0;

        return {
            cartaEfetiva,
            novaParcela,
            primeiraParcela: novaParcela,
            ultimaParcela: sim.ultimaParcela,
            novoPrazo,
            totalPago,
            saldoDevedor: Math.max(0, saldoAposLance),
            economiaParcela,
            economiaPrazo,
            custoConsorcio: custoTotal,
            cetConsorcio,
            parcelaOriginal: basica.parcela,
            totalAdmin,
            totalReserva,
            totalLanceOfertado,
            lanceProprio,
            lanceEmbutido,
            tabela: sim.tabela
        };
    }

    // ── Financiamento ──────────────────────────────────────────

    /**
     * Converte taxa anual para taxa mensal equivalente.
     */
    function taxaMensal(taxaAnual) {
        return Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
    }

    function calcularPMT(saldo, i, prazo) {
        if (i === 0) return saldo / prazo;
        return saldo * (i * Math.pow(1 + i, prazo)) / (Math.pow(1 + i, prazo) - 1);
    }

    /**
     * Tabela Price (com correção por TR).
     */
    function calcularPrice(valorFinanciado, taxaAnualPercent, prazo, taxaTRAnualPercent = 0) {
        const i = taxaMensal(taxaAnualPercent);
        const trMes = taxaMensal(taxaTRAnualPercent);
        
        const tabela = [];
        let saldoDevedor = valorFinanciado;
        let totalPago = 0;
        let totalJuros = 0;

        for (let mes = 1; mes <= prazo; mes++) {
            // Aplica correção TR no saldo antes de calcular
            saldoDevedor = saldoDevedor * (1 + trMes);
            const prazoRestante = prazo - mes + 1;
            
            // Recalcula parcela com o novo saldo corrigido
            const parcela = calcularPMT(saldoDevedor, i, prazoRestante);
            const juros = saldoDevedor * i;
            const amortizacao = parcela - juros;
            
            saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
            totalPago += parcela;
            totalJuros += juros;
            
            tabela.push({ mes, parcela, juros, amortizacao, saldoDevedor });
        }

        return {
            parcela: tabela[0]?.parcela || 0, // Parcela inicial para compatibilidade
            totalPago,
            totalJuros,
            tabela
        };
    }

    /**
     * Tabela SAC (com correção por TR).
     */
    function calcularSAC(valorFinanciado, taxaAnualPercent, prazo, taxaTRAnualPercent = 0) {
        const i = taxaMensal(taxaAnualPercent);
        const trMes = taxaMensal(taxaTRAnualPercent);
        
        let totalPago = 0;
        let totalJuros = 0;
        const tabela = [];
        let saldoDevedor = valorFinanciado;

        for (let mes = 1; mes <= prazo; mes++) {
            // Aplica correção TR no saldo
            saldoDevedor = saldoDevedor * (1 + trMes);
            const prazoRestante = prazo - mes + 1;
            
            // Recalcula a cota de amortização baseada no saldo corrigido
            const amortizacao = saldoDevedor / prazoRestante;
            const juros = saldoDevedor * i;
            const parcela = amortizacao + juros;
            
            saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
            totalPago += parcela;
            totalJuros += juros;
            
            tabela.push({ mes, parcela, juros, amortizacao, saldoDevedor });
        }

        return {
            primeiraParcela: tabela[0]?.parcela || 0,
            ultimaParcela: tabela[tabela.length - 1]?.parcela || 0,
            totalPago,
            totalJuros,
            tabela
        };
    }

    /**
     * Calcula o financiamento completo (Price + SAC).
     */
    function calcularFinanciamento(valorBem, entrada, taxaAnualPercent, prazo, taxaTRAnualPercent = 0) {
        const valorFinanciado = valorBem - entrada;
        if (valorFinanciado <= 0) {
            return {
                valorFinanciado: 0,
                price: { parcela: 0, totalPago: entrada, totalJuros: 0, tabela: [] },
                sac: { primeiraParcela: 0, ultimaParcela: 0, totalPago: entrada, totalJuros: 0, tabela: [] },
                entrada
            };
        }

        const price = calcularPrice(valorFinanciado, taxaAnualPercent, prazo, taxaTRAnualPercent);
        const sac = calcularSAC(valorFinanciado, taxaAnualPercent, prazo, taxaTRAnualPercent);

        // Incluir entrada no total
        price.totalPago += entrada;
        sac.totalPago += entrada;

        return {
            valorFinanciado,
            price,
            sac,
            entrada
        };
    }

    // ── Utilitários de formatação ──────────────────────────────

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatarNumero(valor, casas = 2) {
        return valor.toLocaleString('pt-BR', {
            minimumFractionDigits: casas,
            maximumFractionDigits: casas
        });
    }

    function parseMoeda(str) {
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function formatarInputMoeda(valor) {
        const num = typeof valor === 'string' ? parseMoeda(valor) : valor;
        return formatarNumero(num);
    }

    // ── API Pública ────────────────────────────────────────────

    return {
        parcelaBasicaConsorcio,
        calcularLance,
        taxaMensal,
        calcularPrice,
        calcularSAC,
        calcularFinanciamento,
        formatarMoeda,
        formatarNumero,
        parseMoeda,
        formatarInputMoeda
    };

})();
