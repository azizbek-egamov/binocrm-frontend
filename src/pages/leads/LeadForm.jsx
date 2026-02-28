import React, { useState, useEffect } from 'react';
import { leadService } from '../../services/leads';
import { getUsers } from '../../services/users';
import api from '../../services/api';
import { toast } from 'sonner';
import Modal from '../../components/ui/Modal';
import './LeadForm.css';

// Icons
const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

// Phone Input with Formatting
const PhoneInput = ({ value, onChange, placeholder }) => {
    const formatPhone = (val) => {
        if (!val) return '+998';
        let digits = val.replace(/\D/g, '');

        if (!digits.startsWith('998')) {
            if (digits.startsWith('8')) {
                digits = '998' + digits.substring(1);
            } else if (digits.length > 0) {
                digits = '998' + digits;
            } else {
                digits = '998';
            }
        }

        let formatted = '+998';
        if (digits.length > 3) formatted += ' ' + digits.substring(3, 5);
        if (digits.length > 5) formatted += ' ' + digits.substring(5, 8);
        if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);
        if (digits.length > 10) formatted += ' ' + digits.substring(10, 12);

        return formatted;
    };

    const handleChange = (e) => {
        const formatted = formatPhone(e.target.value);
        onChange(formatted);
    };

    const displayValue = formatPhone(value);

    return (
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder || "+998 XX XXX XX XX"}
        />
    );
};

const LeadForm = ({ isOpen, onClose, lead, initialStageId, onSuccess }) => {
    const isEdit = !!lead;
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [stages, setStages] = useState([]);
    const [operators, setOperators] = useState([]);
    const [isSuperUser, setIsSuperUser] = useState(false);

    const callStatusOptions = [
        { value: '', label: "Qo'ng'iroq qilinmagan" },
        { value: 'answered', label: "Javob berdi" },
        { value: 'not_answered', label: "Javob bermadi" },
        { value: 'client_answered', label: "Mijoz javob berdi" },
        { value: 'client_not_answered', label: "Mijoz javob bermadi" }
    ];

    const [formData, setFormData] = useState({
        client_name: '',
        phone_number: '+998',
        stage: '',
        call_status: '',
        duration_hours: 0,
        duration_minutes: 0,
        duration_seconds: 0,
        follow_up_date: '',
        follow_up_time: '',
        audio_file: null,
        audio_file_name: '',
        notes: '',
        is_considering: false,
        operator: '',
    });

    useEffect(() => {
        if (isOpen) {
            fetchStages();
            fetchUserInfo();
            if (isEdit && lead) {
                let hours = 0, minutes = 0, seconds = 0;
                if (lead.call_duration) {
                    const parts = lead.call_duration.split(':');
                    hours = parseInt(parts[0]) || 0;
                    minutes = parseInt(parts[1]) || 0;
                    seconds = parseInt(parts[2]) || 0;
                }

                let followUpDate = '', followUpTime = '';
                if (lead.follow_up_date) {
                    const dt = new Date(lead.follow_up_date);
                    followUpDate = dt.toISOString().split('T')[0];
                    followUpTime = dt.toTimeString().substring(0, 5);
                }

                setFormData({
                    client_name: lead.client_name || '',
                    phone_number: lead.phone_number || '+998',
                    stage: (lead.stage?.id || lead.stage || '').toString(),
                    call_status: lead.call_status || '',
                    duration_hours: hours,
                    duration_minutes: minutes,
                    duration_seconds: seconds,
                    follow_up_date: followUpDate,
                    follow_up_time: followUpTime,
                    notes: lead.notes || '',
                    is_considering: lead.is_considering || false,
                    operator: (lead.operator?.id || lead.operator || '').toString(),
                });
            } else {
                setFormData({
                    client_name: '',
                    phone_number: '+998',
                    stage: initialStageId ? initialStageId.toString() : '',
                    call_status: '',
                    duration_hours: 0, duration_minutes: 0, duration_seconds: 0,
                    follow_up_date: '', follow_up_time: '',
                    audio_file: null, audio_file_name: '',
                    notes: ''
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, lead, initialStageId]);

    const fetchStages = async () => {
        try {
            const res = await leadService.getStages();
            const stagesData = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setStages(stagesData);

            if (!isEdit && !formData.stage && stagesData.length > 0) {
                const defaultStage = initialStageId || stagesData[0]?.id?.toString();
                setFormData(prev => ({ ...prev, stage: defaultStage }));
            }
        } catch (error) {
            console.error(error);
            setStages([]);
        }
    };

    const fetchUserInfo = async () => {
        try {
            const response = await api.get('/user/');
            setIsSuperUser(response.data.is_superuser);
            if (response.data.is_superuser) {
                const opsRes = await getUsers();
                setOperators(opsRes.data?.results || opsRes.data || []);
            }
        } catch (error) {
            console.error('User info error:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file' && files[0]) {
            setFormData(prev => ({
                ...prev,
                audio_file: files[0],
                audio_file_name: files[0].name
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const phoneDigits = formData.phone_number.replace(/\D/g, '');
        if (phoneDigits.length < 12) {
            toast.error("Telefon raqam to'liq kiritilishi kerak");
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('client_name', formData.client_name);
            data.append('phone_number', formData.phone_number);
            data.append('stage', formData.stage);
            data.append('call_status', formData.call_status);

            const hours = parseInt(formData.duration_hours) || 0;
            const minutes = parseInt(formData.duration_minutes) || 0;
            const seconds = parseInt(formData.duration_seconds) || 0;
            if (hours > 0 || minutes > 0 || seconds > 0) {
                const duration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                data.append('call_duration', duration);
            }

            if (formData.follow_up_date) {
                const time = formData.follow_up_time || '00:00';
                data.append('follow_up_date', `${formData.follow_up_date}T${time}`);
            } else {
                data.append('follow_up_date', '');
            }

            data.append('is_considering', formData.is_considering ? 'true' : 'false');

            if (formData.audio_file) {
                data.append('audio_recording', formData.audio_file);
            }

            data.append('notes', formData.notes);

            if (isSuperUser && formData.operator) {
                data.append('operator', formData.operator);
            }

            if (isEdit) {
                await leadService.update(lead.id, data);
                toast.success("Lead yangilandi");
            } else {
                await leadService.create(data);
                toast.success("Yangi lead qo'shildi");
            }
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Bu leadni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.")) {
            setDeleting(true);
            try {
                await leadService.delete(lead.id);
                toast.success("Lead o'chirildi");
                onSuccess();
                handleClose();
            } catch (error) {
                console.error(error);
                toast.error("O'chirishda xatolik");
            } finally {
                setDeleting(false);
            }
        }
    };

    const modalFooter = (
        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            {isEdit && (
                <button
                    type="button"
                    className="btn-v2 btn-v2-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? "O'chirilmoqda..." : "O'chirish"}
                </button>
            )}
            <div style={{ flex: 1 }}></div>
            <button type="button" className="btn-v2 btn-v2-danger-light" onClick={handleClose} style={{ marginRight: '8px' }}>
                Bekor qilish
            </button>
            <button type="submit" className="btn-v2 btn-v2-primary" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Saqlanmoqda...' : (isEdit ? 'Yangilash' : 'Saqlash')}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEdit ? "Leadni tahrirlash" : "Lead qo'shish"}
            size="lg"
            footer={modalFooter}
        >
            <form onSubmit={handleSubmit}>
                <div className="modal-form-body">
                    <div className="form-group">
                        <label>Mijoz ismi</label>
                        <input
                            type="text"
                            name="client_name"
                            value={formData.client_name}
                            onChange={handleChange}
                            placeholder="To'liq ismni kiriting"
                        />
                    </div>

                    <div className="form-row two-cols">
                        <div className="form-group">
                            <label>Telefon raqami</label>
                            <PhoneInput
                                value={formData.phone_number}
                                onChange={(val) => setFormData(p => ({ ...p, phone_number: val }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Qo'ng'iroq holati</label>
                            <select
                                name="call_status"
                                value={formData.call_status}
                                onChange={handleChange}
                            >
                                {callStatusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row two-cols">
                        <div className="form-group">
                            <label>Qo'ng'iroq davomiyligi</label>
                            <span className="info-text">
                                {(formData.duration_hours > 0 || formData.duration_minutes > 0 || formData.duration_seconds > 0)
                                    ? `${String(formData.duration_hours).padStart(2, '0')}:${String(formData.duration_minutes).padStart(2, '0')}:${String(formData.duration_seconds).padStart(2, '0')}`
                                    : 'Mavjud emas'
                                }
                            </span>
                        </div>
                        <div className="form-group">
                            <label>Audio yozuv</label>
                            {lead?.audio_recording
                                ? <audio controls src={lead.audio_recording} style={{ height: '32px' }} />
                                : <span className="info-text">Mavjud emas</span>
                            }
                        </div>
                    </div>

                    <div className="form-row two-cols">
                        <div className="form-group">
                            <label>Keyingi qo'ng'iroq sanasi</label>
                            <input
                                type="date"
                                name="follow_up_date"
                                value={formData.follow_up_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Keyingi qo'ng'iroq vaqti</label>
                            <input
                                type="time"
                                name="follow_up_time"
                                value={formData.follow_up_time}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row two-cols">
                        <div className="form-group">
                            <label>Bosqich (Status)</label>
                            <select
                                name="stage"
                                value={formData.stage}
                                onChange={handleChange}
                            >
                                <option value="">Bosqichni tanlang</option>
                                {stages.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {isSuperUser && (
                            <div className="form-group">
                                <label>Operator</label>
                                <select
                                    name="operator"
                                    value={formData.operator}
                                    onChange={handleChange}
                                >
                                    <option value="">Operator tanlanmagan</option>
                                    {operators.map(op => (
                                        <option key={op.id} value={op.id}>
                                            {op.first_name ? `${op.first_name} ${op.last_name || ''}` : op.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_considering"
                                checked={formData.is_considering}
                                onChange={(e) => setFormData(p => ({ ...p, is_considering: e.target.checked }))}
                                style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                            />
                            O'ylab ko'ryabdi
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Izohlar</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Qo'ng'iroq haqida qo'shimcha ma'lumotlar..."
                            rows={3}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default LeadForm;
