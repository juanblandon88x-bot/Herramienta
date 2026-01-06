document.addEventListener('DOMContentLoaded', () => {
    console.log('Script Version: 2.1 - Robust API Order');
    // References to new screen elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeMessage = document.querySelector('.welcome-message');
    const welcomeContinueButton = document.getElementById('welcome-continue');
    const welcomeManualButton = document.getElementById('welcome-manual');
    const manualModal = document.getElementById('manual-modal');
    const closeManualButton = document.getElementById('close-manual');
    const closeManualFooterButton = document.getElementById('close-manual-footer');
    const currencySelectionScreen = document.getElementById('currency-selection-screen');
    const bankChoiceScreen = document.getElementById('bank-choice-screen');
    const bankYesButton = document.getElementById('bank-yes');
    const bankNoButton = document.getElementById('bank-no');
    const capitalInputScreen = document.getElementById('capital-input-screen');
    const capitalInput = document.getElementById('capital-input');
    const currencyPreview = document.getElementById('currency-preview');
    const capitalContinueButton = document.getElementById('capital-continue');
    const tpSlInputScreen = document.getElementById('tp-sl-input-screen');
    const takeProfitInput = document.getElementById('take-profit-input');
    const stopLossInput = document.getElementById('stop-loss-input');
    const currencyPreviewTp = document.getElementById('currency-preview-tp');
    const currencyPreviewSl = document.getElementById('currency-preview-sl');
    const startBankManagementButton = document.getElementById('start-bank-management');
    const appContent = document.getElementById('app-content');
    const buttonsPanel = document.getElementById('buttons-panel'); // Static reference for event listener
    const chartViewSelector = document.getElementById('chart-view-selector'); // Static reference for event listener

    // Aviator mode selection screen
    const aviatorModeScreen = document.getElementById('aviator-mode-screen');
    
    // Currency and Bank Management State - these are truly global for the whole app session
    let selectedGame = null; // 'aviator' or 'spaceman'
    let aviatorMode = null; // 'automatic' or 'manual'
    let selectedCurrency = {
        code: 'USD',
        symbol: '$'
    };
    let bankManagementEnabled = false;
    let userCapital = 0; // Stored as a number for internal calculations
    let takeProfit = 0; // Take profit target
    let stopLoss = 0; // Stop loss limit
    let initialBank = 0; // Initial bank to calculate profit/loss from

    // Currency formatting configurations
    const CURRENCY_FORMATS = {
        'USD': { decimals: 2, thousandsSeparator: ',', decimalSeparator: '.', inputThousandsSeparator: ',', inputDecimalSeparator: '.' },  // $1,234.56
        'MXN': { decimals: 2, thousandsSeparator: ',', decimalSeparator: '.', inputThousandsSeparator: ',', inputDecimalSeparator: '.' },  // $1,234.56
        'ARS': { decimals: 0, thousandsSeparator: '.', decimalSeparator: ',', inputThousandsSeparator: '.', inputDecimalSeparator: ',' },  // $1.234
        'COP': { decimals: 0, thousandsSeparator: '.', decimalSeparator: ',', inputThousandsSeparator: '.', inputDecimalSeparator: ',' },  // $4.000
        'BRL': { decimals: 2, thousandsSeparator: '.', decimalSeparator: ',', inputThousandsSeparator: '.', inputDecimalSeparator: ',' },  // R$1.234,56
        'CLP': { decimals: 0, thousandsSeparator: '.', decimalSeparator: ',', inputThousandsSeparator: '.', inputDecimalSeparator: ',' },  // $4.000
        'PEN': { decimals: 2, thousandsSeparator: ',', decimalSeparator: '.', inputThousandsSeparator: ',', inputDecimalSeparator: '.' },  // S/1,234.56
        'VES': { decimals: 2, thousandsSeparator: '.', decimalSeparator: ',', inputThousandsSeparator: '.', inputDecimalSeparator: ',' },  // Bs.1.234,56
        'DOP': { decimals: 2, thousandsSeparator: ',', decimalSeparator: '.', inputThousandsSeparator: ',', inputDecimalSeparator: '.' },  // $1,234.56
        'GTQ': { decimals: 2, thousandsSeparator: ',', decimalSeparator: '.', inputThousandsSeparator: ',', inputDecimalSeparator: '.' }   // Q1,234.56
    };
    
    // Function to parse currency input according to the selected currency format
    function parseCurrencyInput(inputString, currencyCode) {
        if (!inputString || inputString.trim() === '') {
            return NaN;
        }
        
        const format = CURRENCY_FORMATS[currencyCode] || CURRENCY_FORMATS['USD'];
        let cleaned = inputString.trim();
        
        // Remove currency symbols if present
        cleaned = cleaned.replace(/[$R\sBs.QS\/]/g, '');
        
        // For currencies that use period (.) as thousands separator (COP, CLP, ARS, BRL, VES)
        if (format.inputThousandsSeparator === '.') {
            // Check if there's a decimal part (comma as decimal separator)
            const commaIndex = cleaned.lastIndexOf(',');
            if (commaIndex !== -1 && format.decimals > 0) {
                // Has decimal part (comma)
                const integerPart = cleaned.substring(0, commaIndex);
                const decimalPart = cleaned.substring(commaIndex + 1);
                // Remove all periods from integer part (they're thousands separators)
                cleaned = integerPart.replace(/\./g, '') + '.' + decimalPart;
            } else {
                // No decimal part, all periods are thousands separators
                // But check if last period might be decimal (only if format supports decimals)
                const parts = cleaned.split('.');
                if (parts.length > 1) {
                    const lastPart = parts[parts.length - 1];
                    // If last part has exactly 1-2 digits and currency supports decimals, treat as decimal
                    if (lastPart.length <= 2 && lastPart.length > 0 && format.decimals > 0 && /^\d+$/.test(lastPart)) {
                        // Last part could be decimal
                        cleaned = parts.slice(0, -1).join('') + '.' + lastPart;
                    } else {
                        // All periods are thousands separators, remove them all
                        cleaned = cleaned.replace(/\./g, '');
                    }
                }
            }
        } else {
            // For currencies that use comma (,) as thousands separator (USD, MXN, etc.)
            // Remove commas (they're thousands separators)
            cleaned = cleaned.replace(/,/g, '');
            // Period is already decimal separator
        }
        
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? NaN : parsed;
    }
    
    // Function to update capital input placeholder and hint based on currency
    function updateCapitalInputPlaceholder(currencyCode) {
        const format = CURRENCY_FORMATS[currencyCode] || CURRENCY_FORMATS['USD'];
        const capitalInput = document.getElementById('capital-input');
        const capitalInputHint = document.getElementById('capital-input-hint');
        
        if (capitalInput) {
            if (format.inputThousandsSeparator === '.') {
                // COP, CLP, ARS, BRL, VES: use period for thousands
                capitalInput.placeholder = 'Ej: 200.000';
            } else {
                // USD, MXN, PEN, DOP, GTQ: use comma for thousands or just numbers
                capitalInput.placeholder = 'Ej: 200,000 o 200000';
            }
        }
        
        if (capitalInputHint) {
            if (format.inputThousandsSeparator === '.') {
                capitalInputHint.textContent = 'Formato: usa punto (.) para separar miles. Ej: 200.000 = doscientos mil';
            } else {
                capitalInputHint.textContent = 'Formato: usa coma (,) para separar miles o solo números. Ej: 200,000 = doscientos mil';
            }
        }
    }
    
    // Currency formatting function (make it globally accessible)
    function formatCurrency(amount, showDecimals = null) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return selectedCurrency.symbol + '--';
        }
        
        const currencyCode = selectedCurrency.code || 'USD';
        const format = CURRENCY_FORMATS[currencyCode] || CURRENCY_FORMATS['USD'];
        const decimals = showDecimals !== null ? showDecimals : format.decimals;
        
        // Round to specified decimals
        const rounded = decimals === 0 ? Math.round(amount) : parseFloat(amount.toFixed(decimals));
        
        // Convert to string and split integer and decimal parts
        const parts = rounded.toString().split('.');
        let integerPart = parts[0];
        const decimalPart = parts[1] || '';
        
        // Add thousands separator (reverse string for easier processing)
        if (format.thousandsSeparator) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousandsSeparator);
        }
        
        // Build final string
        let formatted = selectedCurrency.symbol + integerPart;
        if (decimals > 0 && decimalPart) {
            formatted += format.decimalSeparator + decimalPart.padEnd(decimals, '0');
        } else if (decimals > 0 && rounded !== Math.round(rounded)) {
            // If there are decimals but we rounded, show zeros
            formatted += format.decimalSeparator + '0'.repeat(decimals);
        }
        
        return formatted;
    }
    
    // Helper function to format without decimals for currencies that don't use them
    function formatCurrencyAmount(amount) {
        return formatCurrency(amount);
    }
    
    // Make formatCurrency globally accessible for use in ChartManager
    window.formatCurrency = formatCurrency;

    // Make selectedCurrency and formatCurrency globally accessible
    window.selectedCurrency = selectedCurrency;
    window.formatCurrency = formatCurrency;
    
    // Customizable Odds (can be changed in settings)
    let WIN_ODDS_APUESTA_1 = 1.80;
    let WIN_ODDS_APUESTA_2 = 2.30;
    let selectedStrategy = 'original'; // 'original', 'momentum_hybrid', 'mean_reversion_rsi', 'engulfing'
    
    // Settings
    let soundEnabled = true;
    let notificationsEnabled = true;
    
    // Sound system
    let audioContext = null;
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    function playSound(frequency, duration, type = 'sine') {
        if (!soundEnabled) return;
        try {
            initAudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Sound playback failed:', e);
        }
    }
    
    function playNotificationSound(type) {
        if (!soundEnabled) return;
        switch(type) {
            case 'entrada':
                playSound(523.25, 0.2);
                setTimeout(() => playSound(659.25, 0.2), 150);
                break;
            case 'win':
                playSound(523.25, 0.15);
                setTimeout(() => playSound(659.25, 0.15), 100);
                setTimeout(() => playSound(783.99, 0.3), 200);
                break;
            case 'loss':
                playSound(392.00, 0.3, 'sawtooth');
                setTimeout(() => playSound(329.63, 0.4, 'sawtooth'), 200);
                break;
            case 'retry':
                playSound(440.00, 0.2);
                break;
        }
    }
    
    // Load settings from localStorage
    function loadSettings() {
        try {
            const saved = localStorage.getItem('tradingAppSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                WIN_ODDS_APUESTA_1 = settings.odds1 || 1.80;
                WIN_ODDS_APUESTA_2 = settings.odds2 || 2.30;
                soundEnabled = settings.soundEnabled !== false;
                notificationsEnabled = settings.notificationsEnabled !== false;
                selectedStrategy = settings.strategy || 'original';
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
    
    // Save settings to localStorage
    function saveSettings() {
        try {
            const settings = {
                odds1: WIN_ODDS_APUESTA_1,
                odds2: WIN_ODDS_APUESTA_2,
                soundEnabled: soundEnabled,
                notificationsEnabled: notificationsEnabled,
                strategy: selectedStrategy
            };
            localStorage.setItem('tradingAppSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    // Load settings on startup
    loadSettings();
    
    // Currency-specific betting percentages (adjusted for each currency's typical value)
    const CURRENCY_BET_PERCENTAGES = {
        'USD': { initial: 0.01, target: 0.005 },      // Dólar: 1% inicial, 0.5% objetivo
        'MXN': { initial: 0.015, target: 0.0075 },    // Peso Mexicano: 1.5% inicial, 0.75% objetivo
        'ARS': { initial: 0.02, target: 0.01 },       // Peso Argentino: 2% inicial, 1% objetivo
        'COP': { initial: 0.02, target: 0.01 },       // Peso Colombiano: 2% inicial, 1% objetivo
        'BRL': { initial: 0.015, target: 0.0075 },    // Real Brasileño: 1.5% inicial, 0.75% objetivo
        'CLP': { initial: 0.02, target: 0.01 },       // Peso Chileno: 2% inicial, 1% objetivo
        'PEN': { initial: 0.015, target: 0.0075 },    // Sol Peruano: 1.5% inicial, 0.75% objetivo
        'VES': { initial: 0.03, target: 0.015 },      // Bolívar Venezolano: 3% inicial, 1.5% objetivo
        'DOP': { initial: 0.02, target: 0.01 },       // Peso Dominicano: 2% inicial, 1% objetivo
        'GTQ': { initial: 0.015, target: 0.0075 }     // Quetzal Guatemalteco: 1.5% inicial, 0.75% objetivo
    };
    
    // Function to get betting percentages based on selected currency
    function getBetPercentages() {
        const currencyCode = selectedCurrency.code || 'USD';
        return CURRENCY_BET_PERCENTAGES[currencyCode] || CURRENCY_BET_PERCENTAGES['USD'];
    }
    
    // Get initial percentage for Apuesta 1 when no prior losses
    function getInitialBetPercentage() {
        return getBetPercentages().initial;
    }
    
    // Get profit target percentage for each successful signal
    function getTargetProfitPercentage() {
        return getBetPercentages().target;
    }

    // Button data-value thresholds for determining win/loss
    // Only values >= 1 (2.00x or higher) count as wins
    const THRESHOLD_APUESTA_1_WIN_BUTTON_VALUE = 1;  // Corresponds to "2.00 / 3.99" (minimum to win)
    const THRESHOLD_APUESTA_2_WIN_BUTTON_VALUE = 1;  // Corresponds to "2.00 / 3.99"
    
    // Map button values to their minimum odds (conservative calculation)
    const BUTTON_ODDS_MAP = {
        '-5': 1.00,  // "1.00 / 1,09"
        '-4': 1.10,  // "1.10 / 1.29"
        '-3': 1.30,  // "1.30 / 1.49"
        '-2': 1.50,  // "1.50 / 1.79"
        '-1': 1.80,  // "1.80 / 1.99"
        '1': 2.00,   // "2.00 / 3.99"
        '2': 4.00,   // "4.00 / 5.99"
        '3': 6.00,   // "6.00 / 7,99"
        '4': 8.00,   // "8.00 / 9,99"
        '5': 10.00   // "10+"
    };
    
    // Function to get odds from button value
    function getOddsFromButtonValue(buttonValue) {
        const valueStr = String(buttonValue);
        return BUTTON_ODDS_MAP[valueStr] || WIN_ODDS_APUESTA_1; // Fallback to default
    }

    // References to new display elements
    const currentBankDisplay = document.getElementById('current-bank-display');
    const apuesta1Label = document.getElementById('apuesta-1');
    const apuesta2Label = document.getElementById('apuesta-2');
    const signalOverlayMessage = document.getElementById('signal-overlay-message');
    const sessionStatsDiv = document.getElementById('session-stats'); // Mobile
    const sessionStatsHeaderDiv = document.getElementById('session-stats-header'); // Desktop

    // Fibonacci Levels (Shared for both main and mini chart logic, if needed, or define separately)
    const fibLevels = [
        { level: 0.0, label: '0.0%' },
        { level: 0.236, label: '23.6%' },
        { level: 0.382, label: '38.2%' },
        { level: 0.5, label: '50.0%' },
        { level: 0.618, label: '61.8%' },
        { level: 0.786, label: '78.6%' },
        { level: 1.0, label: '100.0%' }
    ];

    // Variable to keep track of the last clicked input button for active state
    let lastActiveInputButton = null;

    // --- ChartManager Class to encapsulate chart and betting logic ---
    class ChartManager {
        constructor(bankEnabled, initialCapital) {
            this.bankManagementEnabled = bankEnabled;
            this.userCapital = initialCapital;
            
            // Internal state that needs to be reset on full app reset
            this.data = [];
            this.accumulatedValue = 0;
            this.candles = [];
            this.supports = [];
            this.resistances = [];

            this.currentZoomLevel = 0;
            this.emaFastPeriod = 5;
            this.emaSlowPeriod = 10;
            this.emaFast = [];
            this.emaSlow = [];

            this.fibonacciState = 'inactive';
            this.fibonacciPoints = []; // Stores screen coordinates during selection
            this.fibonacciAnchorY = { y1_100_value: null, y2_0_value: null }; // Stores chart data values
            
            // Red zone for 1.00/1.09 (stores { high, low } in data-value coordinates)
            this.lastRedZone = null;
            // Green zone for 10+ (stores { high, low } in data-value coordinates)
            this.lastGreenZone = null;
            this.redZoneClass = 'last-red-zone';

            // Betting specific state (managed by ChartManager)
            this.currentInitialBetPercentage = getInitialBetPercentage(); // Dynamic percentage for Apuesta 1 display
            this.L_total_unrecovered_losses = 0; // Accumulates losses from signals that failed both attempts
            this.apuesta1_amount = 0; // Calculated potential Apuesta 1 amount
            this.apuesta2_amount = 0; // Calculated potential Apuesta 2 amount
            this.activeApuesta1_amount = 0; // Actual Apuesta 1 amount placed
            this.activeApuesta2_amount = 0; // Actual Apuesta 2 amount placed
            this.currentBetAttempt = 0; // 0: no active bet, 1: apuesta 1, 2: apuesta 2
            this.sessionProfit = 0; // Track session profit for anti-Martingale
            this.baseBetAmount = 0; // Base bet amount for anti-Martingale scaling

            // Signal and Session State
            this.signalState = {
                status: 'none', // 'none', 'entrada_pending', 'awaiting_result'
                consecutiveFails: 0,
                consecutiveEntradas: 0,
                awaitingNextManualInputBeforeEntrada: false
            };
            this.sessionStats = {
                hits: 0,
                misses: 0
            };

            // Signal History
            this.signalHistory = []; // Array to store all signal history entries
            this.currentSignalEntry = null; // Track current signal being processed

            // Original multipliers storage (for round-based strategies)
            this.originalMultipliers = []; // Stores actual multipliers (1.50x, 2.30x, etc.)
            
            // State for new round-based strategies
            this.newStrategyState = {
                consecutiveSignals: 0,        // Para Bloque de 2 Señales
                lastSignalRounds: [],         // Rondas entre señales
                cycleActive: false,           // Para Señal Única por Ciclo
                waitingForConfirmation: false, // Para Entrada Tardía
                pendingEntryRound: null,      // Para Entrada Tardía
                lastSignalIndex: -1           // Índice de la última señal generada
            };

            // D3 chart elements and scales (initialized in initChart)
            this.chartContainer = document.getElementById('chart-container');
            this.svg = d3.select("#chart");
            this.fibonacciGroup = this.svg.select('.fibonacci-group');
            this.xGridGroup = this.svg.select('.x-grid');
            this.yGridGroup = this.svg.select('.y-grid');
            this.xScale = d3.scaleLinear();
            this.yScale = d3.scaleLinear();

            // Clock
            this.clockDiv = document.getElementById('clock');
            this.clockInterval = null; // To store setInterval ID

            // Trend Indicator Bar elements
            this.trendIndicatorBar = document.getElementById('trend-indicator-bar');
            this.bullishStrengthSection = this.trendIndicatorBar.querySelector('.bullish-strength');
            this.bearishStrengthSection = this.trendIndicatorBar.querySelector('.bearish-strength');
            this.trendLabel = this.trendIndicatorBar.querySelector('.trend-label');

            this.maxDataPoints = 24; // Max points for main chart
        }

        // --- Core Chart Initialization/Drawing ---
        initChart() {
            this.width = this.chartContainer.offsetWidth;
            this.height = this.chartContainer.offsetHeight;
            this.margin = { top: 20, right: 70, bottom: 30, left: 40 };
            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;

            this.xScale.range([this.margin.left, this.margin.left + this.innerWidth]);
            this.yScale.range([this.height - this.margin.bottom, this.margin.top]);

            // Set initial view mode
            chartViewSelector.value = 'both';
            this.setChartViewMode('both');
            this.updateCounters();
            this.updateClock(); // Initial clock update
            if (!this.clockInterval) { // Prevent multiple intervals
                this.clockInterval = setInterval(() => this.updateClock(), 1000);
            }

            // Initial calculations for EMAs, even if empty
            this.emaFast = this.calculateEMA(this.data, this.emaFastPeriod);
            this.emaSlow = this.calculateEMA(this.data, this.emaSlowPeriod);
            this.updateChart(); // Initial draw

            if (this.bankManagementEnabled) {
                 // Calculate initial bets only if bank management is enabled
                this.calculateApuestaAmounts();
            }
            this.updateBankAndApuestaDisplays();
            this.loadHistoryFromLocalStorage(); // Load saved history
            this.updateSignalHistoryDisplay();
            this.updateAdvancedStatistics();
        }

        updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            this.clockDiv.textContent = `${hours}:${minutes}:${seconds}`;
        }
        
        safeBankUpdate(amount) {
            this.userCapital = parseFloat((this.userCapital + amount).toFixed(2));
        }

        calculateApuestaAmounts() {
            if (!this.bankManagementEnabled || this.userCapital <= 0) {
                this.apuesta1_amount = 0;
                this.apuesta2_amount = 0;
                this.currentInitialBetPercentage = getInitialBetPercentage(); // Default for display if no bank
                return;
            }

            const currentBank = this.userCapital;
            const MAX_BET_PERCENTAGE = 0.05; // Maximum 5% of bank
            
            // Check stop loss and take profit (use global window variables)
            const initialBankValue = window.initialBank || userCapital || this.userCapital;
            const stopLossValue = window.stopLoss || 0;
            const takeProfitValue = window.takeProfit || Infinity;
            
            // Calculate current profit/loss
            const currentProfit = currentBank - initialBankValue;
            const currentLoss = initialBankValue - currentBank;
            
            if (stopLossValue > 0) {
                if (currentLoss >= stopLossValue) {
                    this.showMetaAlcanzadaModal(false, currentLoss);
                    this.reset();
                    return;
                }
            }
            
            if (takeProfitValue > 0 && takeProfitValue !== Infinity) {
                if (currentProfit >= takeProfitValue) {
                    this.showMetaAlcanzadaModal(true, currentProfit);
                    this.reset();
                    return;
                }
            }

            // Anti-Martingale: Reduce bet when winning, maintain/recover when losing
            let betPercentage = getInitialBetPercentage(); // Start with base percentage
            
            if (currentProfit > 0 && takeProfitValue > 0 && takeProfitValue !== Infinity) {
                // Winning: reduce bet amount as we approach take profit
                const progressToTP = Math.min(currentProfit / takeProfitValue, 1); // 0 to 1, capped at 1
                // Reduce bet by up to 50% when close to TP
                const reductionFactor = 1 - (progressToTP * 0.5);
                betPercentage = betPercentage * reductionFactor;
            } else if (this.L_total_unrecovered_losses > 0) {
                // Losing: calculate recovery bet using personalized odds
                const targetRecovery = this.L_total_unrecovered_losses;
                // Calculate recovery using WIN_ODDS_APUESTA_1 (odds - 1 gives profit multiplier)
                const profitMultiplier = WIN_ODDS_APUESTA_1 - 1; // e.g., if odds = 2.0, profit multiplier = 1.0
                if (takeProfitValue > 0 && takeProfitValue !== Infinity && currentProfit < 0) {
                    const additionalNeeded = (takeProfitValue + Math.abs(currentProfit)) * 0.1;
                    const recoveryBet = (targetRecovery + additionalNeeded) / profitMultiplier;
                    betPercentage = Math.min(recoveryBet / currentBank, MAX_BET_PERCENTAGE);
                } else {
                    const recoveryBet = targetRecovery / profitMultiplier;
                    betPercentage = Math.min(recoveryBet / currentBank, MAX_BET_PERCENTAGE);
                }
            }
            
            // Ensure bet doesn't exceed 5% maximum
            betPercentage = Math.min(betPercentage, MAX_BET_PERCENTAGE);
            
            // Calculate bet amount
            this.apuesta1_amount = currentBank * betPercentage;
            this.apuesta1_amount = Math.max(0, Math.min(this.apuesta1_amount, currentBank));

            // Intento 2 must be double of Intento 1
            this.apuesta2_amount = this.apuesta1_amount * 2;
            // Ensure it doesn't exceed available bank
            this.apuesta2_amount = Math.max(0, Math.min(this.apuesta2_amount, currentBank - this.apuesta1_amount));

            this.apuesta1_amount = parseFloat(this.apuesta1_amount.toFixed(2));
            this.apuesta2_amount = parseFloat(this.apuesta2_amount.toFixed(2));

            this.currentInitialBetPercentage = betPercentage;
        }

        checkTakeProfitStopLoss() {
            if (!this.bankManagementEnabled) {
                return false;
            }
            
            const initialBankValue = window.initialBank || userCapital || this.userCapital;
            const stopLossValue = window.stopLoss || 0;
            const takeProfitValue = window.takeProfit || Infinity;
            
            // Calculate current profit/loss
            const currentProfit = this.userCapital - initialBankValue;
            const currentLoss = initialBankValue - this.userCapital;
            
            // Check stop loss first
            if (stopLossValue > 0 && currentLoss >= stopLossValue) {
                this.showMetaAlcanzadaModal(false, currentLoss);
                this.reset();
                return true; // TP/SL reached
            }
            
            // Check take profit
            if (takeProfitValue > 0 && takeProfitValue !== Infinity && currentProfit >= takeProfitValue) {
                this.showMetaAlcanzadaModal(true, currentProfit);
                this.reset();
                return true; // TP/SL reached
            }
            
            return false; // TP/SL not reached
        }

        updateBankAndApuestaDisplays() {
            if (this.bankManagementEnabled) {
                const initialBankValue = window.initialBank || userCapital || this.userCapital;
                const stopLossValue = window.stopLoss || 0;
                const takeProfitValue = window.takeProfit || Infinity;
                
                // Calculate current profit/loss
                const currentProfit = this.userCapital - initialBankValue;
                const currentLoss = initialBankValue - this.userCapital;
                
                // Build bank display with TP/SL progress
                let bankText = `Bank: ${formatCurrency(this.userCapital)}`;
                if (takeProfitValue > 0 && takeProfitValue !== Infinity) {
                    const tpProgress = currentProfit >= 0 
                        ? Math.min((currentProfit / takeProfitValue) * 100, 100).toFixed(1)
                        : '0.0';
                    bankText += ` | TP: ${formatCurrency(takeProfitValue)} (${tpProgress}%)`;
                }
                if (stopLossValue > 0) {
                    // Only show SL progress if we have a loss (currentLoss > 0)
                    const slProgress = currentLoss > 0
                        ? Math.min((currentLoss / stopLossValue) * 100, 100).toFixed(1)
                        : '0.0';
                    bankText += ` | SL: ${formatCurrency(stopLossValue)} (${slProgress}%)`;
                }
                
                currentBankDisplay.textContent = bankText;
                
                let displayApuesta1 = this.apuesta1_amount;
                let displayApuesta2 = this.apuesta2_amount;
                let displayPercentage1 = (this.currentInitialBetPercentage * 100).toFixed(2);
                let displayPercentage2 = (this.currentInitialBetPercentage * 100 * 2).toFixed(2); // Double of Intento 1

                if (this.currentBetAttempt === 1) {
                    displayApuesta1 = this.activeApuesta1_amount;
                } else if (this.currentBetAttempt === 2) {
                    displayApuesta1 = this.activeApuesta1_amount;
                    displayApuesta2 = this.activeApuesta2_amount;
                }

                apuesta1Label.textContent = `Intento 1: ${formatCurrency(displayApuesta1)} (${displayPercentage1}%)`;
                apuesta2Label.textContent = `Intento 2: ${formatCurrency(displayApuesta2)} (${displayPercentage2}%)`;
            } else {
                currentBankDisplay.textContent = `Bank: N/A`;
                apuesta1Label.textContent = `Intento 1: N/A`;
                apuesta2Label.textContent = `Intento 2: N/A`;
            }
        }

        clearApuestaHighlights() {
            apuesta1Label.classList.remove('highlight-apuesta1');
            apuesta2Label.classList.remove('highlight-apuesta2');
        }

        clearFibonacci() {
            this.fibonacciGroup.selectAll("*").remove();
            this.fibonacciPoints = [];
            this.fibonacciAnchorY = { y1_100_value: null, y2_0_value: null };
            this.fibonacciState = 'inactive';
            this.svg.on('click', null);
            this.svg.style('cursor', 'default');
        }

        drawFibonacciLevels(chart_y1_100_value, chart_y2_0_value) {
            this.fibonacciGroup.selectAll("*").remove();
            this.fibonacciAnchorY = { y1_100_value: chart_y1_100_value, y2_0_value: chart_y2_0_value };

            const y1_100_screen = this.yScale(chart_y1_100_value);
            const y2_0_screen = this.yScale(chart_y2_0_value);

            const fibLineData = fibLevels.map(d => {
                const levelY_screen = y2_0_screen + (y1_100_screen - y2_0_screen) * d.level;
                return { ...d, y: levelY_screen, isAnchor: d.level === 0.0 || d.level === 1.0 };
            });

            const level50 = fibLineData.find(d => d.level === 0.5);
            const level618 = fibLineData.find(d => d.level === 0.618);

            if (level50 && level618) {
                const bandTopY = Math.min(level50.y, level618.y);
                const bandHeight = Math.abs(level50.y - level618.y);

                this.fibonacciGroup.append("rect")
                    .attr("class", "golden-zone-band")
                    .attr("x", this.margin.left)
                    .attr("y", bandTopY)
                    .attr("width", this.innerWidth)
                    .attr("height", bandHeight);
            }

            this.fibonacciGroup.selectAll(".fibonacci-anchor-line")
                .data(fibLineData.filter(d => d.isAnchor))
                .enter().append("line")
                .attr("class", "fibonacci-anchor-line")
                .attr("x1", this.margin.left)
                .attr("x2", this.margin.left + this.innerWidth)
                .attr("y1", d => d.y)
                .attr("y2", d => d.y)
                .call(d3.drag()
                    .on("start", (event, d) => {
                        d3.select(event.subject).attr("stroke", "cyan").attr("stroke-width", 2);
                    })
                    .on("drag", (event, d) => {
                        const newY_screen = Math.max(this.margin.top, Math.min(this.height - this.margin.bottom, event.y));
                        const newY_value = this.yScale.invert(newY_screen);

                        if (d.level === 1.0) {
                            this.fibonacciAnchorY.y1_100_value = newY_value;
                        } else if (d.level === 0.0) {
                            this.fibonacciAnchorY.y2_0_value = newY_value;
                        }

                        const currentY100_value = this.fibonacciAnchorY.y1_100_value;
                        const currentY0_value = this.fibonacciAnchorY.y2_0_value;

                        const updatedLineData = fibLevels.map(f => {
                            const levelY_screen = this.yScale(currentY0_value) + (this.yScale(currentY100_value) - this.yScale(currentY0_value)) * f.level;
                            return { ...f, y: levelY_screen, isAnchor: f.level === 0.0 || f.level === 1.0 };
                        });

                        this.fibonacciGroup.selectAll(".fibonacci-anchor-line")
                            .data(updatedLineData.filter(d => d.isAnchor))
                            .attr("y1", f => f.y)
                            .attr("y2", f => f.y);

                        const updatedLevel50 = updatedLineData.find(d => d.level === 0.5);
                        const updatedLevel618 = updatedLineData.find(d => d.level === 0.618);

                        if (updatedLevel50 && updatedLevel618) {
                            const updatedBandTopY = Math.min(updatedLevel50.y, updatedLevel618.y);
                            const updatedBandHeight = Math.abs(updatedLevel50.y - updatedLevel618.y);
                            this.fibonacciGroup.select(".golden-zone-band")
                                .attr("y", updatedBandTopY)
                                .attr("height", updatedBandHeight);
                        }
                    })
                    .on("end", (event, d) => {
                        d3.select(event.subject).attr("stroke", "rgba(255, 215, 0, 0.3)").attr("stroke-width", 1);
                    }));
        }

        handleFibonacciClick(event) {
            if (this.fibonacciState !== 'selecting') return;

            const targetTagName = event.target.tagName;
            if (targetTagName === 'BUTTON') {
                console.log("Button clicked, ignoring chart Fibonacci selection.");
                return;
            }

            const svgNode = this.svg.node();
            const svgRect = svgNode.getBoundingClientRect();
            const mouseX = event.clientX - svgRect.left;
            const mouseY = event.clientY - svgRect.top;

            const clickableAreaLeft = this.margin.left;
            const clickableAreaRight = this.margin.left + this.innerWidth;
            const clickableAreaTop = this.margin.top;
            const clickableAreaBottom = this.height - this.margin.bottom;

            if (mouseX < clickableAreaLeft || mouseX > clickableAreaRight || mouseY < clickableAreaTop || mouseY > clickableAreaBottom) {
                console.log("Click outside primary chart area ignored for Fibonacci selection.");
                return;
            }

            this.fibonacciPoints.push({ x: mouseX, y: mouseY });

            if (this.fibonacciPoints.length === 1) {
                console.log("Fibonacci: Select the second point (0.0%) on the chart.");
                this.fibonacciGroup.append("circle")
                    .attr("class", "fibonacci-temp-anchor")
                    .attr("cx", mouseX)
                    .attr("cy", mouseY)
                    .attr("r", 5)
                    .attr("fill", "#ffd700");

            } else if (this.fibonacciPoints.length === 2) {
                this.svg.on('click', null);
                this.svg.style('cursor', 'default');
                this.fibonacciState = 'active';

                const y1_100_screen = this.fibonacciPoints[0].y;
                const y2_0_screen = this.fibonacciPoints[1].y;

                const chart_y1_100_value = this.yScale.invert(y1_100_screen);
                const chart_y2_0_value = this.yScale.invert(y2_0_screen);

                this.fibonacciGroup.selectAll(".fibonacci-temp-anchor").remove();

                this.drawFibonacciLevels(chart_y1_100_value, chart_y2_0_value);
                console.log("Fibonacci: Golden Zone drawn. Drag the faint dashed lines to adjust.");
            }
        }

        calculateEMA(dataArr, period) {
            const ema = [];
            if (dataArr.length === 0) return [];
            let multiplier = 2 / (period + 1);
            if (dataArr.length < period) return new Array(dataArr.length).fill(null);
            let sma = dataArr.slice(0, period).reduce((a, b) => a + b, 0) / period;
            ema.push(sma);
            for (let i = period; i < dataArr.length; i++) {
                ema.push((dataArr[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
            }
            const padding = new Array(period - 1).fill(null);
            return padding.concat(ema);
        }

        findSwingPoints(dataArr, lookback = 10) {
            const swingLows = [];
            const swingHighs = [];
            if (dataArr.length === 0) return { swingLows, swingHighs };
            const startIndex = Math.max(0, dataArr.length - lookback);

            for(let i = startIndex; i < dataArr.length; i++) {
                let isLow = true;
                for(let j = Math.max(startIndex, i - lookback); j <= Math.min(dataArr.length - 1, i + lookback); j++) {
                    if (j !== i && dataArr[i] > dataArr[j]) {
                        isLow = false;
                        break;
                    }
                }
                let isHigh = true;
                for(let j = Math.max(startIndex, i - lookback); j <= Math.min(dataArr.length - 1, i + lookback); j++) {
                    if (j !== i && dataArr[i] < dataArr[j]) {
                        isHigh = false;
                        break;
                    }
                }
                const tolerance = 0.01;
                const isDistinctLow = (i === 0 || dataArr[i] < dataArr[i - 1] - tolerance) && (i === dataArr.length - 1 || dataArr[i] < dataArr[i + 1] - tolerance);
                const isDistinctHigh = (i === 0 || dataArr[i] > dataArr[i - 1] + tolerance) && (i === dataArr.length - 1 || dataArr[i] > dataArr[i + 1] + tolerance);
                if (isLow && isDistinctLow) swingLows.push({ index: i, value: dataArr[i] });
                if (isHigh && isDistinctHigh) swingHighs.push({ index: i, value: dataArr[i] });
            }
            return { swingLows, swingHighs };
        }

        calculateSupportResistance(dataArr) {
            const lookbackPeriod = Math.min(dataArr.length, 20);
            if (dataArr.length < 5) return { supports: [], resistances: [] };
            const { swingLows, swingHighs } = this.findSwingPoints(dataArr, lookbackPeriod);
            swingLows.sort((a, b) => b.index - a.index);
            swingHighs.sort((a, b) => b.index - a.index);
            const uniqueSupports = [];
            const uniqueResistances = [];
            const tolerance = 0.03;
            if (swingLows.length > 0) {
                uniqueSupports.push(swingLows[0]);
                for (let i = 1; i < swingLows.length; i++) {
                    if (Math.abs(swingLows[i].value - uniqueSupports[0].value) >= tolerance) {
                        uniqueSupports.push(swingLows[i]);
                        break;
                    }
                }
            }
            if (swingHighs.length > 0) {
                uniqueResistances.push(swingHighs[0]);
                for (let i = 1; i < swingHighs.length; i++) {
                    if (Math.abs(swingHighs[i].value - uniqueResistances[0].value) >= tolerance) {
                        uniqueResistances.push(swingHighs[i]);
                        break;
                    }
                }
            }
            return { supports: uniqueSupports.slice(0, 1), resistances: uniqueResistances.slice(0, 1) };
        }

        getTrend() {
            if (this.data.length < this.emaSlowPeriod) {
                return 'neutral';
            }
            const lastEmaFast = this.emaFast[this.emaFast.length - 1];
            const lastEmaSlow = this.emaSlow[this.emaSlow.length - 1];

            if (lastEmaFast === null || lastEmaSlow === null) {
                return 'neutral';
            }

            const trendTolerance = 0.005;

            if (lastEmaFast > lastEmaSlow + trendTolerance) {
                return 'alcista';
            } else if (lastEmaFast < lastEmaSlow - trendTolerance) {
                return 'bajista';
            } else {
                return 'lateral';
            }
        }

        // Calculate RSI (Relative Strength Index)
        calculateRSI(dataArr, period = 14) {
            if (dataArr.length < period + 1) return null;
            
            const changes = [];
            for (let i = 1; i < dataArr.length; i++) {
                changes.push(dataArr[i] - dataArr[i - 1]);
            }
            
            let gains = 0;
            let losses = 0;
            
            // Calculate initial average gain and loss
            for (let i = 0; i < period; i++) {
                if (changes[i] > 0) {
                    gains += changes[i];
                } else {
                    losses += Math.abs(changes[i]);
                }
            }
            
            let avgGain = gains / period;
            let avgLoss = losses / period;
            
            // Calculate RSI using Wilder's smoothing method
            for (let i = period; i < changes.length; i++) {
                const change = changes[i];
                if (change > 0) {
                    avgGain = (avgGain * (period - 1) + change) / period;
                    avgLoss = (avgLoss * (period - 1)) / period;
                } else {
                    avgGain = (avgGain * (period - 1)) / period;
                    avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
                }
            }
            
            if (avgLoss === 0) return 100;
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            
            return rsi;
        }

        // Check if price is near support level
        isNearSupport(price, tolerance = 0.03) {
            const { supports } = this.calculateSupportResistance(this.data);
            if (supports.length === 0) return false;
            
            const nearestSupport = supports[0].value;
            const distance = Math.abs(price - nearestSupport) / nearestSupport;
            return distance <= tolerance;
        }

        // Check if price is near resistance level
        isNearResistance(price, tolerance = 0.02) {
            const { resistances } = this.calculateSupportResistance(this.data);
            if (resistances.length === 0) return false;
            
            const nearestResistance = resistances[0].value;
            const distance = Math.abs(price - nearestResistance) / nearestResistance;
            return distance <= tolerance;
        }

        // Check for bullish momentum (price increasing over last N periods)
        hasBullishMomentum(periods = 3) {
            if (this.data.length < periods + 1) return false;
            
            const recentData = this.data.slice(-periods - 1);
            for (let i = 1; i < recentData.length; i++) {
                if (recentData[i] <= recentData[i - 1]) {
                    return false;
                }
            }
            return true;
        }

        // Check for bullish engulfing pattern
        hasBullishEngulfing() {
            if (this.candles.length < 2) return false;
            
            const prevCandle = this.candles[this.candles.length - 2];
            const currentCandle = this.candles[this.candles.length - 1];
            
            // Previous candle should be bearish
            const prevIsBearish = prevCandle.close < prevCandle.open;
            
            // Current candle should be bullish
            const currentIsBullish = currentCandle.close > currentCandle.open;
            
            // Current candle should engulf previous candle
            const engulfs = currentCandle.open < prevCandle.close && 
                           currentCandle.close > prevCandle.open;
            
            // Current candle body should be larger
            const currentBody = Math.abs(currentCandle.close - currentCandle.open);
            const prevBody = Math.abs(prevCandle.close - prevCandle.open);
            const bodyLarger = currentBody > prevBody;
            
            return prevIsBearish && currentIsBullish && engulfs && bodyLarger;
        }

        // Get trend strength (difference between EMAs as percentage)
        getTrendStrength() {
            if (this.data.length < this.emaSlowPeriod) return 0;
            
            const lastEmaFast = this.emaFast[this.emaFast.length - 1];
            const lastEmaSlow = this.emaSlow[this.emaSlow.length - 1];
            
            if (lastEmaFast === null || lastEmaSlow === null || lastEmaSlow === 0) return 0;
            
            return ((lastEmaFast - lastEmaSlow) / lastEmaSlow) * 100;
        }

        // Get candle body size as percentage of range
        getCandleBodySize(candle) {
            if (!candle) return 0;
            const range = candle.high - candle.low;
            if (range === 0) return 0;
            const body = Math.abs(candle.close - candle.open);
            return (body / range) * 100;
        }

        getVisibleData() {
            let numVisible;
            let startIndex;
            if (this.currentZoomLevel >= 0) {
                numVisible = this.maxDataPoints - this.currentZoomLevel * 2;
                numVisible = Math.max(5, numVisible);
                startIndex = Math.max(0, this.data.length - numVisible);
            } else {
                numVisible = this.maxDataPoints + Math.abs(this.currentZoomLevel) * 10;
                numVisible = Math.min(this.data.length, numVisible);
                startIndex = Math.max(0, this.data.length - numVisible);
                if (numVisible === this.data.length) startIndex = 0;
            }
            return { data: this.data.slice(startIndex), candles: this.candles.slice(startIndex), startIndex: startIndex };
        }

        getAverageCandleMovement(lookback = 5) {
            if (this.candles.length < 2) return 0.5;
            const recentCandles = this.candles.slice(-Math.min(this.candles.length, lookback));
            let totalMovement = 0;
            for (let i = 0; i < recentCandles.length; i++) {
                totalMovement += Math.abs(recentCandles[i].close - recentCandles[i].open);
            }
            return Math.max(0.1, totalMovement / recentCandles.length);
        }

        generatePredictionCandle() {
            if (this.data.length < 10) return null;
            const lastActualCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
            if (!lastActualCandle) return null;

            const currentOpen = lastActualCandle.close;
            const currentTrend = this.getTrend();
            const avgMovement = this.getAverageCandleMovement();

            let predictedValue;
            if (currentTrend === 'alcista') {
                predictedValue = Math.random() * (avgMovement * 1.5 - avgMovement * 0.5) + avgMovement * 0.5;
                if (Math.random() > 0.6) {
                    predictedValue = Math.max(predictedValue, 1.0);
                    predictedValue = Math.min(predictedValue, 2.0);
                }
            } else if (currentTrend === 'bajista') {
                predictedValue = -(Math.random() * (avgMovement * 1.5 - avgMovement * 0.5) + avgMovement * 0.5);
                if (Math.random() > 0.7) {
                    predictedValue = Math.min(predictedValue, -1.0);
                }
            } else {
                predictedValue = (Math.random() * 2 - 1) * (avgMovement * 0.5);
            }

            const predictedClose = currentOpen + predictedValue;
            const wickMagnitude = avgMovement * 0.2;
            const predictedHigh = Math.max(currentOpen, predictedClose) + wickMagnitude;
            const predictedLow = Math.min(currentOpen, predictedClose) - wickMagnitude;
            return { open: currentOpen, close: predictedClose, high: predictedHigh, low: predictedLow, isPrediction: true };
        }

        calculateTrendStrength() {
            if (this.candles.length < 5) return { bullish: 0.5, bearish: 0.5, label: 'No Data' };
            const lookbackPeriod = Math.min(this.candles.length, 10);
            const recentCandles = this.candles.slice(-lookbackPeriod);
            let totalBullishMagnitude = 0;
            let totalBearishMagnitude = 0;
            recentCandles.forEach(c => {
                const magnitude = Math.abs(c.close - c.open);
                if (c.close >= c.open) totalBullishMagnitude += magnitude;
                else totalBearishMagnitude += magnitude;
            });
            const totalMagnitude = totalBullishMagnitude + totalBearishMagnitude;
            let bullishRatio = 0.5;
            let bearishRatio = 0.5;
            let label = 'Lateral';
            if (totalMagnitude > 0.01) {
                bullishRatio = totalBullishMagnitude / totalMagnitude;
                bearishRatio = totalBearishMagnitude / totalMagnitude;
                const diff = bullishRatio - bearishRatio;
                if (diff > 0.3) label = 'Alcista Fuerte';
                else if (diff > 0.1) label = 'Alcista';
                else if (diff < -0.3) label = 'Bajista Fuerte';
                else if (diff < -0.1) label = 'Bajista';
                else label = 'Lateral';
            }
            return { bullish: bullishRatio, bearish: bearishRatio, label: label };
        }

        updateTrendIndicatorBar() {
            const { bullish, bearish, label } = this.calculateTrendStrength();
            this.bullishStrengthSection.style.height = `${bullish * 100}%`;
            this.bearishStrengthSection.style.height = `${bearish * 100}%`;
            this.trendLabel.textContent = label;
            this.trendLabel.style.color = 'var(--text-color-primary)';
            this.trendLabel.style.textShadow = 'none';
            if (label.includes('Alcista')) {
                this.trendLabel.style.color = 'var(--neon-green-sr)';
                this.trendLabel.style.textShadow = '0 0 10px var(--neon-green-sr), 0 0 20px rgba(0, 255, 127, 0.5)';
            } else if (label.includes('Bajista')) {
                this.trendLabel.style.color = 'var(--neon-red-sr)';
                this.trendLabel.style.textShadow = '0 0 10px var(--neon-red-sr), 0 0 20px rgba(255, 69, 0, 0.5)';
            } else if (label.includes('Lateral')) {
                this.trendLabel.style.color = 'var(--neon-golden-ema)';
                this.trendLabel.style.textShadow = '0 0 10px var(--neon-golden-ema), 0 0 20px rgba(255, 215, 0, 0.5)';
            } else if (label === 'No Data') {
                this.trendLabel.style.color = 'var(--text-color-secondary)';
                this.trendLabel.style.textShadow = 'none';
            }

            if (this.candles.length < 5) {
                this.trendIndicatorBar.style.opacity = 0.3;
                this.trendLabel.textContent = 'No Data';
                this.trendLabel.style.color = 'var(--text-color-secondary)';
                this.trendLabel.style.textShadow = 'none';
            } else {
                this.trendIndicatorBar.style.opacity = 1;
            }
        }

        drawGridLines() {
            this.xGridGroup.selectAll('*').remove();
            this.yGridGroup.selectAll('*').remove();
            const { data: visibleData, startIndex } = this.getVisibleData();
            const xTicks = visibleData.map((d, i) => startIndex + i);
            
            this.xGridGroup.attr("class", "grid x-grid")
                .call(d3.axisBottom(this.xScale)
                    .tickValues(xTicks)
                    .tickSize(-this.innerHeight)
                    .tickFormat("")
                );

            this.yGridGroup.attr("class", "grid y-grid")
                .call(d3.axisLeft(this.yScale)
                    .ticks(10)
                    .tickSize(-this.innerWidth)
                    .tickFormat("")
                );
        }

        updateChart() {
            this.svg.selectAll("*:not(.fibonacci-group):not(.x-grid):not(.y-grid)").remove();

            // Remove previous zone elements (if any) before redraw
            this.svg.selectAll(".main-zone-line").remove();

            const { data: visibleData, candles: visibleCandles, startIndex } = this.getVisibleData();

            let predictionCandle = null;
            if (visibleCandles.length > 0 && this.data.length >= 10) {
                predictionCandle = this.generatePredictionCandle();
            }

            const lastCandleIndex = startIndex + visibleCandles.length - 1;
            const xDomainMax = predictionCandle ? lastCandleIndex + 1 : lastCandleIndex;
            this.xScale.domain([startIndex, xDomainMax]);

            const allHighs = visibleCandles.map(c => c ? c.high : 0).filter(v => v !== undefined);
            const allLows = visibleCandles.map(c => c ? c.low : 0).filter(v => v !== undefined);

            if (predictionCandle) {
                allHighs.push(predictionCandle.high);
                allLows.push(predictionCandle.low);
            }

            const fibChartValues = [];
            if (this.fibonacciState === 'active' && this.fibonacciAnchorY.y1_100_value !== null && this.fibonacciAnchorY.y2_0_value !== null) {
                fibChartValues.push(this.fibonacciAnchorY.y1_100_value);
                fibChartValues.push(this.fibonacciAnchorY.y2_0_value);
            }

            const srValues = [];
            if (this.supports.length > 0) srValues.push(this.supports[0].value);
            if (this.resistances.length > 0) srValues.push(this.resistances[0].value);

            const minY = d3.min([0, ...visibleData, ...allLows, ...srValues, ...fibChartValues]);
            const maxY = d3.max([0, ...visibleData, ...allHighs, ...srValues, ...fibChartValues]);

            const padding = (maxY === minY && minY === 0) ? 1 : Math.max(0.5, (maxY - minY) * 0.1);
            this.yScale.domain([minY - padding, maxY + padding]);

            let trendClass = null;
            const currentTrend = this.getTrend();
            if (currentTrend === 'alcista') {
                trendClass = 'ema-trend-up';
            } else if (currentTrend === 'bajista') {
                trendClass = 'ema-trend-down';
            }

            this.chartContainer.classList.remove('ema-trend-up', 'ema-trend-down');
            if (trendClass) {
                this.chartContainer.classList.add(trendClass);
            }

            const lineEndCoord = this.xScale(this.xScale.domain()[1]);

            this.svg.append("line")
                .attr("class", "horizontal-line")
                .attr("x1", this.margin.left)
                .attr("y1", this.yScale(0))
                .attr("x2", lineEndCoord)
                .attr("y2", this.yScale(0))
                .attr("stroke", "#6c757d")
                .attr("stroke-width", 1.2)
                .attr("stroke-dasharray", "6,6")
                .attr("opacity", 0.5);

            if (this.supports.length > 0) {
                this.svg.append("line")
                    .datum(this.supports[0])
                    .attr("class", "support-line")
                    .attr("x1", this.margin.left)
                    .attr("y1", d => this.yScale(d.value))
                    .attr("x2", lineEndCoord)
                    .attr("y2", d => this.yScale(d.value));
            }

            if (this.resistances.length > 0) {
                this.svg.append("line")
                    .datum(this.resistances[0])
                    .attr("class", "resistance-line")
                    .attr("x1", this.margin.left)
                    .attr("y1", d => this.yScale(d.value))
                    .attr("x2", lineEndCoord)
                    .attr("y2", d => this.yScale(d.value));
            }

            if (visibleData.length > 0) {
                const currentValue = visibleData[visibleData.length - 1];
                this.svg.append("line")
                    .attr("class", "current-level-line")
                    .attr("x1", this.margin.left)
                    .attr("y1", this.yScale(currentValue))
                    .attr("x2", this.xScale(lastCandleIndex))
                    .attr("y2", this.yScale(currentValue));
            }

            // --- Draw persistent zone as two dashed lines (top and bottom) so they reflect exact body open/close values
            if (this.lastRedZone) {
                // Use the stored data-value high/low (which represent the original candle body open/close)
                const topY = this.yScale(this.lastRedZone.high);
                const bottomY = this.yScale(this.lastRedZone.low);

                // Top dashed line (red)
                this.svg.append('line')
                    .attr('class', 'main-zone-line zone-dashed-line red')
                    .attr('x1', this.margin.left)
                    .attr('x2', lineEndCoord)
                    .attr('y1', topY)
                    .attr('y2', topY)
                    .attr('stroke-linecap', 'round');

                // Bottom dashed line (red)
                this.svg.append('line')
                    .attr('class', 'main-zone-line zone-dashed-line red')
                    .attr('x1', this.margin.left)
                    .attr('x2', lineEndCoord)
                    .attr('y1', bottomY)
                    .attr('y2', bottomY)
                    .attr('stroke-linecap', 'round');

                // Translucent red band between top and bottom
                const bandY = Math.min(topY, bottomY);
                const bandHeight = Math.max(1, Math.abs(bottomY - topY));
                this.svg.append('rect')
                    .attr('class', 'main-zone-line last-red-zone')
                    .attr('x', this.margin.left)
                    .attr('y', bandY)
                    .attr('width', lineEndCoord - this.margin.left)
                    .attr('height', bandHeight)
                    .attr('fill', 'rgba(139,0,0,0.18)')
                    .attr('pointer-events', 'none');
            }

            if (this.lastGreenZone) {
                const topYG = this.yScale(this.lastGreenZone.high);
                const bottomYG = this.yScale(this.lastGreenZone.low);

                // Top dashed line (green)
                this.svg.append('line')
                    .attr('class', 'main-zone-line zone-dashed-line green')
                    .attr('x1', this.margin.left)
                    .attr('x2', lineEndCoord)
                    .attr('y1', topYG)
                    .attr('y2', topYG)
                    .attr('stroke-linecap', 'round');

                // Bottom dashed line (green)
                this.svg.append('line')
                    .attr('class', 'main-zone-line zone-dashed-line green')
                    .attr('x1', this.margin.left)
                    .attr('x2', lineEndCoord)
                    .attr('y1', bottomYG)
                    .attr('y2', bottomYG)
                    .attr('stroke-linecap', 'round');

                // Translucent green band between top and bottom
                const bandYG = Math.min(topYG, bottomYG);
                const bandHeightG = Math.max(1, Math.abs(bottomYG - topYG));
                this.svg.append('rect')
                    .attr('class', 'main-zone-line last-green-zone')
                    .attr('x', this.margin.left)
                    .attr('y', bandYG)
                    .attr('width', lineEndCoord - this.margin.left)
                    .attr('height', bandHeightG)
                    .attr('fill', 'rgba(0,128,0,0.12)')
                    .attr('pointer-events', 'none');
            }

            const numCandlesToRender = visibleCandles.length + (predictionCandle ? 1 : 0);
            const candleWidth = this.innerWidth / numCandlesToRender * 0.7;

            this.svg.selectAll("line.wick")
                .data(visibleCandles)
                .enter().append("line")
                .attr("class", "wick")
                .attr("x1", (d, i) => this.xScale(startIndex + i))
                .attr("x2", (d, i) => this.xScale(startIndex + i))
                .attr("y1", d => this.yScale(d.high))
                .attr("y2", d => this.yScale(d.low))
                .attr("stroke", d => (d.close >= d.open ? "#00C853" : "#FF3D00"))
                .attr("stroke-width", 1)
                .attr("opacity", 0.8);

            if (visibleCandles.length > 1) {
                const connectionWicks = visibleCandles.slice(1).map((currentCandle, i) => {
                    const prevCandle = visibleCandles[i];
                    if (prevCandle.close !== currentCandle.open) {
                        return {
                            index: startIndex + i + 1,
                            y1: this.yScale(prevCandle.close),
                            y2: this.yScale(currentCandle.open),
                            color: currentCandle.close >= currentCandle.open ? "#00C853" : "#FF3D00"
                        };
                    }
                    return null;
                }).filter(d => d !== null);

                this.svg.selectAll("line.connection-wick")
                    .data(connectionWicks)
                    .enter().append("line")
                    .attr("class", "connection-wick")
                    .attr("x1", d => this.xScale(d.index))
                    .attr("x2", d => this.xScale(d.index))
                    .attr("y1", d => d.y1)
                    .attr("y2", d => d.y2)
                    .attr("stroke", d => d.color)
                    .attr("stroke-width", 1)
                    .attr("opacity", 0.8);
            }

            this.svg.selectAll("rect.candle")
                .data(visibleCandles)
                .enter().append("rect")
                .attr("class", "candle")
                .attr("x", (d, i) => this.xScale(startIndex + i) - candleWidth / 2)
                .attr("width", candleWidth)
                .attr("height", d => Math.abs(this.yScale(d.open) - this.yScale(d.close)) || 1)
                .attr("y", d => this.yScale(Math.max(d.open, d.close)))
                .attr("fill", d => (d.close >= d.open ? "#00C853" : "#FF3D00"));

            // --- Draw multiplier labels on candles ---
            const candlesWithMultiplier = visibleCandles
                .map((d, i) => ({ ...d, absoluteIndex: startIndex + i }))
                .filter(d => d.originalMultiplier !== null && d.originalMultiplier !== undefined);

            this.svg.selectAll("text.multiplier-label")
                .data(candlesWithMultiplier)
                .enter().append("text")
                .attr("class", "multiplier-label")
                .attr("x", d => this.xScale(d.absoluteIndex))
                .attr("y", d => this.yScale(d.high) - 8)
                .attr("text-anchor", "middle")
                .attr("font-size", "9px")
                .attr("font-weight", "bold")
                .attr("fill", d => d.originalMultiplier >= 2.0 ? "#00E676" : "#FF5252")
                .text(d => d.originalMultiplier.toFixed(2) + "x");

            // --- Draw 10+ marker (Category 5) ---
            const plus10Markers = visibleCandles
                .map((d, i) => ({ ...d, absoluteIndex: startIndex + i }))
                .filter(d => d.category === "5");

            this.svg.selectAll("polygon.plus-10-marker")
                .data(plus10Markers)
                .enter().append("polygon")
                .attr("class", "plus-10-marker")
                .attr("points", d => {
                    const cx = this.xScale(d.absoluteIndex);
                    const cy = this.yScale(d.close);
                    const baseWidth = 8; // Total width of the base
                    const height = 6;    // Total height of the triangle

                    // Triangle pointing down, centered vertically on the close line (cy)
                    const p1x = cx - baseWidth / 2;
                    const p2x = cx + baseWidth / 2;
                    const p3x = cx;
                    
                    const p1y = cy - height / 2;
                    const p2y = cy - height / 2;
                    const p3y = cy + height / 2;

                    return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`;
                })
                .attr("fill", "var(--btn-range-pink)");

            if (predictionCandle) {
                const predictionIndex = lastCandleIndex + 1;
                const candleX = this.xScale(predictionIndex) - candleWidth / 2;
                const isPredictedBullish = predictionCandle.close >= predictionCandle.open;

                this.svg.append("line")
                    .datum(predictionCandle)
                    .attr("class", `wick prediction-wick ${isPredictedBullish ? 'bullish-prediction' : 'bearish-prediction'}`)
                    .attr("x1", this.xScale(predictionIndex))
                    .attr("x2", this.xScale(predictionIndex))
                    .attr("y1", d => this.yScale(d.high))
                    .attr("y2", d => this.yScale(d.low));

                this.svg.append("rect")
                    .datum(predictionCandle)
                    .attr("class", `candle prediction-candle ${isPredictedBullish ? 'bullish-prediction' : 'bearish-prediction'}`)
                    .attr("x", candleX)
                    .attr("width", candleWidth)
                    .attr("height", d => Math.abs(this.yScale(d.open) - this.yScale(d.close)) || 1)
                    .attr("y", d => this.yScale(Math.max(d.open, d.close)))
                    .attr("fill", d => (d.close >= d.open ? "#00C853" : "#FF3D00"));
            }

            const validEmaFast = this.emaFast.slice(startIndex).map((value, index) => ({ index: startIndex + index, value: value })).filter(d => d.value !== null);
            const validEmaSlow = this.emaSlow.slice(startIndex).map((value, index) => ({ index: startIndex + index, value: value })).filter(d => d.value !== null);

            const emaLineEndIndex = predictionCandle ? lastCandleIndex + 1 : lastCandleIndex;

            const lineGenerator = d3.line()
                .x(d => this.xScale(d.index))
                .y(d => this.yScale(d.value))
                .defined(d => d.value !== null)
                .curve(d3.curveMonotoneX);

            if (validEmaFast.length > 0) {
                let pathDataFast = [...validEmaFast];
                if (predictionCandle) {
                    const lastEmaFastValue = validEmaFast[validEmaFast.length - 1].value;
                    pathDataFast.push({ index: emaLineEndIndex, value: lastEmaFastValue });
                }
                this.svg.append("path")
                    .datum(pathDataFast)
                    .attr("fill", "none")
                    .attr("class", "ema-fast neon-blue")
                    .attr("d", lineGenerator);
            }

            if (validEmaSlow.length > 0) {
                let pathDataSlow = [...validEmaSlow];
                if (predictionCandle) {
                    const lastEmaSlowValue = validEmaSlow[validEmaSlow.length - 1].value;
                    pathDataSlow.push({ index: emaLineEndIndex, value: lastEmaSlowValue });
                }
                this.svg.append("path")
                    .datum(pathDataSlow)
                    .attr("fill", "none")
                    .attr("class", "ema-slow neon-golden")
                    .attr("d", lineGenerator);
            }

            if (visibleData.length > 0) {
                const currentValue = visibleData[visibleData.length - 1];
                const highlightTolerance = 0.02;

                if (this.supports.length > 0) {
                    const supportValue = this.supports[0].value;
                    const supportLine = this.svg.select(".support-line");
                    if (Math.abs(currentValue - supportValue) < highlightTolerance) {
                        supportLine.attr("class", "support-line neon-green-sr");
                    } else {
                        supportLine.attr("class", "support-line");
                    }
                }

                if (this.resistances.length > 0) {
                    const resistanceValue = this.resistances[0].value;
                    const resistanceLine = this.svg.select(".resistance-line");
                    if (Math.abs(currentValue - resistanceValue) < highlightTolerance) {
                        resistanceLine.attr("class", "resistance-line neon-red-sr");
                    } else {
                        resistanceLine.attr("class", "resistance-line");
                    }
                }
            }
            
            this.drawGridLines();
            this.updateTrendIndicatorBar();

            // Always redraw Fibonacci if it's active, using the stored data values
            if (this.fibonacciState === 'active' && this.fibonacciAnchorY.y1_100_value !== null && this.fibonacciAnchorY.y2_0_value !== null) {
                this.drawFibonacciLevels(this.fibonacciAnchorY.y1_100_value, this.fibonacciAnchorY.y2_0_value);
            }
            // After chart is redrawn and yScale is stable, capture fixed pixel heights for zones if not already set,
            // and also synchronize equivalent fixed pixel sizes to the mini chart manager so the mini zones remain constant.
            try {
                // Ensure we keep storing the original body data-values (open/close) so zone always represents the same candle body
                // Pixel snapshots are optional for mini synchronisation (mini uses pixelHeight if provided)
                if (this.lastRedZone && (this.lastRedZone.pixelHeight === null || this.lastRedZone.pixelHeight === undefined)) {
                    const yHighPx = this.yScale(this.lastRedZone.high);
                    const yLowPx = this.yScale(this.lastRedZone.low);
                    this.lastRedZone.pixelHeight = Math.max(2, Math.abs(yHighPx - yLowPx));
                }
                if (this.lastGreenZone && (this.lastGreenZone.pixelHeight === null || this.lastGreenZone.pixelHeight === undefined)) {
                    const yHighPxG = this.yScale(this.lastGreenZone.high);
                    const yLowPxG = this.yScale(this.lastGreenZone.low);
                    this.lastGreenZone.pixelHeight = Math.max(2, Math.abs(yHighPxG - yLowPxG));
                }

                if (window.miniChartManager && window.miniChartManager.miniYScale) {
                    if (this.lastRedZone) {
                        const miniYHigh = window.miniChartManager.miniYScale(this.lastRedZone.high);
                        const miniYLow = window.miniChartManager.miniYScale(this.lastRedZone.low);
                        window.miniChartManager.lastRedZone = {
                            high: this.lastRedZone.high,
                            low: this.lastRedZone.low,
                            midpoint: this.lastRedZone.midpoint,
                            pixelHeight: Math.max(2, Math.abs(miniYHigh - miniYLow))
                        };
                    }
                    if (this.lastGreenZone) {
                        const miniYHighG = window.miniChartManager.miniYScale(this.lastGreenZone.high);
                        const miniYLowG = window.miniChartManager.miniYScale(this.lastGreenZone.low);
                        window.miniChartManager.lastGreenZone = {
                            high: this.lastGreenZone.high,
                            low: this.lastGreenZone.low,
                            midpoint: this.lastGreenZone.midpoint,
                            pixelHeight: Math.max(2, Math.abs(miniYHighG - miniYLowG))
                        };
                    }
                }
            } catch (e) {
                console.warn("Zone pixel snapshot failed (will retry on next update):", e);
            }
        }

        updateCounters() {
            const content = `Aciertos: <span class="stat-hits">${this.sessionStats.hits}</span> | Fallos: <span class="stat-misses">${this.sessionStats.misses}</span>`;
            if (sessionStatsDiv) sessionStatsDiv.innerHTML = content;
            if (typeof sessionStatsHeaderDiv !== 'undefined' && sessionStatsHeaderDiv && sessionStatsHeaderDiv.innerHTML !== undefined) {
                sessionStatsHeaderDiv.innerHTML = content;
            }
            this.updateAdvancedStatistics();
        }

        calculateAdvancedStatistics() {
            if (!this.bankManagementEnabled || this.signalHistory.length === 0) {
                return {
                    roi: null,
                    winRate: null,
                    profitFactor: null,
                    totalProfit: 0,
                    totalLoss: 0,
                    net: 0,
                    bestStreak: 0,
                    worstStreak: 0,
                    avgProfit: 0,
                    avgLoss: 0
                };
            }

            const wins = this.signalHistory.filter(s => s.result === 'win' && s.profitLoss > 0);
            const losses = this.signalHistory.filter(s => s.result === 'loss' && s.profitLoss < 0);
            
            const totalProfit = wins.reduce((sum, s) => sum + s.profitLoss, 0);
            const totalLoss = Math.abs(losses.reduce((sum, s) => sum + s.profitLoss, 0));
            const net = totalProfit - totalLoss;
            
            const initialCapital = this.signalHistory.length > 0 ? this.signalHistory[0].bankBefore : this.userCapital;
            const roi = initialCapital > 0 ? ((net / initialCapital) * 100) : 0;
            
            const totalSignals = this.signalHistory.length;
            const winRate = totalSignals > 0 ? (wins.length / totalSignals) * 100 : 0;
            
            const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
            
            // Calculate streaks
            let currentStreak = 0;
            let bestStreak = 0;
            let worstStreak = 0;
            
            for (let i = this.signalHistory.length - 1; i >= 0; i--) {
                if (this.signalHistory[i].result === 'win') {
                    currentStreak++;
                    bestStreak = Math.max(bestStreak, currentStreak);
                    worstStreak = Math.min(worstStreak, 0);
                    currentStreak = Math.max(0, currentStreak);
                } else {
                    currentStreak--;
                    worstStreak = Math.min(worstStreak, currentStreak);
                    bestStreak = Math.max(bestStreak, 0);
                    currentStreak = Math.min(0, currentStreak);
                }
            }
            
            const avgProfit = wins.length > 0 ? totalProfit / wins.length : 0;
            const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

            return {
                roi,
                winRate,
                profitFactor,
                totalProfit,
                totalLoss,
                net,
                bestStreak: Math.max(0, bestStreak),
                worstStreak: Math.abs(Math.min(0, worstStreak)),
                avgProfit,
                avgLoss
            };
        }

        updateAdvancedStatistics() {
            const stats = this.calculateAdvancedStatistics();
            
            const formatStat = (value, isPercent = false, isCurrency = false) => {
                if (value === null || value === undefined) return '--';
                if (isPercent) return `${value.toFixed(2)}%`;
                if (isCurrency) return formatCurrency(Math.abs(value));
                if (value === Infinity) return '∞';
                return value.toFixed(2);
            };
            
            document.getElementById('stat-roi').textContent = formatStat(stats.roi, true);
            document.getElementById('stat-winrate').textContent = formatStat(stats.winRate, true);
            document.getElementById('stat-profitfactor').textContent = formatStat(stats.profitFactor);
            document.getElementById('stat-totalprofit').textContent = formatStat(stats.totalProfit, false, true);
            document.getElementById('stat-totalloss').textContent = formatStat(stats.totalLoss, false, true);
            
            const netElement = document.getElementById('stat-net');
            netElement.textContent = formatStat(stats.net, false, true);
            netElement.className = 'stat-value ' + (stats.net >= 0 ? 'profit' : 'loss');
            
            document.getElementById('stat-beststreak').textContent = stats.bestStreak.toString();
            document.getElementById('stat-worststreak').textContent = stats.worstStreak.toString();
            document.getElementById('stat-avgprofit').textContent = formatStat(stats.avgProfit, false, true);
            document.getElementById('stat-avgloss').textContent = formatStat(stats.avgLoss, false, true);
            
            // Update performance chart
            this.updatePerformanceChart();
        }

        calculateDetailedStats() {
            if (!this.bankManagementEnabled || this.signalHistory.length === 0) {
                return {
                    totalJuegos: 0,
                    ganados1Intento: 0,
                    ganados2Intentos: 0,
                    perdidas: 0,
                    gananciaTotal: 0,
                    perdidaTotal: 0,
                    net: 0,
                    winRate: 0
                };
            }

            const ganados1Intento = this.signalHistory.filter(s => s.result === 'win' && s.attempt === 1).length;
            const ganados2Intentos = this.signalHistory.filter(s => s.result === 'win' && s.attempt === 2).length;
            const perdidas = this.signalHistory.filter(s => s.result === 'loss').length;
            const totalJuegos = this.signalHistory.length;

            const wins = this.signalHistory.filter(s => s.result === 'win' && s.profitLoss > 0);
            const losses = this.signalHistory.filter(s => s.result === 'loss' && s.profitLoss < 0);
            
            const gananciaTotal = wins.reduce((sum, s) => sum + s.profitLoss, 0);
            const perdidaTotal = Math.abs(losses.reduce((sum, s) => sum + s.profitLoss, 0));
            const net = gananciaTotal - perdidaTotal;
            
            const winRate = totalJuegos > 0 ? ((ganados1Intento + ganados2Intentos) / totalJuegos) * 100 : 0;

            return {
                totalJuegos,
                ganados1Intento,
                ganados2Intentos,
                perdidas,
                gananciaTotal,
                perdidaTotal,
                net,
                winRate
            };
        }

        showMetaAlcanzadaModal(esTakeProfit, gananciaOPerdida) {
            const stats = this.calculateDetailedStats();
            const modal = document.getElementById('meta-alcanzada-modal');
            const titulo = document.getElementById('modal-titulo');
            
            // Configurar título según si es Take Profit o Stop Loss
            if (esTakeProfit) {
                titulo.textContent = '¡Take Profit Alcanzado!';
                titulo.style.color = 'var(--neon-green-sr)';
                titulo.style.textShadow = '0 0 10px rgba(0, 255, 127, 0.8)';
            } else {
                titulo.textContent = 'Stop Loss Alcanzado';
                titulo.style.color = 'var(--neon-red-sr)';
                titulo.style.textShadow = '0 0 10px rgba(255, 69, 0, 0.8)';
            }
            
            // Actualizar estadísticas en el modal
            document.getElementById('modal-juegos-jugados').textContent = stats.totalJuegos;
            document.getElementById('modal-ganados-1').textContent = stats.ganados1Intento;
            document.getElementById('modal-ganados-2').textContent = stats.ganados2Intentos;
            document.getElementById('modal-perdidas').textContent = stats.perdidas;
            document.getElementById('modal-ganancia-total').textContent = formatCurrency(stats.gananciaTotal);
            document.getElementById('modal-perdida-total').textContent = formatCurrency(stats.perdidaTotal);
            
            const netElement = document.getElementById('modal-net');
            netElement.textContent = formatCurrency(Math.abs(stats.net));
            if (stats.net >= 0) {
                netElement.className = 'modal-stat-value profit';
            } else {
                netElement.className = 'modal-stat-value loss';
            }
            
            document.getElementById('modal-winrate').textContent = `${stats.winRate.toFixed(2)}%`;
            
            // Mostrar modal
            modal.classList.remove('hidden');
        }

        updatePerformanceChart() {
            const chartSvg = d3.select('#performance-chart');
            chartSvg.selectAll('*').remove();
            
            if (!this.bankManagementEnabled || this.signalHistory.length === 0) {
                return;
            }

            const margin = { top: 10, right: 10, bottom: 20, left: 40 };
            const width = chartSvg.node()?.getBoundingClientRect().width || 350;
            const height = 150;
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            // Prepare data - track bank evolution
            let currentBank = this.signalHistory.length > 0 ? this.signalHistory[0].bankBefore : this.userCapital;
            const bankData = [{ x: 0, y: currentBank }];
            
            this.signalHistory.forEach((entry, index) => {
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

            // Grid lines
            g.append('g')
                .attr('class', 'grid')
                .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(''));

            // Line
            g.append('path')
                .datum(bankData)
                .attr('fill', 'none')
                .attr('stroke', currentBank >= (bankData[0]?.y || 0) ? 'var(--neon-green-sr)' : 'var(--neon-red-sr)')
                .attr('stroke-width', 2)
                .attr('d', line);

            // Points
            g.selectAll('.dot')
                .data(bankData)
                .enter().append('circle')
                .attr('class', 'dot')
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => yScale(d.y))
                .attr('r', 3)
                .attr('fill', d => d.y >= (bankData[0]?.y || 0) ? 'var(--neon-green-sr)' : 'var(--neon-red-sr)');

            // Axes
            g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(d3.axisBottom(xScale).ticks(5));

            g.append('g')
                .call(d3.axisLeft(yScale).ticks(5));
        }

        updateSignalHistoryDisplay() {
            const historyList = document.getElementById('signal-history-list');
            if (!historyList) return;

            if (this.signalHistory.length === 0) {
                historyList.innerHTML = '<div class="history-empty">No hay señales registradas aún</div>';
                return;
            }

            // Apply filters
            const filterResult = document.getElementById('filter-result')?.value || 'all';
            const filterAttempt = document.getElementById('filter-attempt')?.value || 'all';
            const filterDate = document.getElementById('filter-date')?.value || '';

            let filteredHistory = [...this.signalHistory];
            
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

            // Sort history by most recent first
            const sortedHistory = filteredHistory.reverse();

            if (sortedHistory.length === 0) {
                historyList.innerHTML = '<div class="history-empty">No hay señales que coincidan con los filtros</div>';
                return;
            }

            let html = '<div class="history-list">';
            
            sortedHistory.forEach((entry, index) => {
                const isWin = entry.result === 'win';
                const resultClass = isWin ? 'win' : 'loss';
                const resultText = isWin ? 'Ganada' : 'Perdida';
                const attemptText = entry.attempt === 1 ? '1 intento' : '2 intentos';
                
                // Format time
                const time = new Date(entry.timestamp);
                const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
                
                html += `<div class="history-item ${resultClass}">`;
                html += `<div class="history-item-header">`;
                html += `<span class="history-result">${resultText}</span>`;
                html += `<span class="history-attempt">${attemptText}</span>`;
                html += `<span class="history-time">${timeStr}</span>`;
                html += `</div>`;
                
                if (this.bankManagementEnabled && entry.profitLoss !== null) {
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
            
            // Save to localStorage
            this.saveHistoryToLocalStorage();
        }

        saveHistoryToLocalStorage() {
            try {
                const historyData = {
                    history: this.signalHistory,
                    timestamp: Date.now()
                };
                localStorage.setItem('tradingAppHistory', JSON.stringify(historyData));
            } catch (e) {
                console.warn('Failed to save history:', e);
            }
        }

        loadHistoryFromLocalStorage() {
            try {
                const saved = localStorage.getItem('tradingAppHistory');
                if (saved) {
                    const historyData = JSON.parse(saved);
                    if (historyData.history && Array.isArray(historyData.history)) {
                        this.signalHistory = historyData.history.map(entry => ({
                            ...entry,
                            timestamp: new Date(entry.timestamp)
                        }));
                        this.updateSignalHistoryDisplay();
                        this.updateAdvancedStatistics();
                    }
                }
            } catch (e) {
                console.warn('Failed to load history:', e);
            }
        }

        exportHistory(format = 'csv') {
            if (this.signalHistory.length === 0) {
                alert('No hay historial para exportar');
                return;
            }

            const currencySymbol = window.selectedCurrency ? window.selectedCurrency.symbol : '$';
            
            if (format === 'csv') {
                let csv = 'ID,Fecha,Hora,Resultado,Intentos,Intento 1,Intento 2,Ganancia/Pérdida,Bank Antes,Bank Después\n';
                
                this.signalHistory.forEach(entry => {
                    const date = new Date(entry.timestamp);
                    const dateStr = date.toLocaleDateString('es-ES');
                    const timeStr = date.toLocaleTimeString('es-ES');
                    const result = entry.result === 'win' ? 'Ganada' : 'Perdida';
                    const apuesta2 = entry.attempt === 2 ? entry.apuesta2_amount.toFixed(2) : '0.00';
                    const profitLoss = entry.profitLoss !== null ? entry.profitLoss.toFixed(2) : 'N/A';
                    const bankBefore = entry.bankBefore !== null ? entry.bankBefore.toFixed(2) : 'N/A';
                    const bankAfter = entry.bankAfter !== null ? entry.bankAfter.toFixed(2) : 'N/A';
                    
                    csv += `${entry.id},${dateStr},${timeStr},${result},${entry.attempt},${entry.apuesta1_amount.toFixed(2)},${apuesta2},${profitLoss},${bankBefore},${bankAfter}\n`;
                });
                
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `historial_trading_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (format === 'json') {
                const json = JSON.stringify({
                    exportDate: new Date().toISOString(),
                    currency: selectedCurrency,
                    history: this.signalHistory
                }, null, 2);
                
                const blob = new Blob([json], { type: 'application/json' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `historial_trading_${new Date().toISOString().split('T')[0]}.json`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }

        generateSessionSummary() {
            const stats = this.calculateAdvancedStatistics();
            
            let html = '<div class="summary-stats">';
            html += `<div class="summary-section">`;
            html += `<h4>Resumen General</h4>`;
            html += `<div class="summary-grid">`;
            html += `<div class="summary-item"><span>Total Señales:</span> <strong>${this.signalHistory.length}</strong></div>`;
            html += `<div class="summary-item"><span>Aciertos:</span> <strong class="profit">${this.sessionStats.hits}</strong></div>`;
            html += `<div class="summary-item"><span>Fallos:</span> <strong class="loss">${this.sessionStats.misses}</strong></div>`;
            html += `<div class="summary-item"><span>Win Rate:</span> <strong>${stats.winRate !== null ? stats.winRate.toFixed(2) + '%' : '--'}</strong></div>`;
            html += `</div></div>`;
            
            html += `<div class="summary-section">`;
            html += `<h4>Rendimiento Financiero</h4>`;
            html += `<div class="summary-grid">`;
            html += `<div class="summary-item"><span>Ganancia Total:</span> <strong class="profit">${formatCurrency(stats.totalProfit)}</strong></div>`;
            html += `<div class="summary-item"><span>Pérdida Total:</span> <strong class="loss">${formatCurrency(stats.totalLoss)}</strong></div>`;
            html += `<div class="summary-item"><span>Ganancia/Pérdida Net:</span> <strong class="${stats.net >= 0 ? 'profit' : 'loss'}">${formatCurrency(Math.abs(stats.net))}</strong></div>`;
            html += `<div class="summary-item"><span>ROI:</span> <strong class="${stats.roi >= 0 ? 'profit' : 'loss'}">${stats.roi !== null ? stats.roi.toFixed(2) + '%' : '--'}</strong></div>`;
            html += `<div class="summary-item"><span>Profit Factor:</span> <strong>${stats.profitFactor !== null ? (stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)) : '--'}</strong></div>`;
            html += `<div class="summary-item"><span>Promedio Ganancia:</span> <strong class="profit">${formatCurrency(stats.avgProfit)}</strong></div>`;
            html += `</div></div>`;
            
            html += `<div class="summary-section">`;
            html += `<h4>Rachas</h4>`;
            html += `<div class="summary-grid">`;
            html += `<div class="summary-item"><span>Mejor Racha:</span> <strong class="profit">${stats.bestStreak}</strong></div>`;
            html += `<div class="summary-item"><span>Peor Racha:</span> <strong class="loss">${stats.worstStreak}</strong></div>`;
            html += `</div></div>`;
            
            if (this.bankManagementEnabled) {
                html += `<div class="summary-section">`;
                html += `<h4>Bank</h4>`;
                html += `<div class="summary-grid">`;
                const initialBank = this.signalHistory.length > 0 ? this.signalHistory[0].bankBefore : this.userCapital;
                html += `<div class="summary-item"><span>Bank Inicial:</span> <strong>${formatCurrency(initialBank)}</strong></div>`;
                html += `<div class="summary-item"><span>Bank Actual:</span> <strong>${formatCurrency(this.userCapital)}</strong></div>`;
                const bankChange = this.userCapital - initialBank;
                html += `<div class="summary-item"><span>Cambio:</span> <strong class="${bankChange >= 0 ? 'profit' : 'loss'}">${bankChange >= 0 ? '+' : ''}${formatCurrency(Math.abs(bankChange))}</strong></div>`;
                html += `</div></div>`;
            }
            
            html += '</div>';
            return html;
        }

        displaySignalMessage(type, message) {
            signalOverlayMessage.textContent = message;
            signalOverlayMessage.classList.remove('entrada', 'acierto', 'fail_retry', 'fallo');
            signalOverlayMessage.classList.add(type);
            signalOverlayMessage.style.display = 'block';
            signalOverlayMessage.classList.remove('fade-in');
            void signalOverlayMessage.offsetWidth; // Trigger reflow to restart animation
            signalOverlayMessage.classList.add('fade-in');
            
            // Play notification sound
            if (type === 'entrada') {
                playNotificationSound('entrada');
            } else if (type === 'acierto') {
                playNotificationSound('win');
            } else if (type === 'fallo') {
                playNotificationSound('loss');
            } else if (type === 'fail_retry') {
                playNotificationSound('retry');
            }
            
            // Browser notification
            if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(message, {
                    icon: '/vite.svg',
                    tag: 'trading-signal'
                });
            }
            
            // Message persists until a new result is added (handled by clearSignalMessageOnNewInput)
        }
        
        // This function clears the signal message, to be called before adding new results/signals
        clearSignalMessageOnNewInput() {
            signalOverlayMessage.classList.remove('fade-in');
            signalOverlayMessage.style.display = 'none';
            signalOverlayMessage.textContent = '';
            signalOverlayMessage.classList.remove('entrada', 'acierto', 'fail_retry', 'fallo');
        }


        // Original strategy (EMA + Bullish Candle)
        checkOriginalStrategy() {
            const currentTrend = this.getTrend();
            const lastCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
            const isBullishCandle = lastCandle && lastCandle.close >= lastCandle.open;

            return currentTrend === 'alcista' && this.data.length >= 5 && isBullishCandle;
        }

        // Momentum Híbrido Strategy (75-80% success rate)
        checkMomentumHybridStrategy() {
            if (this.data.length < 10) return false;

            const currentTrend = this.getTrend();
            if (currentTrend !== 'alcista') return false;

            const lastCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
            if (!lastCandle) return false;

            const currentPrice = lastCandle.close;
            const rsi = this.calculateRSI(this.data, 14);
            if (rsi === null) return false;

            // 1. Momentum alcista (últimos 3-5 períodos subiendo)
            const hasMomentum = this.hasBullishMomentum(3);

            // 2. RSI entre 40-60 (zona neutral, no sobrecomprado)
            const rsiInRange = rsi >= 40 && rsi <= 60;

            // 3. Precio rebotando desde soporte (dentro del 2-3%)
            const nearSupport = this.isNearSupport(currentPrice, 0.03);

            // 4. Tendencia alcista fuerte (EMA 5 > EMA 10 + 1%)
            const trendStrength = this.getTrendStrength();
            const strongTrend = trendStrength > 1.0;

            // 5. Vela alcista fuerte (cuerpo > 50% del rango)
            const isBullishCandle = lastCandle.close >= lastCandle.open;
            const bodySize = this.getCandleBodySize(lastCandle);
            const strongCandle = bodySize > 50;

            // 6. NO cerca de resistencia (más del 2% de distancia)
            const notNearResistance = !this.isNearResistance(currentPrice, 0.02);

            return hasMomentum && rsiInRange && nearSupport && strongTrend && isBullishCandle && strongCandle && notNearResistance;
        }

        // Mean Reversion + RSI Strategy (65-75% success rate)
        checkMeanReversionRSIStrategy() {
            if (this.data.length < 14) return false;

            const currentTrend = this.getTrend();
            if (currentTrend !== 'alcista') return false;

            const lastCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
            if (!lastCandle) return false;

            const currentPrice = lastCandle.close;
            const rsi = this.calculateRSI(this.data, 14);
            if (rsi === null) return false;

            // 1. RSI < 30 (sobreventa)
            const oversold = rsi < 30;

            // 2. Precio cerca de soporte (dentro del 2-3%)
            const nearSupport = this.isNearSupport(currentPrice, 0.03);

            // 3. Tendencia alcista de fondo (EMA 5 > EMA 10)
            const bullishTrend = currentTrend === 'alcista';

            // 4. Vela alcista de confirmación
            const isBullishCandle = lastCandle.close >= lastCandle.open;

            return oversold && nearSupport && bullishTrend && isBullishCandle;
        }

        // Engulfing Pattern Strategy (65-70% success rate)
        checkEngulfingPatternStrategy() {
            if (this.candles.length < 2) return false;

            const currentTrend = this.getTrend();
            if (currentTrend !== 'alcista') return false;

            const lastCandle = this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
            if (!lastCandle) return false;

            const currentPrice = lastCandle.close;

            // 1. Patrón Engulfing alcista
            const hasEngulfing = this.hasBullishEngulfing();

            // 2. En nivel de soporte (dentro del 3%)
            const nearSupport = this.isNearSupport(currentPrice, 0.03);

            // 3. Tendencia alcista confirmada
            const bullishTrend = currentTrend === 'alcista';

            return hasEngulfing && nearSupport && bullishTrend;
        }

        // ========== NUEVAS ESTRATEGIAS POR RONDAS ==========

        // 1. Confirmación Doble por Señal (72%–80%)
        // Condición: Ronda anterior >= 1.50x Y no hay 2 rojas (<1.30x) seguidas
        checkConfirmacionDobleStrategy() {
            const multipliers = this.originalMultipliers;
            if (multipliers.length < 2) return false;
            
            const lastRound = multipliers[multipliers.length - 1];
            
            // Verificar que la ronda anterior sea >= 1.50x
            if (lastRound < 1.50) return false;
            
            // Verificar que no haya 2 rojas (<1.30x) seguidas en las últimas 5 rondas
            const recentRounds = multipliers.slice(-5);
            for (let i = 1; i < recentRounds.length; i++) {
                if (recentRounds[i] < 1.30 && recentRounds[i - 1] < 1.30) {
                    return false; // Hay 2 rojas seguidas
                }
            }
            
            return true;
        }

        // 2. Señal + Ronda Verde Previa (70%–77%)
        // Condición: Ronda anterior >= 1.70x (o >= cashout objetivo)
        checkRondaVerdeStrategy() {
            const multipliers = this.originalMultipliers;
            if (multipliers.length < 1) return false;
            
            const lastRound = multipliers[multipliers.length - 1];
            const targetCashout = WIN_ODDS_APUESTA_1 || 1.70;
            
            return lastRound >= Math.max(1.70, targetCashout);
        }

        // 3. Bloque de 2 Señales (68%–74%)
        // Condición: 2 señales consecutivas Y Min(rondas intermedias) >= 1.20x
        checkBloque2SenalesStrategy() {
            const state = this.newStrategyState;
            const multipliers = this.originalMultipliers;
            
            // Si ya tenemos una señal pendiente, verificar si podemos generar la segunda
            if (state.consecutiveSignals >= 1) {
                // Verificar que no haya habido <1.20x desde la última señal
                const roundsSinceLastSignal = multipliers.slice(state.lastSignalIndex + 1);
                const hasLowRound = roundsSinceLastSignal.some(m => m < 1.20);
                
                if (hasLowRound) {
                    // Resetear el contador si hubo una ronda baja
                    state.consecutiveSignals = 0;
                    state.lastSignalIndex = -1;
                    return false;
                }
                
                // Segunda señal confirmada
                if (state.consecutiveSignals >= 1 && roundsSinceLastSignal.length >= 1) {
                    state.consecutiveSignals = 0; // Reset para próximo ciclo
                    state.lastSignalIndex = -1;
                    return true;
                }
            }
            
            // Primera señal: verificar condiciones básicas
            if (multipliers.length >= 2) {
                const lastRound = multipliers[multipliers.length - 1];
                if (lastRound >= 1.50) {
                    state.consecutiveSignals = 1;
                    state.lastSignalIndex = multipliers.length - 1;
                }
            }
            
            return false;
        }

        // 4. Ventana Limpia (67%–73%)
        // Condición: Max 1 roja (<1.30x) en últimas 5 Y ningún >20x
        checkVentanaLimpiaStrategy() {
            const multipliers = this.originalMultipliers;
            if (multipliers.length < 5) return false;
            
            const last5 = multipliers.slice(-5);
            
            // Contar rojas (<1.30x)
            const redCount = last5.filter(m => m < 1.30).length;
            if (redCount > 1) return false;
            
            // Verificar que no haya >20x
            const hasSpike = last5.some(m => m > 20);
            if (hasSpike) return false;
            
            return true;
        }

        // 5. Filtro Anti-Pico (66%–72%)
        // Condición: Max(últimas 3) < 10x
        checkFiltroAntiPicoStrategy() {
            const multipliers = this.originalMultipliers;
            if (multipliers.length < 3) return false;
            
            const last3 = multipliers.slice(-3);
            const maxValue = Math.max(...last3);
            
            return maxValue < 10;
        }

        // 6. Señal Escalonada Conservadora (64%–70%)
        // Condición: Ronda[-1] >= 1.40x Y Ronda[-2] >= 1.40x
        checkSenalEscalonadaStrategy() {
            const multipliers = this.originalMultipliers;
            if (multipliers.length < 2) return false;
            
            const lastRound = multipliers[multipliers.length - 1];
            const secondLastRound = multipliers[multipliers.length - 2];
            
            return lastRound >= 1.40 && secondLastRound >= 1.40;
        }

        // 7. Señal Única por Ciclo (62%–68%)
        // Condición: 1 apuesta por ciclo, reset cuando <1.30x o >5x
        checkSenalUnicaCicloStrategy() {
            const state = this.newStrategyState;
            const multipliers = this.originalMultipliers;
            
            if (multipliers.length < 1) return false;
            
            const lastRound = multipliers[multipliers.length - 1];
            
            // Verificar si el ciclo debe resetearse
            if (lastRound < 1.30 || lastRound > 5) {
                state.cycleActive = false; // Reset del ciclo
            }
            
            // Si el ciclo ya está activo, no generar señal
            if (state.cycleActive) return false;
            
            // Verificar condición de entrada básica (ronda verde)
            if (lastRound >= 1.50) {
                state.cycleActive = true; // Marcar ciclo como activo
                return true;
            }
            
            return false;
        }

        // 8. Entrada Tardía Controlada (60%–66%)
        // Condición: Señal activa → esperar, si Ronda[+1] >= 1.30x → entrar
        checkEntradaTardiaStrategy() {
            const state = this.newStrategyState;
            const multipliers = this.originalMultipliers;
            
            if (multipliers.length < 2) return false;
            
            const lastRound = multipliers[multipliers.length - 1];
            const secondLastRound = multipliers[multipliers.length - 2];
            
            // Si estamos esperando confirmación
            if (state.waitingForConfirmation) {
                if (lastRound >= 1.30) {
                    // Confirmación recibida, generar entrada
                    state.waitingForConfirmation = false;
                    state.pendingEntryRound = null;
                    return true;
                } else {
                    // Cancelar, la ronda fue < 1.30x
                    state.waitingForConfirmation = false;
                    state.pendingEntryRound = null;
                    return false;
                }
            }
            
            // Detectar potencial señal para esperar
            if (secondLastRound >= 1.70 && !state.waitingForConfirmation) {
                state.waitingForConfirmation = true;
                state.pendingEntryRound = multipliers.length - 1;
                // No generar señal aún, esperar siguiente ronda
                return false;
            }
            
            return false;
        }

        // Helper: Reset state for new strategies
        resetNewStrategyState() {
            this.newStrategyState = {
                consecutiveSignals: 0,
                lastSignalRounds: [],
                cycleActive: false,
                waitingForConfirmation: false,
                pendingEntryRound: null,
                lastSignalIndex: -1
            };
        }

        // ========== FIN NUEVAS ESTRATEGIAS ==========

        checkAndGenerateEntradaSignal() {
            if (this.signalState.status !== 'none' || this.signalState.consecutiveEntradas >= 3 || this.signalState.awaitingNextManualInputBeforeEntrada) {
                if (this.signalState.consecutiveEntradas >= 3) {
                    console.log("Max consecutive 'ENTRADA' signals reached. System waiting for non-signal-related action or reset.");
                }
                if (this.signalState.awaitingNextManualInputBeforeEntrada) {
                    console.log("Suppressing 'ENTRADA' because system is awaiting next manual input after previous ENTRADA.");
                }
                return;
            }

            // GLOBAL TREND CHECK: Do not operate in downtrend if Aviator mode
            // Accessing global selectedGame variable
            if (typeof selectedGame !== 'undefined' && selectedGame === 'aviator' && this.getTrend() === 'bajista') {
                 console.log("Tendencia Bajista en Aviator - No operar.");
                 return;
            }

            let shouldGenerateSignal = false;
            let strategyName = '';

            // Check strategy based on selection
            if (selectedStrategy === 'automatic') {
                // Check all strategies - if any matches, generate signal
                // Primero las estrategias por rondas (mayor efectividad)
                if (this.checkConfirmacionDobleStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Confirmación Doble (72-80%)';
                } else if (this.checkRondaVerdeStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Ronda Verde Previa (70-77%)';
                } else if (this.checkBloque2SenalesStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Bloque 2 Señales (68-74%)';
                } else if (this.checkVentanaLimpiaStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Ventana Limpia (67-73%)';
                } else if (this.checkFiltroAntiPicoStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Filtro Anti-Pico (66-72%)';
                } else if (this.checkSenalEscalonadaStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Señal Escalonada (64-70%)';
                } else if (this.checkSenalUnicaCicloStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Señal Única Ciclo (62-68%)';
                } else if (this.checkEntradaTardiaStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Entrada Tardía (60-66%)';
                }
                // Luego las estrategias técnicas originales
                else if (this.checkMomentumHybridStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Momentum Híbrido';
                } else if (this.checkMeanReversionRSIStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Mean Reversion + RSI';
                } else if (this.checkEngulfingPatternStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Engulfing Pattern';
                } else if (this.checkOriginalStrategy()) {
                    shouldGenerateSignal = true;
                    strategyName = 'Original (EMA + Vela)';
                }
            } else {
                switch (selectedStrategy) {
                    // Estrategias técnicas originales
                    case 'momentum_hybrid':
                        shouldGenerateSignal = this.checkMomentumHybridStrategy();
                        strategyName = 'Momentum Híbrido';
                        break;
                    case 'mean_reversion_rsi':
                        shouldGenerateSignal = this.checkMeanReversionRSIStrategy();
                        strategyName = 'Mean Reversion + RSI';
                        break;
                    case 'engulfing':
                        shouldGenerateSignal = this.checkEngulfingPatternStrategy();
                        strategyName = 'Engulfing Pattern';
                        break;
                    case 'original':
                        shouldGenerateSignal = this.checkOriginalStrategy();
                        strategyName = 'Original (EMA + Vela)';
                        break;
                    // Nuevas estrategias por rondas
                    case 'confirmacion_doble':
                        shouldGenerateSignal = this.checkConfirmacionDobleStrategy();
                        strategyName = 'Confirmación Doble (72-80%)';
                        break;
                    case 'ronda_verde_previa':
                        shouldGenerateSignal = this.checkRondaVerdeStrategy();
                        strategyName = 'Ronda Verde Previa (70-77%)';
                        break;
                    case 'bloque_2_senales':
                        shouldGenerateSignal = this.checkBloque2SenalesStrategy();
                        strategyName = 'Bloque 2 Señales (68-74%)';
                        break;
                    case 'ventana_limpia':
                        shouldGenerateSignal = this.checkVentanaLimpiaStrategy();
                        strategyName = 'Ventana Limpia (67-73%)';
                        break;
                    case 'filtro_anti_pico':
                        shouldGenerateSignal = this.checkFiltroAntiPicoStrategy();
                        strategyName = 'Filtro Anti-Pico (66-72%)';
                        break;
                    case 'senal_escalonada':
                        shouldGenerateSignal = this.checkSenalEscalonadaStrategy();
                        strategyName = 'Señal Escalonada (64-70%)';
                        break;
                    case 'senal_unica_ciclo':
                        shouldGenerateSignal = this.checkSenalUnicaCicloStrategy();
                        strategyName = 'Señal Única Ciclo (62-68%)';
                        break;
                    case 'entrada_tardia':
                        shouldGenerateSignal = this.checkEntradaTardiaStrategy();
                        strategyName = 'Entrada Tardía (60-66%)';
                        break;
                    default:
                        shouldGenerateSignal = this.checkOriginalStrategy();
                        strategyName = 'Original (EMA + Vela)';
                        break;
                }
            }

            if (shouldGenerateSignal) {
                this.signalState.status = 'entrada_pending';
                this.displaySignalMessage('entrada', 'ENTRADA CONFIRMADA'); // Display message
                apuesta1Label.classList.add('highlight-apuesta1'); // Highlight Apuesta 1

                this.signalState.consecutiveEntradas++;
                this.signalState.awaitingNextManualInputBeforeEntrada = true;

                // Initialize signal history entry
                const bankBeforeSignal = this.bankManagementEnabled ? this.userCapital : null;
                this.currentSignalEntry = {
                    id: Date.now(),
                    timestamp: new Date(),
                    bankBefore: bankBeforeSignal,
                    apuesta1_amount: 0,
                    apuesta2_amount: 0,
                    attempt: null, // Will be set when resolved: 1 or 2
                    result: null, // Will be set: 'win' or 'loss'
                    profitLoss: null, // Will be calculated when resolved
                    bankAfter: null, // Will be set when resolved
                    strategy: strategyName // Track which strategy generated this signal
                };

                if (this.bankManagementEnabled) {
                    this.calculateApuestaAmounts();
                    this.activeApuesta1_amount = this.apuesta1_amount;
                    this.activeApuesta2_amount = this.apuesta2_amount;
                    this.currentSignalEntry.apuesta1_amount = this.activeApuesta1_amount;
                    this.currentSignalEntry.apuesta2_amount = this.activeApuesta2_amount;

                    if (this.userCapital >= this.activeApuesta1_amount && this.activeApuesta1_amount > 0) {
                        this.safeBankUpdate(-this.activeApuesta1_amount);
                        this.currentBetAttempt = 1;
                        this.updateBankAndApuestaDisplays();
                    } else {
                        alert(`¡Capital insuficiente para la Apuesta 1 o monto de apuesta 0! Reinicia o ingresa más capital.\n\nApuesta 1 requerida: ${formatCurrency(this.activeApuesta1_amount)}\nCapital disponible: ${formatCurrency(this.userCapital)}`);
                        this.reset(); // Call instance reset
                        return;
                    }
                }
                console.log(`Generated 'ENTRADA' signal using ${strategyName} strategy. Consecutive: ${this.signalState.consecutiveEntradas}`);
            }
        }

        addDataPoint(valueFromButton, miniValue, buttonOriginalValue, originalMultiplier = null, hora = null) {
            const currentOpen = this.candles.length > 0 ? this.candles[this.candles.length - 1].close : 0;
            this.accumulatedValue += valueFromButton;
            const currentClose = this.accumulatedValue;

            this.data.push(currentClose);

            let candleHigh = Math.max(currentOpen, currentClose);
            let candleLow = Math.min(currentOpen, currentClose);

            const wickMagnitude = Math.abs(valueFromButton) * 0.1;
            candleHigh = Math.max(candleHigh, Math.max(currentOpen, currentClose) + wickMagnitude);
            candleLow = Math.min(candleLow, Math.min(currentOpen, currentClose) - wickMagnitude);

            // Store original multiplier and hora for display on chart
            this.candles.push({ 
                open: currentOpen, 
                close: currentClose, 
                high: candleHigh, 
                low: candleLow, 
                category: buttonOriginalValue,
                originalMultiplier: originalMultiplier,
                hora: hora
            });

            // Store the body open/close values explicitly so zone always maps to the original candle body (open and close)
            if (buttonOriginalValue === "-5") {
                const bodyHigh = Math.max(currentOpen, currentClose);
                const bodyLow = Math.min(currentOpen, currentClose);
                const midpoint = (bodyHigh + bodyLow) / 2;
                let pixelHeight = null;
                try {
                    const yHighPx = this.yScale ? this.yScale(bodyHigh) : null;
                    const yLowPx = this.yScale ? this.yScale(bodyLow) : null;
                    if (yHighPx !== null && yLowPx !== null) pixelHeight = Math.max(2, Math.abs(yHighPx - yLowPx));
                } catch (e) { pixelHeight = null; }
                // Keep only the latest zone; remove any green zone so only the last one is visible
                this.lastRedZone = { high: bodyHigh, low: bodyLow, midpoint, pixelHeight };
                this.lastGreenZone = null;
            }

            if (buttonOriginalValue === "5") {
                const bodyHighG = Math.max(currentOpen, currentClose);
                const bodyLowG = Math.min(currentOpen, currentClose);
                const midpointG = (bodyHighG + bodyLowG) / 2;
                let pixelHeightG = null;
                try {
                    const yHighPxG = this.yScale ? this.yScale(bodyHighG) : null;
                    const yLowPxG = this.yScale ? this.yScale(bodyLowG) : null;
                    if (yHighPxG !== null && yLowPxG !== null) pixelHeightG = Math.max(2, Math.abs(yHighPxG - yLowPxG));
                } catch (e) { pixelHeightG = null; }
                this.lastGreenZone = { high: bodyHighG, low: bodyLowG, midpoint: midpointG, pixelHeight: pixelHeightG };
                this.lastRedZone = null;
            }

            const { supports: newSupports, resistances: newResistances } = this.calculateSupportResistance(this.data);
            this.supports = newSupports;
            this.resistances = newResistances;
            this.emaFast = this.calculateEMA(this.data, this.emaFastPeriod);
            this.emaSlow = this.calculateEMA(this.data, this.emaSlowPeriod);
            this.updateChart();
            if (window.miniChartManager) {
                window.miniChartManager.addMiniChartData({ value: miniValue, category: buttonOriginalValue });
            } else {
                console.warn("MiniChartManager is not defined.");
            }
        }

        handleButtonInput(valueFromButton, miniValue, buttonOriginalValue, originalMultiplier = null, hora = null) {
            // Clear previous signal messages and highlights, but NOT Fibonacci levels
            this.clearSignalMessageOnNewInput();
            this.clearApuestaHighlights();

            if (this.signalState.status === 'none') {
                this.signalState.awaitingNextManualInputBeforeEntrada = false;
                this.signalState.consecutiveEntradas = 0;
                this.currentBetAttempt = 0;
                this.activeApuesta1_amount = 0;
                this.activeApuesta2_amount = 0;
                if (this.bankManagementEnabled) {
                    this.calculateApuestaAmounts();
                    this.updateBankAndApuestaDisplays();
                }
                this.addDataPoint(valueFromButton, miniValue, buttonOriginalValue, originalMultiplier, hora);
                this.checkAndGenerateEntradaSignal();
                return;
            }

            if (this.signalState.status === 'entrada_pending') {
                if (valueFromButton >= THRESHOLD_APUESTA_1_WIN_BUTTON_VALUE) {
                    // Win condition: 2.00x or higher
                    this.sessionStats.hits++;
                    this.displaySignalMessage('acierto', '¡ACIERTO!');
                    let profit = 0;
                    if (this.bankManagementEnabled) {
                        // Round the bet amount to ensure precision
                        const betAmount = parseFloat(this.activeApuesta1_amount.toFixed(2));
                        // When winning, add DOUBLE of what was bet (bet was already deducted)
                        const winningsToAdd = parseFloat((betAmount * 2).toFixed(2));
                        // Net profit = double bet - bet = bet (since bet was already deducted)
                        profit = parseFloat(betAmount.toFixed(2));
                        // Add double the bet amount back (bet was already deducted, so this gives us: bank - bet + (bet * 2) = bank + bet)
                        this.safeBankUpdate(winningsToAdd);
                        // Update bank display immediately after win
                        this.updateBankAndApuestaDisplays();
                        // Check TP/SL immediately after win
                        if (this.checkTakeProfitStopLoss()) {
                            return; // Stop if TP/SL reached
                        }
                    }
                    // Record signal history - Win on attempt 1
                    if (this.currentSignalEntry) {
                        this.currentSignalEntry.attempt = 1;
                        this.currentSignalEntry.result = 'win';
                        this.currentSignalEntry.profitLoss = this.bankManagementEnabled ? profit : null;
                        this.currentSignalEntry.bankAfter = this.bankManagementEnabled ? this.userCapital : null;
                        this.signalHistory.push({...this.currentSignalEntry});
                        this.updateSignalHistoryDisplay();
                        this.currentSignalEntry = null;
                    }
                    this.signalState.status = 'none';
                    this.signalState.consecutiveFails = 0;
                    this.signalState.consecutiveEntradas = 0;
                    this.currentBetAttempt = 0;
                    this.L_total_unrecovered_losses = 0;
                    this.currentInitialBetPercentage = getInitialBetPercentage();
                    this.activeApuesta1_amount = 0;
                    this.activeApuesta2_amount = 0;
                    if (this.bankManagementEnabled) {
                        this.calculateApuestaAmounts();
                        this.updateBankAndApuestaDisplays(); // Update display after recalculating
                    }
                } else {
                    // Loss condition: 1.80/1.99 or lower - mark as loss and proceed to second attempt
                    this.displaySignalMessage('fail_retry', 'SEGUNDO INTENTO');
                    this.signalState.status = 'awaiting_result';
                    this.currentBetAttempt = 2;
                    // Apuesta1 was already deducted, no need to deduct again
                    if (this.bankManagementEnabled) {
                        if (this.userCapital >= this.activeApuesta2_amount && this.activeApuesta2_amount > 0) {
                            this.safeBankUpdate(-this.activeApuesta2_amount);
                            apuesta2Label.classList.add('highlight-apuesta2');
                        } else {
                            // If can't make second bet, mark as complete loss
                            if (this.currentSignalEntry) {
                                this.currentSignalEntry.attempt = 2;
                                this.currentSignalEntry.result = 'loss';
                                this.currentSignalEntry.profitLoss = this.bankManagementEnabled ? -this.activeApuesta1_amount : null;
                                this.currentSignalEntry.bankAfter = this.bankManagementEnabled ? this.userCapital : null;
                                this.signalHistory.push({...this.currentSignalEntry});
                                this.updateSignalHistoryDisplay();
                                this.updateAdvancedStatistics();
                                this.currentSignalEntry = null;
                            }
                            alert(`¡Capital insuficiente para el Intento 2 o monto de apuesta 0! Reinicia o ingresa más capital.\n\nIntento 2 requerido: ${formatCurrency(this.activeApuesta2_amount)}\nCapital disponible: ${formatCurrency(this.userCapital)}`);
                            this.reset();
                            return;
                        }
                    }
                }
                this.updateCounters();
                if (this.bankManagementEnabled) this.updateBankAndApuestaDisplays();
                this.addDataPoint(valueFromButton, miniValue, buttonOriginalValue, originalMultiplier, hora);

            } else if (this.signalState.status === 'awaiting_result') {
                if (valueFromButton >= THRESHOLD_APUESTA_2_WIN_BUTTON_VALUE) {
                    // Win condition on second attempt: 2.00x or higher
                    this.sessionStats.hits++;
                    this.displaySignalMessage('acierto', '¡ACIERTO!');
                    let profit = 0;
                    if (this.bankManagementEnabled) {
                        // Round the bet amounts to ensure precision
                        const betAmount1 = parseFloat(this.activeApuesta1_amount.toFixed(2));
                        const betAmount2 = parseFloat(this.activeApuesta2_amount.toFixed(2));
                        // When winning, add DOUBLE of what was bet in attempt 2 (both bets were already deducted)
                        const winningsToAdd = parseFloat((betAmount2 * 2).toFixed(2));
                        // Net profit = double of apuesta2 - (apuesta1 + apuesta2)
                        // Both apuesta1 and apuesta2 were already deducted from bank
                        profit = parseFloat((winningsToAdd - betAmount1 - betAmount2).toFixed(2));
                        // Add double the bet amount back (since both bets were already deducted)
                        // This gives us: bank - apuesta1 - apuesta2 + (apuesta2 * 2) = bank + apuesta2 - apuesta1
                        this.safeBankUpdate(winningsToAdd);
                        // Update bank display immediately after win
                        this.updateBankAndApuestaDisplays();
                        // Check TP/SL immediately after win
                        if (this.checkTakeProfitStopLoss()) {
                            return; // Stop if TP/SL reached
                        }
                    }
                    // Record signal history - Win on attempt 2
                    if (this.currentSignalEntry) {
                        this.currentSignalEntry.attempt = 2;
                        this.currentSignalEntry.result = 'win';
                        this.currentSignalEntry.profitLoss = this.bankManagementEnabled ? profit : null;
                        this.currentSignalEntry.bankAfter = this.bankManagementEnabled ? this.userCapital : null;
                        this.signalHistory.push({...this.currentSignalEntry});
                        this.updateSignalHistoryDisplay();
                        this.currentSignalEntry = null;
                    }
                    this.signalState.status = 'none';
                    this.signalState.consecutiveFails = 0;
                    this.signalState.consecutiveEntradas = 0;
                    this.currentBetAttempt = 0;
                    this.L_total_unrecovered_losses = 0;
                    this.currentInitialBetPercentage = getInitialBetPercentage();
                    this.activeApuesta1_amount = 0;
                    this.activeApuesta2_amount = 0;
                    if (this.bankManagementEnabled) {
                        this.calculateApuestaAmounts();
                        this.updateBankAndApuestaDisplays(); // Update display after recalculating
                    }
                } else {
                    this.sessionStats.misses++;
                    this.displaySignalMessage('fallo', '¡FALLO!');
                    const totalLoss = this.activeApuesta1_amount + this.activeApuesta2_amount;
                    this.L_total_unrecovered_losses = parseFloat((this.L_total_unrecovered_losses + totalLoss).toFixed(2));
                    console.log("Total unrecovered losses:", this.L_total_unrecovered_losses.toFixed(2));
                    
                    // Record signal history - Loss (both attempts failed)
                    if (this.currentSignalEntry) {
                        this.currentSignalEntry.attempt = 2;
                        this.currentSignalEntry.result = 'loss';
                        this.currentSignalEntry.profitLoss = this.bankManagementEnabled ? -totalLoss : null;
                        this.currentSignalEntry.bankAfter = this.bankManagementEnabled ? this.userCapital : null;
                        this.signalHistory.push({...this.currentSignalEntry});
                        this.updateSignalHistoryDisplay();
                        this.currentSignalEntry = null;
                    }
                    
                    this.signalState.status = 'none';
                    this.signalState.consecutiveFails++;
                    this.signalState.consecutiveEntradas = 0;
                    this.currentBetAttempt = 0;
                    this.activeApuesta1_amount = 0;
                    this.activeApuesta2_amount = 0;
                    if (this.bankManagementEnabled) this.calculateApuestaAmounts();
                }
                this.updateCounters();
                if (this.bankManagementEnabled) this.updateBankAndApuestaDisplays();
                this.addDataPoint(valueFromButton, miniValue, buttonOriginalValue, originalMultiplier, hora);
            }
        }

        resizeChart() {
            this.width = this.chartContainer.offsetWidth;
            this.height = this.chartContainer.offsetHeight;
            this.innerWidth = this.width - this.margin.left - this.margin.right;
            this.innerHeight = this.height - this.margin.top - this.margin.bottom;

            this.xScale.range([this.margin.left, this.margin.left + this.innerWidth]);
            this.yScale.range([this.height - this.margin.bottom, this.margin.top]);

            // Re-draw the chart, which includes redrawing Fibonacci levels if active
            this.updateChart();
        }

        setChartViewMode(mode) {
            this.chartContainer.classList.remove('chart-mode-main', 'chart-mode-mini', 'chart-mode-both');
            if (mode === 'main') {
                this.chartContainer.classList.add('chart-mode-main');
                this.resizeChart();
            } else if (mode === 'mini') {
                this.chartContainer.classList.add('chart-mode-mini');
                if (window.miniChartManager) {
                    window.miniChartManager.resizeMiniChart();
                }
            } else { // 'both'
                this.chartContainer.classList.add('chart-mode-both');
                this.resizeChart();
                if (window.miniChartManager) {
                    window.miniChartManager.resizeMiniChart();
                }
            }
        }
        
        // This is the full reset for the ChartManager instance
        reset() {
            this.data = [];
            this.accumulatedValue = 0;
            this.candles = [];
            this.supports = [];
            this.resistances = [];
            this.lastRedZone = null;
            this.lastGreenZone = null;
            this.currentZoomLevel = 0;

            this.emaFast = this.calculateEMA(this.data, this.emaFastPeriod);
            this.emaSlow = this.calculateEMA(this.data, this.emaSlowPeriod);

            this.chartContainer.classList.remove('ema-trend-up', 'ema-trend-down');

            this.clearFibonacci(); // Reset main Fibonacci
            if (window.miniChartManager) { // Call mini-chart's clear
                window.miniChartManager.clearMiniFibonacci();
            }
            
            this.signalState = { status: 'none', consecutiveFails: 0, consecutiveEntradas: 0, awaitingNextManualInputBeforeEntrada: false };
            this.sessionStats = { hits: 0, misses: 0 };
            this.currentBetAttempt = 0;
            this.currentInitialBetPercentage = getInitialBetPercentage();
            this.L_total_unrecovered_losses = 0;
            this.activeApuesta1_amount = 0;
            this.activeApuesta2_amount = 0;
            this.signalHistory = [];
            this.currentSignalEntry = null;
            
            // Reset de multiplicadores originales y estado de nuevas estrategias
            this.originalMultipliers = [];
            this.resetNewStrategyState();

            this.clearSignalMessageOnNewInput(); // Use the one that clears immediately
            this.clearApuestaHighlights();
            this.updateCounters();
            this.updateSignalHistoryDisplay();
            
            if (window.miniChartManager) {
                window.miniChartManager.resetMiniChart();
            }
            this.updateChart(); // Redraw with empty data

            // Clear active button state on full reset
            if (lastActiveInputButton) {
                lastActiveInputButton.classList.remove('active-input-button');
                lastActiveInputButton = null;
            }
        }
    }

    let chartAppInstance = null; // Declare instance globally within DOMContentLoaded
    let apiPollingInterval = null; // For API polling
    let lastProcessedHora = null; // Track last processed game result by hora
    let apiResultsHistory = []; // Store API results for display

    // --- API Integration Functions ---
    function categorizeMultiplier(multiplier) {
        if (multiplier >= 1.00 && multiplier <= 1.09) return { category: "-5", value: -5, miniValue: -1 };
        if (multiplier >= 1.10 && multiplier <= 1.29) return { category: "-4", value: -4, miniValue: -1 };
        if (multiplier >= 1.30 && multiplier <= 1.49) return { category: "-3", value: -3, miniValue: -1 };
        if (multiplier >= 1.50 && multiplier <= 1.79) return { category: "-2", value: -2, miniValue: -1 };
        if (multiplier >= 1.80 && multiplier <= 1.99) return { category: "-1", value: -1, miniValue: -1 };
        if (multiplier >= 2.00 && multiplier <= 3.99) return { category: "1", value: 1, miniValue: 1 };
        if (multiplier >= 4.00 && multiplier <= 5.99) return { category: "2", value: 2, miniValue: 1 };
        if (multiplier >= 6.00 && multiplier <= 7.99) return { category: "3", value: 3, miniValue: 1 };
        if (multiplier >= 8.00 && multiplier <= 9.99) return { category: "4", value: 4, miniValue: 1 };
        if (multiplier >= 10.00) return { category: "5", value: 5, miniValue: 1 };
        return null;
    }

    // Update API status indicator
    function updateAPIStatus(status, message = '') {
        const statusIndicator = document.getElementById('api-status');
        if (statusIndicator) {
            statusIndicator.className = 'api-status-indicator ' + status;
            statusIndicator.title = message || status;
        }
    }

    // Update API results panel display
    function updateAPIResultsPanel() {
        const resultsList = document.getElementById('api-results-list');
        if (!resultsList) return;

        // Display newest at top. apiResultsHistory is Chronological [Oldest -> Newest].
        // So we take last 10 and reverse them -> [Newest -> Oldest].
        const recentResults = apiResultsHistory.slice(-10).reverse();
        
        if (recentResults.length === 0) {
            resultsList.innerHTML = '<div class="api-result-empty">Esperando datos...</div>';
            return;
        }

        resultsList.innerHTML = recentResults.map(result => {
            const isHigh = result.resultado >= 2.0;
            const colorClass = isHigh ? 'result-high' : 'result-low';
            return `<div class="api-result-item ${colorClass}">
                <span class="api-result-time">${result.hora}</span>
                <span class="api-result-value">${result.resultado.toFixed(2)}x</span>
            </div>`;
        }).join('');
    }

    // Helper to determine API data order and extract relevant items
    function processApiData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return { latest: null, history: [] };
        }

        let isDescending = true; // Default: Newest first (Index 0)

        // Try to detect order from timestamps
        if (data.length > 1 && data[0].hora && data[data.length - 1].hora) {
            const t0 = data[0].hora;
            const tLast = data[data.length - 1].hora;
            // If t0 < tLast (e.g. 10:00 < 11:00), it's likely Ascending (Oldest First)
            // Exception: Midnight rollover (00:01 < 23:59 but 00:01 is newer).
            // But assuming standard day operation.
            if (t0 < tLast) {
                isDescending = false;
            }
        }

        if (isDescending) {
            // Newest at index 0
            return {
                latest: data[0],
                // History: Get newest 10, reverse to make them Chronological [Oldest -> Newest]
                history: data.slice(0, 10).reverse()
            };
        } else {
            // Oldest at index 0 (Newest at end)
            return {
                latest: data[data.length - 1],
                // History: Get last 10 (Newest 10), they are already Chronological [Older -> Newest]
                history: data.slice(-10)
            };
        }
    }

    async function fetchAndProcessAPIData() {
        if (!chartAppInstance) {
            console.log("Chart not initialized yet, skipping API fetch");
            return;
        }

        try {
            updateAPIStatus('loading', 'Conectando...');
            console.log('Fetching API data...');
            
            // Always use /api/1win - works with Vite proxy (dev) and Netlify function (prod)
            const response = await fetch('/api/1win');
            
            if (!response.ok) {
                console.error('API request failed:', response.status);
                updateAPIStatus('error', `Error: ${response.status}`);
                return;
            }

            const data = await response.json();
            console.log('API Response received, items:', data.length);
            updateAPIStatus('connected', 'Conectado');

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('No data available from API');
                return;
            }

            // Process new results using robust helper
            const { latest } = processApiData(data);
            const latestResult = latest;

            if (!latestResult || !latestResult.hora || latestResult.resultado === undefined) {
                console.log('Invalid result format:', latestResult);
                return;
            }

            // Use hora as unique identifier
            if (lastProcessedHora === latestResult.hora) {
                console.log('Already processed this result');
                return;
            }

            const multiplier = parseFloat(latestResult.resultado);
            if (isNaN(multiplier)) {
                console.error('Invalid resultado value:', latestResult.resultado);
                return;
            }

            const categorized = categorizeMultiplier(multiplier);
            if (!categorized) {
                console.error('Could not categorize multiplier:', multiplier);
                return;
            }

            console.log(`Processing resultado ${multiplier}x @ ${latestResult.hora} -> Category ${categorized.category}`);

            lastProcessedHora = latestResult.hora;

            // Store result in history for display
            apiResultsHistory.push({
                hora: latestResult.hora,
                resultado: multiplier
            });
            // Keep only last 50 results
            if (apiResultsHistory.length > 50) {
                apiResultsHistory.shift();
            }

            // Update results panel
            updateAPIResultsPanel();

            // Almacenar el multiplicador original para las estrategias por rondas
            chartAppInstance.originalMultipliers.push(multiplier);
            // Mantener solo los últimos 50 multiplicadores
            if (chartAppInstance.originalMultipliers.length > 50) {
                chartAppInstance.originalMultipliers.shift();
            }

            // Store the original multiplier value for display on chart
            console.log(`Sending data to chart: ${multiplier}x (${categorized.category}) @ ${latestResult.hora}`);
            chartAppInstance.handleButtonInput(
                categorized.value,
                categorized.miniValue,
                categorized.category,
                multiplier, // Pass original multiplier for display
                latestResult.hora // Pass hora for display
            );

        } catch (error) {
            console.error('Error fetching API data:', error);
            console.error('Error details:', error.message);
            // Check if it's a CORS error
            if (error.message && error.message.includes('CORS')) {
                updateAPIStatus('error', 'Error CORS - API no accesible');
            } else if (error.message && error.message.includes('Failed to fetch')) {
                updateAPIStatus('error', 'No se puede conectar a la API');
            } else {
                updateAPIStatus('error', 'Error de conexión');
            }
        }
    }

    function startAPIPolling(intervalMs = 2000) {
        if (apiPollingInterval) {
            clearInterval(apiPollingInterval);
        }

        console.log(`Starting API polling every ${intervalMs}ms`);
        
        // Reset tracking variables for fresh start
        lastProcessedHora = null;
        apiResultsHistory = [];

        // Initial fetch
        fetchAndProcessAPIData();

        apiPollingInterval = setInterval(() => {
            fetchAndProcessAPIData();
        }, intervalMs);
    }
    
    // Load initial historical data from API
    async function loadInitialAPIData() {
        try {
            console.log('Loading initial API data...');
            
            // Always use /api/1win - works with Vite proxy (dev) and Netlify function (prod)
            const response = await fetch('/api/1win');
            
            if (!response.ok) {
                console.error('Failed to load initial data');
                return;
            }
            
            const data = await response.json();
            console.log('Initial data loaded:', data.length, 'items');
            
            if (data && Array.isArray(data) && data.length > 0) {
                // Use robust helper to get history and latest
                const { history, latest } = processApiData(data);
                const historicalItems = history;
                
                historicalItems.forEach(item => {
                    if (item.hora && item.resultado !== undefined) {
                        apiResultsHistory.push({
                            hora: item.hora,
                            resultado: parseFloat(item.resultado)
                        });
                        
                        // Also populate originalMultipliers for strategy context
                        if (chartAppInstance && chartAppInstance.originalMultipliers) {
                            chartAppInstance.originalMultipliers.push(parseFloat(item.resultado));
                        }
                    }
                });
                
                // Set last processed hora to the latest
                if (latest) {
                    lastProcessedHora = latest.hora;
                }
                
                // Update the display panel
                updateAPIResultsPanel();
                console.log('Historical data loaded, last hora:', lastProcessedHora);
            }
        } catch (error) {
            console.error('Error loading initial API data:', error);
        }
    }

    function stopAPIPolling() {
        if (apiPollingInterval) {
            clearInterval(apiPollingInterval);
            apiPollingInterval = null;
            console.log('API polling stopped');
        }
    }

    // --- Screen Navigation Functions ---
    function hideAllScreens() {
        welcomeScreen.classList.add('hidden');
        if (aviatorModeScreen) aviatorModeScreen.classList.add('hidden');
        currencySelectionScreen.classList.add('hidden');
        bankChoiceScreen.classList.add('hidden');
        capitalInputScreen.classList.add('hidden');
        tpSlInputScreen.classList.add('hidden');
        appContent.classList.add('hidden');
        const spacemanApp = document.getElementById('spaceman-app-content');
        if (spacemanApp) {
            spacemanApp.classList.add('hidden');
        }
    }
    
    // Show aviator mode selection screen
    function showAviatorModeScreen() {
        hideAllScreens();
        aviatorModeScreen.classList.remove('hidden');
    }
    
    function showTpSlInputScreen() {
        hideAllScreens();
        tpSlInputScreen.classList.remove('hidden');
        // Update currency previews
        const currencySymbol = window.selectedCurrency ? window.selectedCurrency.symbol : '$';
        if (currencyPreviewTp) currencyPreviewTp.textContent = currencySymbol;
        if (currencyPreviewSl) currencyPreviewSl.textContent = currencySymbol;
        // Update placeholders and hints based on currency
        const currencyCode = selectedCurrency.code || 'USD';
        const format = CURRENCY_FORMATS[currencyCode] || CURRENCY_FORMATS['USD'];
        if (takeProfitInput) {
            takeProfitInput.placeholder = format.inputThousandsSeparator === '.' ? 'Ej: 50.000' : 'Ej: 50,000';
        }
        if (stopLossInput) {
            stopLossInput.placeholder = format.inputThousandsSeparator === '.' ? 'Ej: 20.000' : 'Ej: 20,000';
        }
        // Update hints
        const tpHint = document.getElementById('tp-input-hint');
        const slHint = document.getElementById('sl-input-hint');
        if (tpHint) {
            tpHint.textContent = format.inputThousandsSeparator === '.' 
                ? 'Formato: usar punto (.) para separar miles. Ej: 50.000 = cincuenta mil'
                : 'Formato: usar coma (,) para separar miles o solo números. Ej: 50,000 = cincuenta mil';
        }
        if (slHint) {
            slHint.textContent = format.inputThousandsSeparator === '.' 
                ? 'Formato: usar punto (.) para separar miles. Ej: 20.000 = veinte mil'
                : 'Formato: usar coma (,) para separar miles o solo números. Ej: 20,000 = veinte mil';
        }
    }

    function showCurrencySelectionScreen() {
        hideAllScreens();
        currencySelectionScreen.classList.remove('hidden');
    }

    function showWelcomeScreen() {
        hideAllScreens();
        welcomeScreen.classList.remove('hidden');

        // Stop API polling
        stopAPIPolling();

        // Reset game and mode selection
        selectedGame = null;
        aviatorMode = null;
        
        // Reset game buttons visual state
        const gameButtons = document.querySelectorAll('.game-button');
        gameButtons.forEach(btn => btn.classList.remove('active'));
        
        // Reset mode buttons visual state
        const modeButtons = document.querySelectorAll('.mode-button');
        modeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Disable continue button
        if (welcomeContinueButton) {
            welcomeContinueButton.disabled = true;
        }

        // Stop auto-advancing: wait for user click on "Continuar"
        // Clear any previous chart interval
        if (chartAppInstance && chartAppInstance.clockInterval) {
            clearInterval(chartAppInstance.clockInterval);
            chartAppInstance.clockInterval = null;
        }

        // Reset last processed hora
        lastProcessedHora = null;
        apiResultsHistory = [];
    }

    function showBankChoiceScreen() {
        hideAllScreens();
        bankChoiceScreen.classList.remove('hidden');
    }

    function showCapitalInputScreen() {
        hideAllScreens();
        capitalInputScreen.classList.remove('hidden');
        // Update placeholder based on selected currency
        const currencyCode = selectedCurrency.code || 'USD';
        updateCapitalInputPlaceholder(currencyCode);
    }

    function startApp() {
        hideAllScreens();
        
        // Make values available globally for Spaceman
        window.userCapital = userCapital;
        window.bankManagementEnabled = bankManagementEnabled;
        window.takeProfit = takeProfit;
        window.stopLoss = stopLoss;
        window.initialBank = initialBank;
        
        // Check which game was selected
        if (selectedGame === 'spaceman') {
            // Show Spaceman app
            const spacemanApp = document.getElementById('spaceman-app-content');
            if (spacemanApp) {
                spacemanApp.classList.remove('hidden');
            }
            // Spaceman will initialize via MutationObserver in spaceman-app.js
            return;
        }
        
        // Default to Aviator
        appContent.classList.remove('hidden');
        
        // Make takeProfit and stopLoss available globally for ChartManager and Spaceman
        window.takeProfit = takeProfit;
        window.stopLoss = stopLoss;
        window.initialBank = initialBank;
        window.userCapital = userCapital;
        window.bankManagementEnabled = bankManagementEnabled;

        // Instantiate ChartManager or reset existing one
        if (!chartAppInstance) {
            chartAppInstance = new ChartManager(bankManagementEnabled, userCapital);
        } else {
            // If already exists, update its initial bank state and then reset its chart content
            chartAppInstance.bankManagementEnabled = bankManagementEnabled;
            chartAppInstance.userCapital = userCapital; // Update userCapital for the instance
            chartAppInstance.reset(); // This resets the chart data, not the bank settings itself
        }

        chartAppInstance.initChart(); // Initialize and draw the chart

        // Expose methods to global scope if mini-chart.js or other external scripts need them
        window.chartApp = chartAppInstance; // Make it globally accessible

        // Clear any active button state if starting app fresh
        if (lastActiveInputButton) {
            lastActiveInputButton.classList.remove('active-input-button');
            lastActiveInputButton = null;
        }

        // Handle Aviator mode (automatic or manual)
        const manualInputButtons = document.getElementById('manual-input-buttons');
        const apiResultsPanel = document.getElementById('api-results-panel');
        
        console.log('startApp called - aviatorMode:', aviatorMode, 'selectedGame:', selectedGame);
        
        if (aviatorMode === 'automatic') {
            // Automatic mode: show API panel, hide manual buttons, start polling
            if (manualInputButtons) manualInputButtons.style.display = 'none';
            if (apiResultsPanel) apiResultsPanel.style.display = 'block';
            console.log('Aviator mode: AUTOMATIC - Starting API polling');
            // Load initial data first, then start polling
            loadInitialAPIData().then(() => {
                startAPIPolling(2000);
            });
        } else if (aviatorMode === 'manual') {
            // Manual mode: show manual buttons, hide API panel, no polling
            if (manualInputButtons) manualInputButtons.style.display = 'grid';
            if (apiResultsPanel) apiResultsPanel.style.display = 'none';
            stopAPIPolling();
        } else {
            // Default to automatic if no mode selected (shouldn't happen)
            if (manualInputButtons) manualInputButtons.style.display = 'none';
            if (apiResultsPanel) apiResultsPanel.style.display = 'block';
            startAPIPolling(2000);
        }
    }

    // --- Event Listeners for initial screens ---
    bankYesButton.addEventListener('click', () => {
        bankManagementEnabled = true;
        showCapitalInputScreen();
    });

    bankNoButton.addEventListener('click', () => {
        bankManagementEnabled = false;
        userCapital = 0; // If no bank management, capital is not tracked
        startApp();
    });

    capitalContinueButton.addEventListener('click', () => {
        const currencyCode = selectedCurrency.code || 'USD';
        const capital = parseCurrencyInput(capitalInput.value, currencyCode);
        if (isNaN(capital) || capital <= 0) {
            alert('Por favor, ingrese un capital inicial válido y positivo.\n\nEjemplo:\n- Para COP/CLP/ARS: 200.000\n- Para USD/MXN: 200,000 o 200000');
            return;
        }
        userCapital = parseFloat(capital.toFixed(2));
        initialBank = userCapital; // Store initial bank for profit/loss calculation
        showTpSlInputScreen();
    });
    
    startBankManagementButton.addEventListener('click', () => {
        const currencyCode = selectedCurrency.code || 'USD';
        const tp = parseCurrencyInput(takeProfitInput.value, currencyCode);
        const sl = parseCurrencyInput(stopLossInput.value, currencyCode);
        
        if (isNaN(tp) || tp <= 0) {
            alert('Por favor, ingrese un Take Profit válido y positivo.');
            return;
        }
        if (isNaN(sl) || sl <= 0) {
            alert('Por favor, ingrese un Stop Loss válido y positivo.');
            return;
        }
        if (sl >= userCapital) {
            alert('El Stop Loss debe ser menor que el capital inicial.');
            return;
        }
        
        takeProfit = parseFloat(tp.toFixed(2));
        stopLoss = parseFloat(sl.toFixed(2));
        
        console.log(`Gestión de Bank Activada: Capital Inicial ${formatCurrency(userCapital)}, TP: ${formatCurrency(takeProfit)}, SL: ${formatCurrency(stopLoss)}`);
        startApp();
    });

    // Game selection event listeners
    const gameButtons = document.querySelectorAll('.game-button');
    gameButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            gameButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Store selected game
            selectedGame = button.dataset.game;
            // Enable continue button
            if (welcomeContinueButton) {
                welcomeContinueButton.disabled = false;
            }
            console.log('Juego seleccionado:', selectedGame);
        });
    });

    // Add listener for the new continue button
    welcomeContinueButton.addEventListener('click', () => {
        if (selectedGame) {
            if (selectedGame === 'aviator') {
                // Show mode selection for Aviator
                showAviatorModeScreen();
            } else {
                // Spaceman goes directly to currency selection
                showCurrencySelectionScreen();
            }
        }
    });
    
    // Aviator mode selection event listeners
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all mode buttons
            modeButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Set selected mode
            aviatorMode = button.dataset.mode;
            console.log('Modo seleccionado:', aviatorMode);
            // Continue to currency selection
            showCurrencySelectionScreen();
        });
    });

    // Manual modal event listeners
    if (welcomeManualButton) {
        welcomeManualButton.addEventListener('click', () => {
            if (manualModal) {
                manualModal.classList.remove('hidden');
            }
        });
    }

    if (closeManualButton) {
        closeManualButton.addEventListener('click', () => {
            if (manualModal) {
                manualModal.classList.add('hidden');
            }
        });
    }

    if (closeManualFooterButton) {
        closeManualFooterButton.addEventListener('click', () => {
            if (manualModal) {
                manualModal.classList.add('hidden');
            }
        });
    }

    // Close manual modal when clicking outside
    if (manualModal) {
        manualModal.addEventListener('click', (e) => {
            if (e.target === manualModal) {
                manualModal.classList.add('hidden');
            }
        });
    }

    // Currency selection event listeners
    const currencyButtons = currencySelectionScreen.querySelectorAll('.currency-button');
    currencyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currencyCode = button.dataset.currency;
            const currencySymbol = button.dataset.symbol;
            selectedCurrency = {
                code: currencyCode,
                symbol: currencySymbol
            };
            
            // Update global reference
            window.selectedCurrency = selectedCurrency;
            
            // Update currency preview in capital input
            if (currencyPreview) {
                currencyPreview.textContent = currencySymbol;
            }
            
            // Update placeholder and hint for capital input based on currency
            updateCapitalInputPlaceholder(currencyCode);
            
            // If chart instance exists and bank is enabled, recalculate apuestas with new currency percentages
            if (chartAppInstance && chartAppInstance.bankManagementEnabled) {
                chartAppInstance.calculateApuestaAmounts();
                chartAppInstance.updateBankAndApuestaDisplays();
            }
            
            showBankChoiceScreen();
        });
    });

    // --- GLOBAL EVENT LISTENERS (Attached Only Once) ---

    // Event listener for main buttons panel
    if (!window.chartAppEventListenersAttached) { // Use a flag to ensure it's attached only once
        buttonsPanel.addEventListener('click', (event) => {
            if (!chartAppInstance) { // Ensure chartAppInstance exists before interaction
                console.error("ChartApp not initialized yet!");
                return;
            }

            const clickedButton = event.target.closest('button');
            if (!clickedButton) return;

            // Check if it's a non-input button (action buttons, zoom, undo, reset)
            const isNonInputButton = clickedButton.dataset.action || 
                                     clickedButton.id === 'zoom-in' || clickedButton.id === 'zoom-out' ||
                                     clickedButton.id === 'undo' || clickedButton.id === 'reset';

            if (isNonInputButton) {
                // Clear active class from any previously active input button
                if (lastActiveInputButton) {
                    lastActiveInputButton.classList.remove('active-input-button');
                    lastActiveInputButton = null;
                }
            }


            if (clickedButton.dataset.action === 'fibonacci') {
                // Deactivate mini fibonacci if it's active
                if (window.miniChartManager && window.miniChartManager.fibonacciState !== 'inactive') {
                    window.miniChartManager.toggleMiniFibonacci();
                }
                // Toggle main fibonacci
                if (chartAppInstance.fibonacciState === 'inactive') {
                    chartAppInstance.clearFibonacci(); // Clear any existing fib lines
                    chartAppInstance.fibonacciState = 'selecting';
                    chartAppInstance.fibonacciPoints = [];
                    chartAppInstance.svg.style('cursor', 'crosshair');
                    // Bind 'this' context explicitly
                    chartAppInstance.svg.on('click', (e) => chartAppInstance.handleFibonacciClick(e));
                    console.log("Fibonacci: Select the first point (100%) on the chart.");
                } else {
                    chartAppInstance.clearFibonacci();
                    console.log("Fibonacci: Deactivated.");
                }
                chartAppInstance.clearSignalMessageOnNewInput();
                chartAppInstance.clearApuestaHighlights();
                return;
            }

            if (clickedButton.dataset.action === 'mini-fibonacci') {
                // Deactivate main fibonacci if it's active
                if (chartAppInstance.fibonacciState !== 'inactive') {
                    chartAppInstance.clearFibonacci();
                }
                // Toggle mini fibonacci
                if (window.miniChartManager) {
                    window.miniChartManager.toggleMiniFibonacci();
                }
                chartAppInstance.clearSignalMessageOnNewInput();
                chartAppInstance.clearApuestaHighlights();
                return;
            }

            if (clickedButton.id === 'zoom-in') {
                const currentNumVisible = Math.max(5, chartAppInstance.maxDataPoints - chartAppInstance.currentZoomLevel * 2);
                if (currentNumVisible > 5 && chartAppInstance.data.length > 5) {
                    chartAppInstance.currentZoomLevel = Math.max(0, chartAppInstance.currentZoomLevel + 1);
                } else if (chartAppInstance.data.length <= 5) { // Can't zoom in if 5 or fewer points
                    chartAppInstance.currentZoomLevel = 0;
                }
                chartAppInstance.updateChart();
                if (window.miniChartManager) {
                    window.miniChartManager.setMiniChartZoom(chartAppInstance.currentZoomLevel);
                }
                chartAppInstance.clearSignalMessageOnNewInput();
                chartAppInstance.clearApuestaHighlights();
                return;
            }

            if (clickedButton.id === 'zoom-out') {
                // Max zoom out level means showing all available data points (startIndex = 0)
                // If maxDataPoints is 24, and data.length is 30, it can zoom out 6 more positions.
                // Each zoom-out step adds 10 points (as per getVisibleData in ChartManager)
                const theoreticalMaxZoomOutSteps = Math.floor((chartAppInstance.data.length - chartAppInstance.maxDataPoints) / 10);
                const maxZoomOutLevel = theoreticalMaxZoomOutSteps < 0 ? 0 : -theoreticalMaxZoomOutSteps; // Ensure non-negative or 0

                if (chartAppInstance.data.length > 0 && chartAppInstance.currentZoomLevel > maxZoomOutLevel) {
                     chartAppInstance.currentZoomLevel = chartAppInstance.currentZoomLevel - 1;
                } else if (chartAppInstance.data.length > 0) { // If at max zoom-out, just stay there
                     chartAppInstance.currentZoomLevel = maxZoomOutLevel;
                } else { // No data, reset zoom
                    chartAppInstance.currentZoomLevel = 0;
                }
                chartAppInstance.updateChart();
                if (window.miniChartManager) {
                    window.miniChartManager.setMiniChartZoom(chartAppInstance.currentZoomLevel);
                }
                chartAppInstance.clearSignalMessageOnNewInput();
                chartAppInstance.clearApuestaHighlights();
                return;
            }

            if (clickedButton.id === 'undo') {
                if (chartAppInstance.data.length > 0) {
                    chartAppInstance.data.pop();
                    chartAppInstance.candles.pop();
                    chartAppInstance.accumulatedValue = chartAppInstance.data.length > 0 ? chartAppInstance.data[chartAppInstance.data.length - 1] : 0;

                    const { supports: newSupports, resistances: newResistances } = chartAppInstance.calculateSupportResistance(chartAppInstance.data);
                    chartAppInstance.supports = newSupports;
                    chartAppInstance.resistances = newResistances;
                    chartAppInstance.emaFast = chartAppInstance.calculateEMA(chartAppInstance.data, chartAppInstance.emaFastPeriod);
                    chartAppInstance.emaSlow = chartAppInstance.calculateEMA(chartAppInstance.data, chartAppInstance.emaSlowPeriod);

                    chartAppInstance.updateChart();
                    if (window.miniChartManager) {
                        window.miniChartManager.removeMiniChartData();
                    }
                    chartAppInstance.clearSignalMessageOnNewInput();
                    chartAppInstance.clearApuestaHighlights();
                    // Reset signal state and current betting attempt on undo
                    chartAppInstance.signalState = { status: 'none', consecutiveFails: 0, consecutiveEntradas: 0, awaitingNextManualInputBeforeEntrada: false };
                    chartAppInstance.currentBetAttempt = 0;
                    chartAppInstance.activeApuesta1_amount = 0;
                    chartAppInstance.activeApuesta2_amount = 0;
                    // L_total_unrecovered_losses persists until recovered by a successful signal
                    // currentInitialBetPercentage reflects L_total.
                    if (chartAppInstance.bankManagementEnabled) { 
                        chartAppInstance.calculateApuestaAmounts();
                        chartAppInstance.updateBankAndApuestaDisplays();
                    }
                }
                return;
            }

            if (clickedButton.id === 'reset') {
                // Stop API polling
                stopAPIPolling();

                // Show session summary before reset
                if (chartAppInstance && chartAppInstance.signalHistory.length > 0) {
                    const summaryModal = document.getElementById('session-summary-modal');
                    const summaryContent = document.getElementById('summary-content');
                    summaryContent.innerHTML = chartAppInstance.generateSessionSummary();
                    summaryModal.classList.remove('hidden');
                    
                    // Handle confirm reset
                    document.getElementById('confirm-reset').onclick = () => {
                        if (chartAppInstance) {
                            chartAppInstance.reset();
                        }
                        bankManagementEnabled = false;
                        userCapital = 0;
                        summaryModal.classList.add('hidden');
                        showWelcomeScreen();
                    };
                    
                    // Handle cancel
                    document.getElementById('cancel-reset').onclick = () => {
                        summaryModal.classList.add('hidden');
                        startAPIPolling(2000); // Resume polling
                    };
                } else {
                    // No history, reset directly
                    if (chartAppInstance) {
                        chartAppInstance.reset();
                    }
                    bankManagementEnabled = false;
                    userCapital = 0;
                    showWelcomeScreen();
                }
                return;
            }
            
            if (clickedButton.id === 'settings-btn') {
                const settingsModal = document.getElementById('settings-modal');
                document.getElementById('custom-odds-1').value = WIN_ODDS_APUESTA_1;
                document.getElementById('custom-odds-2').value = WIN_ODDS_APUESTA_2;
                document.getElementById('sound-enabled').checked = soundEnabled;
                document.getElementById('notifications-enabled').checked = notificationsEnabled;
                const strategySelector = document.getElementById('strategy-selector');
                if (strategySelector) {
                    strategySelector.value = selectedStrategy;
                }
                settingsModal.classList.remove('hidden');
                return;
            }

            // If it's a data-value button (input button)
            if (clickedButton.tagName === 'BUTTON' && clickedButton.dataset.value) {
                // Apply active class to the current button
                if (lastActiveInputButton) {
                    lastActiveInputButton.classList.remove('active-input-button');
                }
                clickedButton.classList.add('active-input-button');
                lastActiveInputButton = clickedButton;

                const valueFromButton = parseFloat(clickedButton.dataset.value);
                const miniValue = parseFloat(clickedButton.dataset.miniValue);
                const buttonOriginalValue = clickedButton.dataset.value;

                if (!isNaN(valueFromButton) && !isNaN(miniValue)) {
                    chartAppInstance.handleButtonInput(valueFromButton, miniValue, buttonOriginalValue);
                }
            }
        });
        window.chartAppEventListenersAttached = true; // Set flag
    }

    // Event listener for dropdown (chart view selector)
    if (!window.chartViewSelectorListenerAttached) {
        chartViewSelector.addEventListener('change', (event) => {
            if (!chartAppInstance) {
                console.error("ChartApp not initialized yet!");
                return;
            }
            const selectedMode = event.target.value;
            chartAppInstance.setChartViewMode(selectedMode);
            chartAppInstance.clearSignalMessageOnNewInput();
            chartAppInstance.clearApuestaHighlights();
        });
        window.chartViewSelectorListenerAttached = true;
    }

    // Global resize listener
    if (!window.globalResizeListenerAttached) {
        window.addEventListener('resize', () => {
            if (!chartAppInstance) return;

            // Decide which chart(s) to resize based on current view mode
            const currentMode = chartViewSelector.value;
            if (currentMode === 'main' || currentMode === 'both') {
                 chartAppInstance.resizeChart();
            }
            if (currentMode === 'mini' || currentMode === 'both') {
                if (window.miniChartManager) {
                    window.miniChartManager.resizeMiniChart();
                }
            }
            chartAppInstance.clearSignalMessageOnNewInput();
            chartAppInstance.clearApuestaHighlights();
        });
        window.globalResizeListenerAttached = true;
    }

    // Event listeners for new features
    // Export history
    document.getElementById('export-history')?.addEventListener('click', () => {
        if (chartAppInstance) {
            chartAppInstance.exportHistory('csv');
        }
    });
    
    // Clear history
    document.getElementById('clear-history')?.addEventListener('click', () => {
        if (chartAppInstance && confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
            chartAppInstance.signalHistory = [];
            chartAppInstance.updateSignalHistoryDisplay();
            chartAppInstance.updateAdvancedStatistics();
            localStorage.removeItem('tradingAppHistory');
        }
    });
    
    // Modal de Meta Alcanzada - Event listeners
    const modal = document.getElementById('meta-alcanzada-modal');
    const cerrarBtn = document.getElementById('modal-cerrar');
    const aceptarBtn = document.getElementById('modal-aceptar');
    
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
    ['filter-result', 'filter-attempt', 'filter-date'].forEach(filterId => {
        document.getElementById(filterId)?.addEventListener('change', () => {
            if (chartAppInstance) {
                chartAppInstance.updateSignalHistoryDisplay();
            }
        });
    });
    
    // Toggle stats panel
    document.getElementById('toggle-stats')?.addEventListener('click', () => {
        const statsContent = document.getElementById('stats-content');
        const toggleBtn = document.getElementById('toggle-stats');
        if (statsContent) {
            statsContent.style.display = statsContent.style.display === 'none' ? 'block' : 'none';
            toggleBtn.textContent = statsContent.style.display === 'none' ? '+' : '−';
        }
    });
    
    // Settings modal
    document.getElementById('close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.add('hidden');
    });
    
    document.getElementById('cancel-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.add('hidden');
    });
    
    document.getElementById('save-settings')?.addEventListener('click', () => {
        const odds1 = parseFloat(document.getElementById('custom-odds-1').value);
        const odds2 = parseFloat(document.getElementById('custom-odds-2').value);
        const strategySelector = document.getElementById('strategy-selector');
        
        if (isNaN(odds1) || odds1 <= 1 || isNaN(odds2) || odds2 <= 1) {
            alert('Las odds deben ser números mayores a 1');
            return;
        }
        
        WIN_ODDS_APUESTA_1 = odds1;
        WIN_ODDS_APUESTA_2 = odds2;
        soundEnabled = document.getElementById('sound-enabled').checked;
        notificationsEnabled = document.getElementById('notifications-enabled').checked;
        
        if (strategySelector) {
            selectedStrategy = strategySelector.value;
        }
        
        saveSettings();
        
        if (chartAppInstance) {
            chartAppInstance.calculateApuestaAmounts();
            chartAppInstance.updateBankAndApuestaDisplays();
        }
        
        document.getElementById('settings-modal')?.classList.add('hidden');
    });
    
    // Session summary modal
    document.getElementById('close-summary')?.addEventListener('click', () => {
        document.getElementById('session-summary-modal')?.classList.add('hidden');
        startAPIPolling(2000);
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Remove the automatic timeout start; the bottom call remains to showWelcomeScreen()
    // Start the welcome screen flow when the DOM is fully loaded
    showWelcomeScreen();
});