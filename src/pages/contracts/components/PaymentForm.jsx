import { useState, useEffect, useRef } from 'react';

// Format number with spaces (1 000 000)
const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const n = Math.floor(Number(num));
    if (isNaN(n)) return '';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Parse formatted number back to integer
const parseFormattedNumber = (str) => {
    if (!str) return 0;
    return Math.floor(Number(String(str).replace(/\s/g, ''))) || 0;
};

// Calculate total price precisely (no floats)
const calculateTotalPrice = (area, pricePerM2) => {
    const areaNum = parseFloat(area) || 0;
    const priceNum = Math.floor(Number(pricePerM2)) || 0;
    return Math.floor(areaNum * priceNum);
};

const PaymentForm = ({ formData, homeData, onChange, isEditMode = false }) => {
    const squareMeter = parseFloat(homeData?.square_meter) || 0;

    // Local state for display values (formatted)
    const [displayPriceM2, setDisplayPriceM2] = useState('');
    const [displayTotal, setDisplayTotal] = useState('');
    const [displayInitial, setDisplayInitial] = useState('');
    const [displayPercent, setDisplayPercent] = useState('');
    const [initialPaymentMode, setInitialPaymentMode] = useState('amount'); // 'amount' or 'percent'
    const [isPriceEditable, setIsPriceEditable] = useState(false);
    const [isCustomDate, setIsCustomDate] = useState(false);

    // Track which fields have been touched
    const [touched, setTouched] = useState({});

    // Flags to prevent circular updates
    const isUpdatingFromM2 = useRef(false);
    const isUpdatingFromTotal = useRef(false);

    const markTouched = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    // Initialize values when homeData changes
    useEffect(() => {
        if (homeData) {
            // If in Edit mode and it's the same home as contract, 
            // initialize from formData instead of homeData defaults
            if (isEditMode && formData.price_per_meter > 0) {
                setDisplayPriceM2(formatNumber(formData.price_per_meter));
                // Recalculate total if not provided, or use provided
                const total = formData.total_price || calculateTotalPrice(squareMeter, formData.price_per_meter);
                setDisplayTotal(formatNumber(total));
                onChange('total_price', total);
                if (formData.initial_payment !== undefined) {
                    setDisplayInitial(formatNumber(formData.initial_payment));
                    // Calculate and set percentage
                    if (total > 0) {
                        const percent = ((formData.initial_payment / total) * 100).toFixed(1);
                        setDisplayPercent(percent.endsWith('.0') ? percent.slice(0, -2) : percent);
                    }
                }
            } else {
                // New contract or different home selected
                const price = Math.floor(homeData.price) || 0;
                const total = calculateTotalPrice(homeData.square_meter, price);

                setDisplayPriceM2(formatNumber(price));
                setDisplayTotal(formatNumber(total));
                setDisplayInitial(''); // Reset initial for new home
                setDisplayPercent('');
                setInitialPaymentMode('amount');
                onChange('price_per_meter', price);
                onChange('total_price', total);
            }
            setIsPriceEditable(false);
            setTouched({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homeData?.id, isEditMode]);

    // Get error only if field was touched
    const getError = (field) => {
        if (!touched[field]) return null;

        const total = parseFormattedNumber(displayTotal);
        const initial = parseFormattedNumber(displayInitial);
        const months = parseInt(formData.term_months) || 0;

        if (field === 'term_months') {
            if (months > 120) return "Maksimum 120 oy";
            const initial = parseFormattedNumber(displayInitial);
            const total = parseFormattedNumber(displayTotal);
            if (initial < total && months < 1) return "Kamida 1 oy";
        }
        if (field === 'initial_payment' && initial > total && total > 0) {
            return "Umumiy summadan oshib ketdi";
        }
        return null;
    };

    // Handle m² price change -> recalculate total
    const handlePriceM2Change = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseFormattedNumber(rawValue);

        setDisplayPriceM2(formatNumber(numValue));

        if (!isUpdatingFromTotal.current && squareMeter > 0) {
            isUpdatingFromM2.current = true;
            const newTotal = calculateTotalPrice(squareMeter, numValue);
            setDisplayTotal(formatNumber(newTotal));
            onChange('price_per_meter', numValue);
            onChange('total_price', newTotal);

            // Agar yangi umumiy summa boshlang'ich to'lovdan kam bo'lsa, boshlang'ich to'lovni nolga tushirish
            const currentInitial = parseFormattedNumber(displayInitial);

            if (initialPaymentMode === 'percent') {
                const percent = parseFloat(displayPercent) || 0;
                const newInitial = Math.floor((newTotal * percent) / 100);
                setDisplayInitial(formatNumber(newInitial));
                onChange('initial_payment', newInitial);
            } else {
                if (currentInitial > newTotal) {
                    setDisplayInitial('');
                    setDisplayPercent('');
                    onChange('initial_payment', 0);
                } else if (newTotal > 0) {
                    const percent = ((currentInitial / newTotal) * 100).toFixed(1);
                    setDisplayPercent(percent.endsWith('.0') ? percent.slice(0, -2) : percent);
                }
            }

            isUpdatingFromM2.current = false;
        }
    };

    // Handle total price change -> recalculate m²
    const handleTotalChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseFormattedNumber(rawValue);

        setDisplayTotal(formatNumber(numValue));
        onChange('total_price', numValue);

        if (!isUpdatingFromM2.current && squareMeter > 0) {
            isUpdatingFromTotal.current = true;
            const newPriceM2 = Math.floor(numValue / squareMeter);
            setDisplayPriceM2(formatNumber(newPriceM2));
            onChange('price_per_meter', newPriceM2);

            // Agar yangi umumiy summa boshlang'ich to'lovdan kam bo'lsa, boshlang'ich to'lovni nolga tushirish
            const currentInitial = parseFormattedNumber(displayInitial);

            if (initialPaymentMode === 'percent') {
                const percent = parseFloat(displayPercent) || 0;
                const newInitial = Math.floor((numValue * percent) / 100);
                setDisplayInitial(formatNumber(newInitial));
                onChange('initial_payment', newInitial);
            } else {
                if (currentInitial > numValue) {
                    setDisplayInitial('');
                    setDisplayPercent('');
                    onChange('initial_payment', 0);
                } else if (numValue > 0) {
                    const percent = ((currentInitial / numValue) * 100).toFixed(1);
                    setDisplayPercent(percent.endsWith('.0') ? percent.slice(0, -2) : percent);
                }
            }

            isUpdatingFromTotal.current = false;
        }
    };

    // Handle initial payment change (amount mode)
    const handleInitialChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseFormattedNumber(rawValue);
        setDisplayInitial(formatNumber(numValue));
        onChange('initial_payment', numValue);

        // Update percent
        const total = parseFormattedNumber(displayTotal);
        if (total > 0) {
            const percent = ((numValue / total) * 100).toFixed(1);
            setDisplayPercent(percent.endsWith('.0') ? percent.slice(0, -2) : percent);
        }
    };

    // Handle percentage change
    const handlePercentChange = (e) => {
        let val = e.target.value.replace(/[^\d.]/g, '');
        // Allow only one decimal point
        const dots = val.split('.').length - 1;
        if (dots > 1) {
            val = val.substring(0, val.lastIndexOf('.'));
        }

        const numPercent = parseFloat(val) || 0;
        if (numPercent > 100) return;

        setDisplayPercent(val);

        const total = parseFormattedNumber(displayTotal);
        const numInitial = Math.floor((total * numPercent) / 100);
        setDisplayInitial(formatNumber(numInitial));
        onChange('initial_payment', numInitial);
    };

    // Toggle initial payment mode
    const toggleInitialMode = (mode) => {
        setInitialPaymentMode(mode);
    };

    // Handle term months change
    const handleTermChange = (e) => {
        const val = e.target.value;
        onChange('term_months', val);
    };

    // Handle backdated contract date change with auto-formatting (DD.MM.YYYY)
    const handleDateChange = (e) => {
        let val = e.target.value.replace(/[^\d]/g, ''); // Facat raqamlar
        if (val.length > 8) val = val.substring(0, 8);

        let formattedDate = val;
        if (val.length >= 2) {
            formattedDate = val.substring(0, 2) + '.' + val.substring(2);
        }
        if (val.length >= 4) {
            formattedDate = val.substring(0, 2) + '.' + val.substring(2, 4) + '.' + val.substring(4);
        }

        onChange('contract_date', formattedDate);
    };

    const toggleCustomDate = (value) => {
        setIsCustomDate(value);
        if (!value) {
            onChange('contract_date', '');
        }
    };

    // Calculate derived values
    const totalPrice = parseFormattedNumber(displayTotal);
    const initialPayment = parseFormattedNumber(displayInitial);
    const termMonths = parseInt(formData.term_months) || 0;
    const remainingAmount = Math.max(0, totalPrice - initialPayment);
    const monthlyPayment = termMonths > 0 ? Math.floor(remainingAmount / termMonths) : 0;

    // Update parent with monthly payment and initial load sync
    useEffect(() => {
        setTimeout(() => {
            onChange('monthly_payment', monthlyPayment);
            // Also ensure total_price is synced if it was initialized
            if (totalPrice > 0) {
                onChange('total_price', totalPrice);
            }
        }, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthlyPayment, totalPrice]);

    // Toggle price edit mode
    const togglePriceEdit = () => {
        setIsPriceEditable(!isPriceEditable);
    };

    const termError = getError('term_months');
    const initialError = getError('initial_payment');

    return (
        <div className="card-section">
            <div className="section-header">
                <div className="icon-box bg-warning-subtle">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                </div>
                <h3>To'lov ma'lumotlari</h3>
            </div>

            <div className="form-grid">
                {/* Rooms count - readonly */}
                <div className="form-group">
                    <label>Xonalar soni</label>
                    <input
                        type="text"
                        className="form-control"
                        value={homeData?.rooms || ''}
                        disabled
                    />
                    <small className="input-hint">Xonadondagi xonalar soni</small>
                </div>

                {/* Square meter - readonly */}
                <div className="form-group">
                    <label>Maydoni (m²)</label>
                    <input
                        type="text"
                        className="form-control"
                        value={squareMeter}
                        disabled
                    />
                    <small className="input-hint">Xonadon umumiy maydoni</small>
                </div>

                {/* Price per m² - editable with button */}
                <div className="form-group">
                    <label>1 m² narxi <span className="text-danger">*</span></label>
                    <div className="input-with-edit">
                        <input
                            type="text"
                            className="form-control"
                            value={displayPriceM2}
                            onChange={handlePriceM2Change}
                            disabled={!isPriceEditable}
                            placeholder="0"
                        />
                        <button
                            type="button"
                            className={`edit-btn ${isPriceEditable ? 'active' : ''}`}
                            onClick={togglePriceEdit}
                            title={isPriceEditable ? "Tahrirlash off" : "Narxni o'zgartirish"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                    <small className="input-hint">Kelishilgan narx uchun tahrirlash tugmasini bosing</small>
                </div>

                {/* Total price - always editable */}
                <div className="form-group">
                    <label>Umumiy narx <span className="text-danger">*</span></label>
                    <div className="input-with-suffix">
                        <input
                            type="text"
                            className="form-control"
                            value={displayTotal}
                            onChange={handleTotalChange}
                            placeholder="0"
                        />
                        <span className="suffix">so'm</span>
                    </div>
                    <small className="input-hint">Xonadon uchun umumiy to'lov summasi</small>
                </div>

                {/* Payment term (months) */}
                <div className="form-group">
                    <label>To'lov muddati (oy) <span className="text-danger">*</span></label>
                    <input
                        type="number"
                        className={`form-control ${termError ? 'error' : ''}`}
                        placeholder="Masalan: 24"
                        min="0"
                        max="120"
                        value={formData.term_months || ''}
                        onChange={handleTermChange}
                        onBlur={() => markTouched('term_months')}
                    />
                    <small className="input-hint">Necha oy ichida to'lanadi (0-120)</small>
                    {termError && <small className="error-text">{termError}</small>}
                </div>

                {/* Payment day */}
                <div className="form-group">
                    <label>To'lov sanasi (kun) <span className="text-danger">*</span></label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="1-30"
                        min="1"
                        max="30"
                        value={formData.payment_day || ''}
                        onChange={(e) => onChange('payment_day', e.target.value)}
                    />
                    <small className="input-hint">Har oyning qaysi kunida to'lanadi</small>
                </div>

                {/* Initial payment */}
                <div className="form-group">
                    <div className="label-with-toggle">
                        <label>Boshlang'ich to'lov <span className="text-danger">*</span></label>
                        <div className="mode-toggle">
                            <button
                                type="button"
                                className={`toggle-item ${initialPaymentMode === 'amount' ? 'active' : ''}`}
                                onClick={() => toggleInitialMode('amount')}
                            >
                                So'm
                            </button>
                            <button
                                type="button"
                                className={`toggle-item ${initialPaymentMode === 'percent' ? 'active' : ''}`}
                                onClick={() => toggleInitialMode('percent')}
                            >
                                %
                            </button>
                        </div>
                    </div>
                    <div className="input-with-suffix">
                        {initialPaymentMode === 'amount' ? (
                            <input
                                type="text"
                                className={`form-control ${initialError ? 'error' : ''}`}
                                value={displayInitial}
                                onChange={handleInitialChange}
                                onBlur={() => markTouched('initial_payment')}
                                placeholder="0"
                            />
                        ) : (
                            <input
                                type="text"
                                className={`form-control ${initialError ? 'error' : ''}`}
                                value={displayPercent}
                                onChange={handlePercentChange}
                                onBlur={() => markTouched('initial_payment')}
                                placeholder="0"
                            />
                        )}
                        <span className="suffix">
                            {initialPaymentMode === 'amount' ? "so'm" : "%"}
                        </span>
                    </div>
                    <small className="input-hint">
                        {initialPaymentMode === 'amount'
                            ? "Dastlabki oldindan to'lanadigan summa"
                            : `Umumiy summaning foizdagi ulushi`
                        }
                    </small>
                    <small className="input-hint secondary">
                        {initialPaymentMode === 'amount'
                            ? `Jami summaning ${displayPercent || 0}% qismi`
                            : `Summa: ${displayInitial || 0} so'm`
                        }
                    </small>
                    {initialError && <small className="error-text">{initialError}</small>}
                </div>

                {/* Status */}
                <div className="form-group">
                    <label>Holat <span className="text-danger">*</span></label>
                    <select
                        className="form-select"
                        value={formData.status || 'pending'}
                        onChange={(e) => onChange('status', e.target.value)}
                    >
                        <option value="pending">Rasmiylashtirilmoqda</option>
                        <option value="active">Rasmiylashtirilgan</option>
                        <option value="paid">To'liq to'langan</option>
                        <option value="completed">Tugallangan</option>
                        {isEditMode && (
                            <option value="cancelled">Bekor qilingan</option>
                        )}
                    </select>
                    <small className="input-hint">
                        {formData.status === 'paid' || formData.status === 'completed'
                            ? "Shartnoma to'liq to'landi deb belgilanadi"
                            : formData.status === 'cancelled'
                                ? "Uy bo'shatiladi va qayta sotib olish mumkin"
                                : "Shartnoma hozirgi holati"
                        }
                    </small>
                </div>

                {/* Backdated Date Toggle */}
                {!isEditMode && (
                    <div className="form-group">
                        <div className="label-with-toggle">
                            <label>Sana belgilash kerakmi?</label>
                            <div className="mode-toggle">
                                <button
                                    type="button"
                                    className={`toggle-item ${isCustomDate ? 'active' : ''}`}
                                    onClick={() => toggleCustomDate(true)}
                                >
                                    Ha
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-item ${!isCustomDate ? 'active' : ''}`}
                                    onClick={() => toggleCustomDate(false)}
                                >
                                    Yo'q
                                </button>
                            </div>
                        </div>
                        {isCustomDate ? (
                            <div className="input-container">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="DD.MM.YYYY (masalan: 12122020)"
                                    value={formData.contract_date || ''}
                                    onChange={handleDateChange}
                                    maxLength="10"
                                />
                                <small className="input-hint">Shartnoma yaratilgan sana (format: 12.12.2020)</small>
                            </div>
                        ) : (
                            <input
                                type="text"
                                className="form-control"
                                value="Real vaqt rejimi (Hozir)"
                                disabled
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Payment Summary */}
            <div className="payment-summary">
                <div className="summary-row">
                    <span className="label">Umumiy narx:</span>
                    <span className="value">{formatNumber(totalPrice)} so'm</span>
                </div>
                <div className="summary-row">
                    <span className="label">Boshlang'ich to'lov:</span>
                    <span className="value">{formatNumber(initialPayment)} so'm</span>
                </div>
                <div className="summary-row">
                    <span className="label">Qoldiq summa:</span>
                    <span className="value">{formatNumber(remainingAmount)} so'm</span>
                </div>
                <div className="summary-row highlight">
                    <span className="label">Oylik to'lov:</span>
                    <span className="value">{formatNumber(monthlyPayment)} so'm</span>
                </div>
                {termMonths > 0 && termMonths <= 120 && (
                    <div className="summary-note">
                        {termMonths} oy davomida to'lanadi
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentForm;
