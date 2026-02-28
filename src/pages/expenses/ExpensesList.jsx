import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import expensesService from '../../services/expenses';
import * as buildingsService from '../../services/buildings';
import { toast } from 'sonner';
import './Expenses.css';
import {
    PlusIcon,
    SearchIcon,
    EditIcon,
    TrashIcon,
    SaveIcon,
    CloseIcon,
    InfoIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EmptyIcon,
    WalletIcon,
    ImageIcon,
    CalendarIcon
} from './ExpenseIcons';

const ExpensesList = () => {
    const [expenses, setExpenses] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [buildingFilter, setBuildingFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Pagination
    const [pagination, setPagination] = useState({
        count: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1
    });

    const [modal, setModal] = useState({ open: false, type: null, expense: null });
    const [modalClosing, setModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        building: '',
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        image: null
    });
    const [saving, setSaving] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, search, buildingFilter, categoryFilter]);

    const loadInitialData = async () => {
        try {
            const [buildingsData, categoriesData] = await Promise.all([
                buildingsService.getAllBuildings(),
                expensesService.getCategories({ active_only: 'true' })
            ]);
            setBuildings(buildingsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error(error);
            toast.error("Bino yoki kategoriyalarni yuklashda xatolik");
        }
    };

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                page_size: pagination.pageSize
            };
            if (search) params.search = search;
            if (buildingFilter) params.building = buildingFilter;
            if (categoryFilter) params.category = categoryFilter;

            const data = await expensesService.getExpenses(params);

            const list = data.results || data;
            setExpenses(list);

            const totalCount = data.count || list.length || 0;
            setPagination(prev => ({
                ...prev,
                count: totalCount,
                totalPages: Math.ceil(totalCount / prev.pageSize) || 1
            }));
        } catch (error) {
            console.error(error);
            toast.error("Xarajatlarni yuklashda xatolik");
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const resetForm = () => {
        setFormData({
            building: '',
            category: '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            image: null
        });
        setPreviewImage(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModal({ open: true, type: 'create', expense: null });
    };

    const openEditModal = (expense) => {
        setFormData({
            building: expense.building,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            image: null
        });
        setPreviewImage(expense.image);
        setModal({ open: true, type: 'edit', expense });
    };

    const openDeleteModal = (expense) => {
        setModal({ open: true, type: 'delete', expense });
    };

    const closeModal = () => {
        setModalClosing(true);
        setTimeout(() => {
            setModal({ open: false, type: null, expense: null });
            setModalClosing(false);
            resetForm();
        }, 250);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.building || !formData.category || !formData.amount || !formData.description) {
            toast.error("Barcha maydonlarni to'ldiring");
            return;
        }

        try {
            setSaving(true);
            if (modal.type === 'edit') {
                await expensesService.updateExpense(modal.expense.id, formData);
                toast.success("Xarajat muvaffaqiyatli yangilandi");
            } else {
                await expensesService.createExpense(formData);
                toast.success("Xarajat muvaffaqiyatli qo'shildi");
            }
            closeModal();
            loadExpenses();
        } catch {
            toast.error("Saqlashda xatolik");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!modal.expense) return;
        try {
            setSaving(true);
            await expensesService.deleteExpense(modal.expense.id);
            toast.success("Xarajat o'chirildi");
            closeModal();
            loadExpenses();
        } catch {
            toast.error("O'chirishda xatolik");
        } finally {
            setSaving(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
            'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
        return `${date.getDate()}-${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    return (
        <div className="clients-page">
            <div className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Xarajatlar</h1>
                    <p className="page-subtitle">Barcha xarajatlar va chiqimlar</p>
                </div>
                <div className="header-actions">
                    <button className="btn-primary" onClick={openCreateModal}>
                        <PlusIcon />
                        <span>Xarajat qo'shish</span>
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="content-card">
                    <div className="card-header">
                        <div className="filters-container">
                            <div className="search-box">
                                <SearchIcon />
                                <input
                                    type="text"
                                    placeholder="Qidirish (tavsif bo'yicha)..."
                                    value={search}
                                    onChange={handleSearch}
                                />
                            </div>
                            <select
                                className="filter-select"
                                value={buildingFilter}
                                onChange={(e) => setBuildingFilter(e.target.value)}
                            >
                                <option value="">Barcha binolar</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <select
                                className="filter-select"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">Barcha kategoriyalar</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <div className="results-count">
                                Jami: <strong>{pagination.count}</strong> ta xarajat
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Yuklanmoqda...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="empty-state">
                            <EmptyIcon />
                            <h3>Xarajatlar topilmadi</h3>
                            <p>Sizning so'rovingiz bo'yicha ma'lumot topilmadi</p>
                            <button className="btn-primary" onClick={openCreateModal}>
                                <PlusIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
                                <span>Xarajat qo'shish</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="responsive-table">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Bino</th>
                                            <th>Kategoriya</th>
                                            <th>Tavsif</th>
                                            <th>Summa</th>
                                            <th>Sana</th>
                                            <th style={{ textAlign: 'right' }}>Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map((expense, index) => (
                                            <tr key={expense.id} className="clickable-row" onClick={() => openEditModal(expense)}>
                                                <td className="cell-number">
                                                    {(pagination.page - 1) * pagination.pageSize + index + 1}
                                                </td>
                                                <td className="cell-name">{expense.building_name}</td>
                                                <td>
                                                    <span className={`status-badge ${expense.category_color}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        {expense.category_name}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {expense.description}
                                                </td>
                                                <td className="cell-price" style={{ fontWeight: 'bold', color: '#ef4444' }}>
                                                    {formatPrice(expense.amount)}
                                                </td>
                                                <td>{formatDate(expense.date)}</td>
                                                <td className="cell-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                                                    <div className="table-actions">
                                                        <button className="btn-icon btn-edit" onClick={() => openEditModal(expense)}>
                                                            <EditIcon />
                                                        </button>
                                                        <button className="btn-icon btn-delete" onClick={() => openDeleteModal(expense)}>
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Sahifa {pagination.page} / {pagination.totalPages}
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                        >
                                            <ChevronLeftIcon />
                                        </button>
                                        <button
                                            className="pagination-btn active"
                                        >
                                            {pagination.page}
                                        </button>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page === pagination.totalPages}
                                        >
                                            <ChevronRightIcon />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modal.open && (modal.type === 'create' || modal.type === 'edit') && createPortal(
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={closeModal}>
                    <div className={`modal-content modal-form ${modalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modal.type === 'edit' ? 'Xarajatni tahrirlash' : 'Yangi xarajat qo\'shish'}</h3>
                            <button className="modal-close" onClick={closeModal}>
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-form-body">
                                {/* Readonly-like row for Bino and Kategoriya */}
                                <div className="form-row readonly-row">
                                    <div className="form-group">
                                        <label htmlFor="building">Bino</label>
                                        <select
                                            id="building"
                                            value={formData.building}
                                            onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                                            className="readonly-input"
                                        >
                                            <option value="">Bino tanlang</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="category">Kategoriya</label>
                                        <select
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            className="readonly-input"
                                        >
                                            <option value="">Kategoriya tanlang</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Editable fields in a box */}
                                <div className="form-details-box">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="amount">Summa (so'mda)</label>
                                            <input
                                                type="text"
                                                id="amount"
                                                placeholder="1 000 000"
                                                value={formData.amount ? new Intl.NumberFormat('ru-RU').format(formData.amount) : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setFormData(prev => ({ ...prev, amount: val }));
                                                }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="date">Sana</label>
                                            <input
                                                type="date"
                                                id="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label htmlFor="description">Tavsif / Izoh</label>
                                        <input
                                            type="text"
                                            id="description"
                                            placeholder="Nima uchun sarflandi?"
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* File upload section */}
                                <div className="form-group">
                                    <label>Chek / Rasm</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="file-input"
                                    />
                                    {previewImage && (
                                        <div className="image-preview">
                                            <img src={previewImage} alt="Preview" />
                                        </div>
                                    )}
                                </div>

                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Bekor qilish</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    <SaveIcon />
                                    <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Modal */}
            {modal.open && modal.type === 'delete' && createPortal(
                <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`} onClick={closeModal}>
                    <div className={`modal-content ${modalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Xarajatni o'chirish</h3>
                            <button className="modal-close" onClick={closeModal}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                            <div className="modal-icon danger" style={{ margin: '0 auto 20px', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrashIcon />
                            </div>
                            <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                Ushbu xarajatni o'chirmoqchimisiz?
                            </p>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Binodagi sarflangan mablag' avtomatik qayta hisoblanadi.
                            </p>
                        </div>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={closeModal}>Bekor qilish</button>
                            <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                                <TrashIcon />
                                <span>{saving ? 'O\'chirilmoqda...' : 'O\'chirish'}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ExpensesList;
