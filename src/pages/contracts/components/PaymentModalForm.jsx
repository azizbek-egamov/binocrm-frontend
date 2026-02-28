'use client';

import React from 'react';
import { DollarSignIcon } from '../ContractIcons';
import Modal from '../../../components/ui/Modal';
import { InfoDisplay, InfoNote, PriceInput, FormField } from '../../../components/ui/ModalFormComponents';

const PaymentModalForm = ({
    isOpen,
    onClose,
    payment,
    amount,
    onAmountChange,
    onSubmit,
    isLoading,
    formatPrice,
    title
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title || (payment?.month_number === 0 ? "Boshlang'ich to'lov" : `${payment?.month_number}-oy uchun to'lov`)}
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
                        label: 'Belgilangan miqdori',
                        value: formatPrice(payment?.amount)
                    },
                    {
                        label: 'Qolgan qarz',
                        value: formatPrice(payment?.remaining),
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

            <InfoNote type="info">
                <strong>Eslatma:</strong> To'lov miqdori oy uchun qoldiqdan oshmasligi kerak.
            </InfoNote>
        </Modal>
    );
};

export default PaymentModalForm;
