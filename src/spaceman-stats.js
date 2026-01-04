// Spaceman Statistics and History Management

export class SpacemanStatsManager {
    constructor() {
        this.signalHistory = [];
        this.currentSignalEntry = null;
        this.userCapital = 0;
        this.initialBank = 0;
        this.bankManagementEnabled = false;
        this.sessionStats = {
            hits: 0,
            misses: 0
        };
        this.signalAttemptState = 0; // 0 = no attempt, 1 = first attempt failed
        this.loadHistoryFromLocalStorage();
    }

    initialize(userCapital, bankManagementEnabled, initialBank) {
        this.userCapital = userCapital;
        this.bankManagementEnabled = bankManagementEnabled;
        this.initialBank = initialBank || userCapital;
    }

    startSignal() {
        if (!this.bankManagementEnabled) return;
        
        // Reset state
        this.signalAttemptState = 0;
        
        const apuesta1Percentage = 0.01; // 1%
        const apuesta1Amount = this.userCapital * apuesta1Percentage;
        const apuesta2Amount = apuesta1Amount * 2;
        
        this.currentSignalEntry = {
            id: Date.now(),
            timestamp: Date.now(),
            apuesta1_amount: apuesta1Amount,
            apuesta2_amount: apuesta2Amount,
            bankBefore: this.userCapital,
            result: null,
            attempt: null,
            profitLoss: null,
            bankAfter: null
        };
    }

    recordWin(attempt) {
        if (!this.currentSignalEntry || !this.bankManagementEnabled) return;
        
        this.currentSignalEntry.result = 'win';
        this.currentSignalEntry.attempt = attempt;
        
        const apuestaAmount = attempt === 1 ? this.currentSignalEntry.apuesta1_amount : this.currentSignalEntry.apuesta2_amount;
        // Win = double the bet (profit = bet amount)
        const profit = apuestaAmount;
        
        this.currentSignalEntry.profitLoss = profit;
        this.userCapital += profit;
        this.currentSignalEntry.bankAfter = this.userCapital;
        
        this.signalHistory.push({ ...this.currentSignalEntry });
        this.sessionStats.hits++;
        this.saveHistoryToLocalStorage();
        this.currentSignalEntry = null;
        this.signalAttemptState = 0; // Reset state
    }

    recordLoss() {
        if (!this.currentSignalEntry || !this.bankManagementEnabled) return;
        
        this.currentSignalEntry.result = 'loss';
        this.currentSignalEntry.attempt = 2; // Only record loss after both attempts
        
        const totalLoss = this.currentSignalEntry.apuesta1_amount + this.currentSignalEntry.apuesta2_amount;
        this.currentSignalEntry.profitLoss = -totalLoss;
        this.userCapital -= totalLoss;
        this.currentSignalEntry.bankAfter = this.userCapital;
        
        this.signalHistory.push({ ...this.currentSignalEntry });
        this.sessionStats.misses++;
        this.saveHistoryToLocalStorage();
        this.currentSignalEntry = null;
        this.signalAttemptState = 0; // Reset state
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
        
        const initialCapital = this.initialBank || (this.signalHistory.length > 0 ? this.signalHistory[0].bankBefore : this.userCapital);
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

    checkTakeProfitStopLoss(takeProfit, stopLoss) {
        if (!this.bankManagementEnabled) return false;
        
        const currentProfit = this.userCapital - this.initialBank;
        const currentLoss = this.initialBank - this.userCapital;
        
        // Check stop loss first
        if (stopLoss > 0 && currentLoss >= stopLoss) {
            return { reached: true, isTakeProfit: false, value: currentLoss };
        }
        
        // Check take profit
        if (takeProfit > 0 && takeProfit !== Infinity && currentProfit >= takeProfit) {
            return { reached: true, isTakeProfit: true, value: currentProfit };
        }
        
        return { reached: false };
    }

    saveHistoryToLocalStorage() {
        try {
            const historyData = {
                history: this.signalHistory,
                timestamp: Date.now()
            };
            localStorage.setItem('spacemanAppHistory', JSON.stringify(historyData));
        } catch (e) {
            console.warn('Failed to save Spaceman history:', e);
        }
    }

    loadHistoryFromLocalStorage() {
        try {
            const saved = localStorage.getItem('spacemanAppHistory');
            if (saved) {
                const historyData = JSON.parse(saved);
                this.signalHistory = historyData.history || [];
            }
        } catch (e) {
            console.warn('Failed to load Spaceman history:', e);
        }
    }

    clearHistory() {
        this.signalHistory = [];
        this.sessionStats = { hits: 0, misses: 0 };
        this.saveHistoryToLocalStorage();
    }

    exportHistory(format = 'csv') {
        if (this.signalHistory.length === 0) {
            alert('No hay historial para exportar');
            return;
        }

        const selectedCurrency = window.selectedCurrency || { code: 'USD', symbol: '$' };
        const formatCurrency = window.formatCurrency || ((amount) => `${selectedCurrency.symbol}${amount.toFixed(2)}`);
        
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
            link.setAttribute('download', `historial_spaceman_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    getHistory() {
        return this.signalHistory;
    }

    updateUserCapital(newCapital) {
        this.userCapital = newCapital;
    }

    getCurrentCapital() {
        return this.userCapital;
    }
    
    getCurrentSignalEntry() {
        return this.currentSignalEntry;
    }
    
    hasActiveSignal() {
        return this.currentSignalEntry !== null;
    }
}
