'use client';

import React from 'react';
import { DollarSignIcon } from '../ContractIcons';
import Modal from '../../../components/ui/Modal';
import { InfoDisplay, InfoNote, PriceInput, FormField } from '../../../components/ui/ModalFormComponents';

const CustomPaymentModal = ({
    isOpen,
    onClose,
    remainingBalance,
    amount,
    onAmountChange,
    onSubmit,
    isLoading,
    formatPrice
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ixtiyoriy to'lov qilish"
            icon={<DollarSignIcon width="20" height="20" />}
            size="md"
            footer={
                <>
                    <button
                        type="button"
                        className="btn-v2 btn-v2-secondary"
                        onClick={onClose}
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="button"
                        className="btn-v2 btn-v2-primary"
                        onClick={onSubmit}
                        disabled={isLoading || !amount}
                    >
                        {isLoading ? 'Jarayonda...' : "To'lovni tasdiqlash"}
                    </button>
                </>
            }
        >
            <InfoDisplay
                items={[
                    {
                        label: 'Qolgan umumiy qarz',
                        value: formatPrice(remainingBalance),
                        color: '#ef4444'
                    }
                ]}
            />

            <FormField label="To'lov summasi" required>
                <PriceInput
                    value={amount}
                    onChange={onAmountChange}
                    placeholder="Summa kiriting"
                />
            </FormField>

            <InfoNote type="success">
                <strong>Ma'lumot:</strong> Ixtiyoriy to'lov avtomatik ravishda eng yaqin to'lanmagan oylarga taqsimlanadi.
            </InfoNote>
        </Modal>
    );
};

export default CustomPaymentModal;
