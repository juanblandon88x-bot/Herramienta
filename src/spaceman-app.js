import { spacemanConfig } from './spaceman-config.js';
import { analyzeTrend, calculateSupportResistance, getStrengthAndColor } from './spaceman-trend-analysis.js';
import { updateSpacemanClock, updateSpacemanResultsDisplay } from './spaceman-dom-functions.js';
import { initTrendChart, initTrendLineChart, updateEMA } from './spaceman-chart-management.js';
import { SpacemanStatsManager } from './spaceman-stats.js';

let spacemenSocket = null;
let results = [];
let trendChart;
let trendLineChart;
let ema3, ema5;
let lastHighValueTime = null;
let neonTimeout = null;
let highValueTriggered = false;
let currentChartType = 'candlestick';
let trendData = [];
let cumulativeSum = 0;
let lastFirstResult = null;
let clockInterval = null;
let statsManager = new SpacemanStatsManager();
let lastPredictionRisk = null;
let currentSignalActive = false;

function initializeSockets() {
    spacemenSocket = new WebSocket(spacemanConfig.websocketUrl);
    
    spacemenSocket.onopen = function(e) {
        console.log("[open] Connection established");
        const request = {
            "type": "subscribe",
            "casinoId": spacemanConfig.casinoId,
            "currency": spacemanConfig.currency,
            "key": [spacemanConfig.gameId]
        };
        spacemenSocket.send(JSON.stringify(request));
    };

    spacemenSocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        const gameResults = data.gameResult || [];
        
        if (gameResults.length > 0) {
            const firstResult = gameResults[0];
            const gameResult = firstResult.result;

            if (gameResult !== lastFirstResult) {
                updateResults(gameResult);
                lastFirstResult = gameResult;
            }
        }
    };

    spacemenSocket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.log('[close] Connection died');
        }
        setTimeout(() => initializeSockets(), 5000);
    };

    spacemenSocket.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    };
}

function getCategory(value) {
    value = parseFloat(value);
    if (value < 1.50) return 'N';
    if (value < 2.00) return 'M';
    if (value < 2.50) return 'B';
    if (value < 5.00) return 'V';
    if (value < 10.00) return 'D';
    return 'R';
}

function updateResults(result) {
    results.unshift({
        value: result,
        category: getCategory(result)
    });
    
    if (results.length > 5) {  
        results.pop();
    }

    const resultValue = parseFloat(result);
    if (resultValue > 2.50 && !highValueTriggered) {
        highValueTriggered = true;
        lastHighValueTime = new Date();
        console.log("High value triggered at:", lastHighValueTime);

        neonTimeout = setTimeout(() => {
            const clockEl = document.getElementById('spaceman-clock');
            if (clockEl) {
                clockEl.style.color = 'gold';
                clockEl.style.textShadow = '0 0 5px gold, 0 0 15px gold, 0 0 15px gold';
            }
            console.log("Neon effect triggered!");
        }, spacemanConfig.neonEffectDelay * 1000); 
    }
    
    updateSpacemanResultsDisplay(results); 
    
    // Track signal results
    trackSpacemanSignalResult(result);
    
    updatePrediction();
    updateTrendCharts(result);
}

function updateTrendCharts(result) {
    updateCandlestickChart(result);
    updateTrendLineChartData(result);

    // Recalculate support and resistance levels
    const supportResistance = calculateSupportResistance(results);

    // Update both charts with the new levels
    if (trendChart && trendChart.config) {
        trendChart.config._config.supportResistanceData = supportResistance;
    }
    if (trendLineChart && trendLineChart.config) {
        trendLineChart.config._config.supportResistanceData = supportResistance;
    }

    if (trendChart) trendChart.update();
    if (trendLineChart) trendLineChart.update();
}

function updateCandlestickChart(result) {
    if (!trendChart) return;
    
    const value = parseFloat(result);
    const { strength } = getStrengthAndColor(result);
    
    const lastClose = trendChart.data.datasets[0].data.length > 0 ? 
        trendChart.data.datasets[0].data[trendChart.data.datasets[0].data.length - 1].c : 0;
    
    const open = lastClose;
    const close = lastClose + strength;
    
    const candleData = {
        x: trendChart.data.datasets[0].data.length,
        o: open,
        h: Math.max(open, close),
        l: Math.min(open, close),
        c: close,
        value: result,
        strength: strength
    };

    if (trendChart.data.datasets[0].data.length >= 30) {
        trendChart.data.datasets[0].data.shift();
        trendChart.data.datasets[0].data.forEach((candle, index) => {
            candle.x = index;
        });
    }
    
    trendChart.data.datasets[0].data.push(candleData);
    trendChart.update();
    updateEMA(trendChart);
}

function updateTrendLineChartData(result) {
    if (!trendLineChart) return;
    
    const value = parseFloat(result);
    const increment = value < 2.00 ? -1 : 1;
    cumulativeSum += increment;
    
    if (trendLineChart.data.datasets[0].data.length >= 30) {
        trendLineChart.data.datasets[0].data.shift();
        trendLineChart.data.datasets[0].data.forEach((point, index) => {
            point.x = index;
        });
    }
    
    const newPoint = {
        x: trendLineChart.data.datasets[0].data.length,
        y: cumulativeSum,
        originalValue: value
    };
    
    trendLineChart.data.datasets[0].data.push(newPoint);
    trendData = [...trendLineChart.data.datasets[0].data];
    trendLineChart.update();
}

function updatePrediction() {
    const predictionEl = document.getElementById('spaceman-prediction');
    if (!predictionEl || !trendChart) return;
    
    const analysis = analyzeTrend(results, trendChart, spacemanConfig, ema3, ema5);
    const predictionText = predictionEl.querySelector('.spaceman-prediction-text');
    
    if (predictionText) {
        predictionText.textContent = analysis.prediction;
    }

    predictionEl.setAttribute('data-risk', analysis.risk);
    
    // Track signals when prediction indicates entry
    if (analysis.risk === 'low' && analysis.prediction.includes('entrada')) {
        if (!currentSignalActive && statsManager.bankManagementEnabled) {
            statsManager.startSignal();
            currentSignalActive = true;
            console.log('Spaceman signal started');
        }
    }
    
    // If prediction changes from low risk to something else, don't reset immediately
    // Let the result tracking handle it
    lastPredictionRisk = analysis.risk;
    
    const support = calculateSupportResistance(results, trendData);
    updateSupportResistanceDisplay(support.support, support.resistance);
}

function updateSupportResistanceDisplay(support, resistance) {
    const supportEl = document.getElementById('spaceman-support-level');
    const resistanceEl = document.getElementById('spaceman-resistance-level');
    
    if (supportEl) {
        supportEl.textContent = `Soporte: ${support !== null ? support.toFixed(2) : '-'}`;
    }
    if (resistanceEl) {
        resistanceEl.textContent = `Resistencia: ${resistance !== null ? resistance.toFixed(2) : '-'}`;
    }
}

// Update bank and apuesta displays for Spaceman
function updateSpacemanBankAndApuestas() {
    const bankDisplay = document.getElementById('spaceman-current-bank-display');
    const apuesta1Label = document.getElementById('spaceman-apuesta-1');
    const apuesta2Label = document.getElementById('spaceman-apuesta-2');
    
    if (!bankDisplay || !apuesta1Label || !apuesta2Label) return;
    
    // Get global values from script.js or stats manager
    let userCapital = statsManager.getCurrentCapital();
    if (!userCapital || userCapital === 0) {
        userCapital = window.userCapital || 0;
    }
    const bankManagementEnabled = window.bankManagementEnabled || false;
    const takeProfit = window.takeProfit || 0;
    const stopLoss = window.stopLoss || 0;
    const initialBank = window.initialBank || userCapital;
    const formatCurrency = window.formatCurrency;
    const selectedCurrency = window.selectedCurrency || { code: 'USD', symbol: '$' };
    
    // Sync with stats manager
    if (bankManagementEnabled) {
        statsManager.updateUserCapital(userCapital);
    }
    
    if (bankManagementEnabled && userCapital > 0) {
        // Calculate current profit/loss
        const currentProfit = userCapital - initialBank;
        const currentLoss = initialBank - userCapital;
        
        // Calculate apuesta amounts using 1% of bank for first attempt
        const apuesta1Percentage = 0.01; // 1%
        const apuesta1Amount = userCapital * apuesta1Percentage;
        const apuesta2Amount = apuesta1Amount * 2; // Double for second attempt
        
        // Build bank display with TP/SL progress
        let bankText = '';
        if (formatCurrency) {
            bankText = `Bank: ${formatCurrency(userCapital)}`;
        } else {
            bankText = `Bank: ${selectedCurrency.symbol}${userCapital.toFixed(2)}`;
        }
        
        if (takeProfit > 0 && takeProfit !== Infinity) {
            const tpProgress = currentProfit >= 0 
                ? Math.min((currentProfit / takeProfit) * 100, 100).toFixed(1)
                : '0.0';
            if (formatCurrency) {
                bankText += ` | TP: ${formatCurrency(takeProfit)} (${tpProgress}%)`;
            } else {
                bankText += ` | TP: ${selectedCurrency.symbol}${takeProfit.toFixed(2)} (${tpProgress}%)`;
            }
        }
        if (stopLoss > 0) {
            const slProgress = currentLoss > 0
                ? Math.min((currentLoss / stopLoss) * 100, 100).toFixed(1)
                : '0.0';
            if (formatCurrency) {
                bankText += ` | SL: ${formatCurrency(stopLoss)} (${slProgress}%)`;
            } else {
                bankText += ` | SL: ${selectedCurrency.symbol}${stopLoss.toFixed(2)} (${slProgress}%)`;
            }
        }
        
        bankDisplay.textContent = bankText;
        
        if (formatCurrency) {
            apuesta1Label.textContent = `Intento 1: ${formatCurrency(apuesta1Amount)} (1%)`;
            apuesta2Label.textContent = `Intento 2: ${formatCurrency(apuesta2Amount)} (2%)`;
        } else {
            apuesta1Label.textContent = `Intento 1: ${selectedCurrency.symbol}${apuesta1Amount.toFixed(2)} (1%)`;
            apuesta2Label.textContent = `Intento 2: ${selectedCurrency.symbol}${apuesta2Amount.toFixed(2)} (2%)`;
        }
    } else {
        bankDisplay.textContent = `Bank: N/A`;
        apuesta1Label.textContent = `Intento 1: N/A`;
        apuesta2Label.textContent = `Intento 2: N/A`;
    }
}

// Initialize when Spaceman app becomes visible
function initSpacemanApp() {
    const spacemanApp = document.getElementById('spaceman-app-content');
    if (!spacemanApp || spacemanApp.classList.contains('hidden')) {
        return;
    }

    // Wait for Chart.js to be available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet, waiting...');
        setTimeout(initSpacemanApp, 100);
        return;
    }

    // Initialize clock
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    clockInterval = setInterval(updateSpacemanClock, 1000);
    updateSpacemanClock();
    
    // Initialize stats manager
    const userCapital = window.userCapital || 0;
    const bankManagementEnabled = window.bankManagementEnabled || false;
    const initialBank = window.initialBank || userCapital;
    statsManager.initialize(userCapital, bankManagementEnabled, initialBank);
    window.userCapital = userCapital; // Sync with global
    
    // Initialize bank and apuestas display
    updateSpacemanBankAndApuestas();
    
    // Initialize statistics and history displays
    updateSpacemanStatistics();
    updateSpacemanHistoryDisplay();
    
    // Setup event listeners for history controls
    setupSpacemanHistoryControls();

    // Initialize charts
    try {
        const candlestickCanvas = document.getElementById('spaceTrendChart');
        const lineCanvas = document.getElementById('spaceTrendLineChart');
        
        if (!candlestickCanvas || !lineCanvas) {
            console.error('Canvas elements not found');
            setTimeout(initSpacemanApp, 100);
            return;
        }
        
        // Destroy existing charts if they exist
        if (trendChart) {
            trendChart.destroy();
            trendChart = null;
        }
        if (trendLineChart) {
            trendLineChart.destroy();
            trendLineChart = null;
        }
        
        trendChart = initTrendChart(spacemanConfig);
        trendLineChart = initTrendLineChart();
        
        console.log('Spaceman charts initialized');
        
        // Chart type selector
        const chartViewSelector = document.getElementById('spaceman-chart-view-selector');
        if (chartViewSelector) {
            chartViewSelector.addEventListener('change', (e) => {
                const chartType = e.target.value;
                
                if (candlestickCanvas) {
                    candlestickCanvas.style.display = chartType === 'candlestick' ? 'block' : 'none';
                }
                if (lineCanvas) {
                    if (chartType === 'trend') {
                        lineCanvas.classList.add('active');
                    } else {
                        lineCanvas.classList.remove('active');
                    }
                }
                currentChartType = chartType;
            });
        }

        // Initialize WebSocket
        initializeSockets();
    } catch (error) {
        console.error('Error initializing Spaceman app:', error);
        setTimeout(initSpacemanApp, 500);
    }
}

// Check if Spaceman app is visible and initialize
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const spacemanApp = document.getElementById('spaceman-app-content');
            if (spacemanApp && !spacemanApp.classList.contains('hidden')) {
                initSpacemanApp();
            }
        }
    });
});

// Update statistics display
function updateSpacemanStatistics() {
    const stats = statsManager.calculateAdvancedStatistics();
    const formatCurrency = window.formatCurrency || ((amount) => {
        const currency = window.selectedCurrency || { symbol: '$' };
        return `${currency.symbol}${amount.toFixed(2)}`;
    });
    
    document.getElementById('spaceman-stat-roi').textContent = stats.roi !== null ? `${stats.roi.toFixed(2)}%` : '--';
    document.getElementById('spaceman-stat-winrate').textContent = stats.winRate !== null ? `${stats.winRate.toFixed(2)}%` : '--';
    document.getElementById('spaceman-stat-profitfactor').textContent = stats.profitFactor !== null ? (stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)) : '--';
    document.getElementById('spaceman-stat-totalprofit').textContent = formatCurrency(stats.totalProfit);
    document.getElementById('spaceman-stat-totalloss').textContent = formatCurrency(stats.totalLoss);
    
    const netEl = document.getElementById('spaceman-stat-net');
    netEl.textContent = formatCurrency(Math.abs(stats.net));
    netEl.className = 'stat-value ' + (stats.net >= 0 ? 'profit' : 'loss');
    
    document.getElementById('spaceman-stat-beststreak').textContent = stats.bestStreak;
    document.getElementById('spaceman-stat-worststreak').textContent = stats.worstStreak;
    document.getElementById('spaceman-stat-avgprofit').textContent = formatCurrency(stats.avgProfit);
    document.getElementById('spaceman-stat-avgloss').textContent = formatCurrency(stats.avgLoss);
    
    updateSpacemanPerformanceChart();
}

// Update performance chart
function updateSpacemanPerformanceChart() {
    const chartSvg = d3.select('#spaceman-performance-chart');
    if (!chartSvg.node()) return;
    
    chartSvg.selectAll('*').remove();
    
    if (!statsManager.bankManagementEnabled || statsManager.getHistory().length === 0) {
        return;
    }

    const margin = { top: 10, right: 10, bottom: 20, left: 40 };
    const width = chartSvg.node()?.getBoundingClientRect().width || 350;
    const height = 150;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const history = statsManager.getHistory();
    let currentBank = history.length > 0 ? history[0].bankBefore : statsManager.getCurrentCapital();
    const bankData = [{ x: 0, y: currentBank }];
    
    history.forEach((entry, index) => {
        if (entry.bankAfter !== null) {
            currentBank = entry.bankAfter;
        }
        bankData.push({ x: index + 1, y: currentBank });
    });

    const xScale = d3.scaleLinear()
        .domain([0, Math.max(1, bankData.length - 1)])
        .range([0, innerWidth]);

    const yMin = d3.min(bankData, d => d.y) || 0;
    const yMax = d3.max(bankData, d => d.y) || 1;
    const yPadding = (yMax - yMin) * 0.1 || 1;

    const yScale = d3.scaleLinear()
        .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
        .range([innerHeight, 0]);

    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX);

    const g = chartSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(''));

    g.append('path')
        .datum(bankData)
        .attr('fill', 'none')
        .attr('stroke', currentBank >= (bankData[0]?.y || 0) ? 'var(--neon-green-sr)' : 'var(--neon-red-sr)')
        .attr('stroke-width', 2)
        .attr('d', line);

    g.selectAll('.dot')
        .data(bankData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', 3)
        .attr('fill', d => d.y >= (bankData[0]?.y || 0) ? 'var(--neon-green-sr)' : 'var(--neon-red-sr)');

    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5));

    g.append('g')
        .call(d3.axisLeft(yScale).ticks(5));
}

// Update history display
function updateSpacemanHistoryDisplay() {
    const historyList = document.getElementById('spaceman-signal-history-list');
    if (!historyList) return;

    const history = statsManager.getHistory();
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No hay señales registradas aún</div>';
        return;
    }

    const filterResult = document.getElementById('spaceman-filter-result')?.value || 'all';
    const filterAttempt = document.getElementById('spaceman-filter-attempt')?.value || 'all';
    const filterDate = document.getElementById('spaceman-filter-date')?.value || '';

    let filteredHistory = [...history];
    
    if (filterResult !== 'all') {
        filteredHistory = filteredHistory.filter(s => s.result === filterResult);
    }
    
    if (filterAttempt !== 'all') {
        filteredHistory = filteredHistory.filter(s => s.attempt === parseInt(filterAttempt));
    }
    
    if (filterDate) {
        const filterDateObj = new Date(filterDate);
        filteredHistory = filteredHistory.filter(s => {
            const signalDate = new Date(s.timestamp);
            return signalDate.toDateString() === filterDateObj.toDateString();
        });
    }

    const sortedHistory = filteredHistory.reverse();

    if (sortedHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No hay señales que coincidan con los filtros</div>';
        return;
    }

    const formatCurrency = window.formatCurrency || ((amount) => {
        const currency = window.selectedCurrency || { symbol: '$' };
        return `${currency.symbol}${amount.toFixed(2)}`;
    });

    let html = '<div class="history-list">';
    
    sortedHistory.forEach((entry) => {
        const isWin = entry.result === 'win';
        const resultClass = isWin ? 'win' : 'loss';
        const resultText = isWin ? 'Ganada' : 'Perdida';
        const attemptText = entry.attempt === 1 ? '1 intento' : '2 intentos';
        
        const time = new Date(entry.timestamp);
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
        
        html += `<div class="history-item ${resultClass}">`;
        html += `<div class="history-item-header">`;
        html += `<span class="history-result">${resultText}</span>`;
        html += `<span class="history-attempt">${attemptText}</span>`;
        html += `<span class="history-time">${timeStr}</span>`;
        html += `</div>`;
        
        if (statsManager.bankManagementEnabled && entry.profitLoss !== null) {
            const profitLossClass = entry.profitLoss >= 0 ? 'profit' : 'loss';
            const profitLossSign = entry.profitLoss >= 0 ? '+' : '';
            html += `<div class="history-details">`;
            html += `<div class="history-bet-amounts">`;
            html += `<span>Intento 1: ${formatCurrency(entry.apuesta1_amount)}</span>`;
            if (entry.attempt === 2) {
                html += `<span>Intento 2: ${formatCurrency(entry.apuesta2_amount)}</span>`;
            }
            html += `</div>`;
            html += `<div class="history-profit-loss ${profitLossClass}">`;
            html += `G/P: ${profitLossSign}${formatCurrency(Math.abs(entry.profitLoss))}`;
            html += `</div>`;
            html += `</div>`;
        } else {
            html += `<div class="history-details">`;
            html += `<div class="history-bet-amounts">`;
            html += `<span>Intento 1: ${formatCurrency(entry.apuesta1_amount)}</span>`;
            if (entry.attempt === 2) {
                html += `<span>Intento 2: ${formatCurrency(entry.apuesta2_amount)}</span>`;
            }
            html += `</div>`;
            html += `<div class="history-info">Bank no activo</div>`;
            html += `</div>`;
        }
        
        html += `</div>`;
    });
    
    html += '</div>';
    historyList.innerHTML = html;
}

// Show meta alcanzada modal
function showSpacemanMetaModal(isTakeProfit, value) {
    const stats = statsManager.calculateDetailedStats();
    const modal = document.getElementById('spaceman-meta-alcanzada-modal');
    const titulo = document.getElementById('spaceman-modal-titulo');
    const formatCurrency = window.formatCurrency || ((amount) => {
        const currency = window.selectedCurrency || { symbol: '$' };
        return `${currency.symbol}${amount.toFixed(2)}`;
    });
    
    if (isTakeProfit) {
        titulo.textContent = '¡Take Profit Alcanzado!';
        titulo.style.color = 'var(--neon-green-sr)';
        titulo.style.textShadow = '0 0 10px rgba(0, 255, 127, 0.8)';
    } else {
        titulo.textContent = 'Stop Loss Alcanzado';
        titulo.style.color = 'var(--neon-red-sr)';
        titulo.style.textShadow = '0 0 10px rgba(255, 69, 0, 0.8)';
    }
    
    document.getElementById('spaceman-modal-juegos-jugados').textContent = stats.totalJuegos;
    document.getElementById('spaceman-modal-ganados-1').textContent = stats.ganados1Intento;
    document.getElementById('spaceman-modal-ganados-2').textContent = stats.ganados2Intentos;
    document.getElementById('spaceman-modal-perdidas').textContent = stats.perdidas;
    document.getElementById('spaceman-modal-ganancia-total').textContent = formatCurrency(stats.gananciaTotal);
    document.getElementById('spaceman-modal-perdida-total').textContent = formatCurrency(stats.perdidaTotal);
    
    const netEl = document.getElementById('spaceman-modal-net');
    netEl.textContent = formatCurrency(Math.abs(stats.net));
    netEl.className = 'modal-stat-value ' + (stats.net >= 0 ? 'profit' : 'loss');
    
    document.getElementById('spaceman-modal-winrate').textContent = `${stats.winRate.toFixed(2)}%`;
    
    modal.classList.remove('hidden');
}

// Setup history controls
function setupSpacemanHistoryControls() {
    // Export history
    document.getElementById('spaceman-export-history')?.addEventListener('click', () => {
        statsManager.exportHistory('csv');
    });
    
    // Clear history
    document.getElementById('spaceman-clear-history')?.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
            statsManager.clearHistory();
            updateSpacemanHistoryDisplay();
            updateSpacemanStatistics();
        }
    });
    
    // Modal controls
    const modal = document.getElementById('spaceman-meta-alcanzada-modal');
    const cerrarBtn = document.getElementById('spaceman-modal-cerrar');
    const aceptarBtn = document.getElementById('spaceman-modal-aceptar');
    
    const cerrarModal = () => {
        if (modal) {
            modal.classList.add('hidden');
        }
    };
    
    if (cerrarBtn) {
        cerrarBtn.addEventListener('click', cerrarModal);
    }
    
    if (aceptarBtn) {
        aceptarBtn.addEventListener('click', cerrarModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }
    
    // History filters
    ['spaceman-filter-result', 'spaceman-filter-attempt', 'spaceman-filter-date'].forEach(filterId => {
        document.getElementById(filterId)?.addEventListener('change', () => {
            updateSpacemanHistoryDisplay();
        });
    });
    
    // Toggle stats
    document.getElementById('spaceman-toggle-stats')?.addEventListener('click', () => {
        const statsContent = document.getElementById('spaceman-stats-content');
        const toggleBtn = document.getElementById('spaceman-toggle-stats');
        if (statsContent) {
            statsContent.style.display = statsContent.style.display === 'none' ? 'block' : 'none';
            toggleBtn.textContent = statsContent.style.display === 'none' ? '+' : '−';
        }
    });
}

// Check Take Profit/Stop Loss and update bank
function checkSpacemanTPSL() {
    const takeProfit = window.takeProfit || 0;
    const stopLoss = window.stopLoss || 0;
    
    if (!statsManager.bankManagementEnabled) {
        updateSpacemanBankAndApuestas();
        return;
    }
    
    const checkResult = statsManager.checkTakeProfitStopLoss(takeProfit, stopLoss);
    if (checkResult.reached) {
        showSpacemanMetaModal(checkResult.isTakeProfit, checkResult.value);
        // Reset stats
        statsManager.clearHistory();
        statsManager.initialize(window.userCapital, window.bankManagementEnabled, window.initialBank || window.userCapital);
        updateSpacemanBankAndApuestas();
        updateSpacemanStatistics();
        updateSpacemanHistoryDisplay();
        return;
    }
    
    // Update bank display with current capital from stats manager
    const currentCapital = statsManager.getCurrentCapital();
    window.userCapital = currentCapital;
    statsManager.updateUserCapital(currentCapital);
    updateSpacemanBankAndApuestas();
    updateSpacemanStatistics();
}

// Track signal results based on result value
function trackSpacemanSignalResult(resultValue) {
    if (!statsManager.bankManagementEnabled) {
        checkSpacemanTPSL();
        return;
    }
    
    if (!currentSignalActive) {
        checkSpacemanTPSL();
        return;
    }
    
    // Access currentSignalEntry through a method (need to add getter)
    // For now, we'll need to modify the stats manager to expose this
    const value = parseFloat(resultValue);
    
    // If value >= 2.0, it's a win
    if (value >= 2.0) {
        // Check if we need to record win
        // We need to check the current state - if attempt is null, record win attempt 1
        // If attempt is 1, record win attempt 2
        try {
            // Try to record win - the manager will handle the logic
            // We need a way to check current state first
            // For now, we'll create a simple state machine
            if (!statsManager.signalAttemptState) {
                statsManager.signalAttemptState = 0; // 0 = no attempt, 1 = first attempt failed
            }
            
            if (statsManager.signalAttemptState === 0) {
                statsManager.recordWin(1);
                statsManager.signalAttemptState = 0; // Reset
                currentSignalActive = false;
                updateSpacemanHistoryDisplay();
                updateSpacemanStatistics();
            } else if (statsManager.signalAttemptState === 1) {
                statsManager.recordWin(2);
                statsManager.signalAttemptState = 0; // Reset
                currentSignalActive = false;
                updateSpacemanHistoryDisplay();
                updateSpacemanStatistics();
            }
        } catch (e) {
            console.error('Error recording win:', e);
        }
    } else if (value < 2.0) {
        // Value < 2.0 - this is a loss for current attempt
        if (!statsManager.signalAttemptState) {
            statsManager.signalAttemptState = 0;
        }
        
        if (statsManager.signalAttemptState === 0) {
            // First attempt failed - mark state but don't record loss yet
            statsManager.signalAttemptState = 1;
            // The recordLoss/recordWin methods will handle the state
        } else if (statsManager.signalAttemptState === 1) {
            // Second attempt also failed - record total loss
            statsManager.recordLoss();
            statsManager.signalAttemptState = 0; // Reset
            currentSignalActive = false;
            updateSpacemanHistoryDisplay();
            updateSpacemanStatistics();
        }
    }
    
    checkSpacemanTPSL();
}

document.addEventListener('DOMContentLoaded', function() {
    const spacemanApp = document.getElementById('spaceman-app-content');
    if (spacemanApp) {
        observer.observe(spacemanApp, { attributes: true });
        // Check if already visible
        if (!spacemanApp.classList.contains('hidden')) {
            initSpacemanApp();
        }
    }
});
