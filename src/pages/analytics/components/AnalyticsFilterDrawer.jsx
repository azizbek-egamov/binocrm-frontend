import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X, RefreshCcw } from 'lucide-react';

const AnalyticsFilterDrawer = ({
    isOpen,
    onClose,
    onFilter,
    activeTab,
    initialFilters,
    cities,
    buildings,
    stages,
    operators
}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setFilters(initialFilters);
                setClosing(false);
            }, 0);
        }
    }, [isOpen, initialFilters]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            onClose();
            setClosing(false);
        }, 250);
    };

    const handleApply = () => {
        onFilter(filters);
        handleClose();
    };

    const handleReset = () => {
        const resetData = activeTab === 'sales' ? {
            start_date: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            city: '',
            building: '',
            status: ''
        } : {
            start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            operator: '',
            stage: '',
            call_status: ''
        };
        setFilters(resetData);
        onFilter(resetData);
        handleClose();
    };

    if (!isOpen && !closing) return null;

    const filteredBuildings = filters.city
        ? buildings.filter(b => String(b.city) === String(filters.city))
        : buildings;

    return createPortal(
        <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
            <div
                className={`modal-content modal-form ${closing ? 'closing' : ''}`}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '420px' }}
            >
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={18} />
                        Filterlar ({activeTab === 'sales' ? 'Sotuvlar' : 'Leadlar'})
                    </h3>
                    <button className="modal-close" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleApply(); }}>
                    <div className="modal-form-body">
                        {/* Date Range Section */}
                        <div className="form-group">
                            <label>Sana oralig'i</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={filters.start_date}
                                    onChange={handleChange}
                                />
                                <input
                                    type="date"
                                    name="end_date"
                                    value={filters.end_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {activeTab === 'sales' ? (
                            <>
                                {/* City Section */}
                                <div className="form-group">
                                    <label>Shahar bo'yicha</label>
                                    <select name="city" value={filters.city} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        {cities.map(city => (
                                            <option key={city.id} value={city.id}>{city.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Building Section */}
                                <div className="form-group">
                                    <label>Binolar bo'yicha</label>
                                    <select name="building" value={filters.building} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        {filteredBuildings.map(building => (
                                            <option key={building.id} value={building.id}>{building.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Section */}
                                <div className="form-group">
                                    <label>Shartnoma holati</label>
                                    <select name="status" value={filters.status} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        <option value="PENDING">Kutilmoqda</option>
                                        <option value="ACTIVE">Faol</option>
                                        <option value="COMPLETED">Yakunlangan</option>
                                        <option value="CANCELLED">Bekor qilingan</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Operator Section */}
                                <div className="form-group">
                                    <label>Operator bo'yicha</label>
                                    <select name="operator" value={filters.operator} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        {operators.map((op, i) => (
                                            <option key={i} value={op}>{op}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Stage Section */}
                                <div className="form-group">
                                    <label>Bosqich bo'yicha</label>
                                    <select name="stage" value={filters.stage} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        {Array.isArray(stages) && stages.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Call Status Section */}
                                <div className="form-group">
                                    <label>Qo'ng'iroq holati</label>
                                    <select name="call_status" value={filters.call_status} onChange={handleChange}>
                                        <option value="">Barchasi</option>
                                        <option value="answered">Javob berildi</option>
                                        <option value="not_answered">Javob berilmadi</option>
                                        <option value="client_answered">Mijoz javob berdi</option>
                                        <option value="client_not_answered">Mijoz javob bermadi</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={handleReset}>
                            <RefreshCcw size={16} />
                            Tozalash
                        </button>
                        <button type="submit" className="btn-primary">
                            <Filter size={16} />
                            Qidirish
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AnalyticsFilterDrawer;
