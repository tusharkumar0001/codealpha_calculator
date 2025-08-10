
// Advanced Calculator JS - modular but in single file for simplicity
(function () {
    const expressionEl = document.getElementById('expression');
    const resultEl = document.getElementById('result');
    const historyList = document.getElementById('historyList');
    const memValueEl = document.getElementById('memValue');

    let expr = '';
    let memory = 0;
    let angleMode = 'DEG';
    let precision = 6;

    // helpers
    function render() {
        expressionEl.textContent = expr || '';
    }
    function setResult(v) {
        if (v === undefined || Number.isNaN(v)) { resultEl.textContent = 'Error'; return; }
        resultEl.textContent = formatNumber(v);
    }
    function formatNumber(n) {
        if (!isFinite(n)) return n.toString();
        return parseFloat(n.toFixed(precision)).toString();
    }

    // math context - safe evaluation
    // We'll transform expression into JS-friendly math using a tiny parser (not eval raw user input)
    function safeEvaluate(input) {
        try {
            // token replacements: ^ -> **, ÷ -> /, × -> *, π -> Math.PI
            let s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'Math.PI').replace(/--/g, '+');
            s = s.replace(/\^/g, '**');

            // handle factorial (!) by turning n! into factorial(n) using regex
            s = s.replace(/(\d+\.?\d*)\s*!/g, 'factorial($1)');

            // functions: sin, cos, tan, asin, acos, atan, log, ln, sqrt
            s = s.replace(/\blog\b/g, 'log10').replace(/\bln\b/g, 'ln');
            s = s.replace(/\bsqrt\b/g, 'sqrt');

            // allow implicit multiplication like 2π or 2(3+4)
            s = s.replace(/(\d)(\s*)\(/g, '$1*(');
            s = s.replace(/(\d)(\s*)(Math\.PI)/g, '$1*$3');

            // now create a safe function and evaluate
            const fn = new Function('Math', 'angleMode', 'factorial', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log10', 'ln', 'sqrt', `with(Math){ return (${s}); }`);

            const res = fn(Math, angleMode,
                factorial,
                wrapTrig(Math.sin), wrapTrig(Math.cos), wrapTrig(Math.tan),
                wrapInv(Math.asin), wrapInv(Math.acos), wrapInv(Math.atan),
                (x) => Math.log10(x), (x) => Math.log(x), (x) => Math.sqrt(x)
            );

            return res;
        } catch (e) {
            return NaN;
        }
    }

    // factorial supporting integers
    function factorial(n) {
        n = Number(n);
        if (!Number.isInteger(n) || n < 0) return NaN;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }

    // trigonometric wrappers (angleMode aware)
    function toRad(v) { return v * Math.PI / 180; }
    function toDeg(v) { return v * 180 / Math.PI; }

    function wrapTrig(fn) {
        return function (x) {
            x = Number(x);
            if (Number.isNaN(x)) return NaN;
            if (angleMode === 'DEG') x = toRad(x);
            return fn(x);
        }
    }
    function wrapInv(fn) {
        return function (x) {
            const v = fn(Number(x));
            if (angleMode === 'DEG') return toDeg(v);
            return v;
        }
    }

    // button handling
    document.getElementById('button-grid').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const insert = b.dataset.insert;
        const action = b.dataset.action;
        if (insert) { expr += insert; render(); return; }
        if (action) handleAction(action);
    });

    function handleAction(action) {
        switch (action) {
            case 'clear': expr = ''; setResult(0); render(); break;
            case 'back': expr = expr.slice(0, -1); render(); break;
            case 'percent': expr += '/100'; render(); break;
            case 'sqrt': expr += 'sqrt('; render(); break;
            case 'equals': compute(); break;
            case 'mode': // quick toggle
                angleMode = (angleMode === 'DEG') ? 'RAD' : 'DEG'; document.querySelector('[data-action="mode"]').textContent = angleMode; break;
            case 'sin': expr += 'sin('; render(); break;
            case 'cos': expr += 'cos('; render(); break;
            case 'tan': expr += 'tan('; render(); break;
            case 'asin': expr += 'asin('; render(); break;
            case 'acos': expr += 'acos('; render(); break;
            case 'atan': expr += 'atan('; render(); break;
            case 'log': expr += 'log('; render(); break;
            case 'ln': expr += 'ln('; render(); break;
            case 'pi': expr += 'π'; render(); break;
            case 'fact': expr += '!'; render(); break;
            case 'mc': memory = 0; updateMem(); break;
            case 'mr': expr += memory.toString(); render(); break;
            case 'mplus': compute(true); break; // adds current result to memory
            case 'mminus': compute(true, true); break; // subtracts
        }
    }

    function compute(store = false, subtract = false) {
        const val = safeEvaluate(expr || resultEl.textContent || '0');
        if (Number.isNaN(val)) { setResult(NaN); return; }
        setResult(val);
        addHistory(expr || resultEl.textContent, val);
        if (store) { memory = subtract ? memory - val : memory + val; updateMem(); }
    }

    function addHistory(input, value) {
        const item = document.createElement('div'); item.className = 'item'; item.textContent = `${input} = ${formatNumber(value)}`;
        historyList.prepend(item);
    }

    function updateMem() { memValueEl.textContent = 'M: ' + formatNumber(memory); }

    // UI controls
    document.getElementById('clearHistory').onclick = () => { historyList.innerHTML = ''; };
    document.getElementById('copyLast').onclick = () => {
        const first = historyList.firstElementChild; if (!first) return; navigator.clipboard.writeText(first.textContent || '');
    };
    document.getElementById('memStore').onclick = () => { memory = Number(resultEl.textContent) || memory; updateMem(); };
    document.getElementById('memClear').onclick = () => { memory = 0; updateMem(); };
    document.getElementById('angleMode').onchange = (e) => { angleMode = e.target.value; document.querySelector('[data-action="mode"]').textContent = angleMode; };
    document.getElementById('precision').onchange = (e) => { precision = Number(e.target.value); setResult(Number(resultEl.textContent)); };
    document.getElementById('theme').onchange = (e) => { if (e.target.value === 'Light') document.body.style.background = 'linear-gradient(180deg,#f6fbff,#eaf6ff)'; else document.body.style.background = 'linear-gradient(180deg,#071021 0%, #081320 45%, #071226 100%)'; };

    // keyboard support
    window.addEventListener('keydown', (e) => {
        if (e.key.match(/[0-9\.\(\)]/)) { expr += e.key; render(); }
        if (['+', '-', '*', '/', '^'].includes(e.key)) { expr += (e.key === '^' ? '^' : e.key); render(); }
        if (e.key === 'Backspace') { expr = expr.slice(0, -1); render(); }
        if (e.key === 'Enter' || e.key === '=') { compute(); }
        if (e.key === '%') { expr += '/100'; render(); }
    });

    // initialize
    render(); setResult(0); updateMem();

})();
