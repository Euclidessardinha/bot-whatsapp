import { useEffect, useState } from 'react';

import {
    getCustomerRequests,
    updateCustomerRequestStatus
} from '../services/requestService';

import { getCurrentProfile } from '../services/authService';

import '../pages/Requests.css';

function Requests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [error, setError] = useState('');

    async function loadRequests() {
        try {
            setLoading(true);
            setError('');

            const profile = await getCurrentProfile();

            if (!profile?.company_id) {
                setError(
                    'Não foi possível identificar a empresa atual.'
                );
                return;
            }

            const data = await getCustomerRequests(
                profile.company_id
            );

            setRequests(data || []);
        } catch (err) {
            console.error(
                '❌ Erro ao carregar solicitações:',
                err
            );

            setError(
                'Não foi possível carregar as solicitações.'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequests();
    }, []);

    async function handleStatusChange(
        requestId,
        status
    ) {
        try {
            setUpdatingId(requestId);

            const updated =
                await updateCustomerRequestStatus(
                    requestId,
                    status
                );

            setRequests((currentRequests) =>
                currentRequests.map((request) =>
                    request.id === requestId
                        ? {
                              ...request,
                              status: updated.status,
                              updated_at:
                                  updated.updated_at
                          }
                        : request
                )
            );

            setSelectedRequest((currentRequest) => {
                if (
                    !currentRequest ||
                    currentRequest.id !== requestId
                ) {
                    return currentRequest;
                }

                return {
                    ...currentRequest,
                    status: updated.status,
                    updated_at: updated.updated_at
                };
            });
        } catch (err) {
            console.error(
                '❌ Erro ao atualizar solicitação:',
                err
            );

            alert(
                'Não foi possível atualizar o estado da solicitação.'
            );
        } finally {
            setUpdatingId(null);
        }
    }

    function formatDate(date) {
        if (!date) {
            return '-';
        }

        return new Date(date).toLocaleString(
            'pt-MZ',
            {
                dateStyle: 'short',
                timeStyle: 'short'
            }
        );
    }

    function getStatusLabel(status) {
        const labels = {
            pending: 'Pendente',
            contacted: 'Contactado',
            in_progress: 'Em andamento',
            completed: 'Concluído',
            cancelled: 'Cancelado'
        };

        return labels[status] || status;
    }

    function getStatusClass(status) {
        return `request-status ${status}`;
    }

    function openRequest(request) {
        setSelectedRequest(request);
    }

    function closeRequest() {
        setSelectedRequest(null);
    }

    function getWhatsAppLink(phone) {
        if (!phone) {
            return '#';
        }

        const cleanPhone = String(phone).replace(
            /\D/g,
            ''
        );

        return `https://wa.me/${cleanPhone}`;
    }

    function getServicePrice(service) {
        if (!service) {
            return null;
        }

        if (
            service.price_type === 'fixed' &&
            service.price != null
        ) {
            return `${service.price} MT`;
        }

        if (
            service.price_type === 'from' &&
            service.price != null
        ) {
            return `A partir de ${service.price} MT`;
        }

        if (service.price_type === 'quote') {
            return 'Sob orçamento';
        }

        return null;
    }

    if (loading) {
        return (
            <div className="requests-page">
                <div className="requests-header">
                    <div>
                        <div className="requests-eyebrow">
                            ATENDIMENTO WHATSAPP
                        </div>

                        <h1>Solicitações</h1>

                        <p>
                            Gerencie as solicitações de
                            serviços recebidas pelo seu bot.
                        </p>
                    </div>
                </div>

                <div className="requests-loading">
                    <div className="requests-loading-spinner" />

                    <span>
                        A carregar solicitações...
                    </span>
                </div>
            </div>
        );
    }

    const pendingCount = requests.filter(
        (request) => request.status === 'pending'
    ).length;

    const inProgressCount = requests.filter(
        (request) => request.status === 'in_progress'
    ).length;

    const completedCount = requests.filter(
        (request) => request.status === 'completed'
    ).length;

    return (
        <div className="requests-page">

            {/* =====================================================
                HEADER
            ====================================================== */}

            <div className="requests-header">

                <div className="requests-header-content">

                    <div className="requests-eyebrow">
                        ATENDIMENTO WHATSAPP
                    </div>

                    <h1>
                        Solicitações
                    </h1>

                    <p>
                        Gerencie as solicitações de serviços
                        recebidas pelo seu bot.
                    </p>

                </div>

                <button
                    className="requests-refresh-button"
                    onClick={loadRequests}
                    type="button"
                >
                    <span className="refresh-icon">
                        ↻
                    </span>

                    Atualizar
                </button>

            </div>

            {/* =====================================================
                ERROR
            ====================================================== */}

            {error && (
                <div className="requests-error">
                    <span className="requests-error-icon">
                        !
                    </span>

                    <span>
                        {error}
                    </span>
                </div>
            )}

            {/* =====================================================
                SUMMARY
            ====================================================== */}

            <div className="requests-summary">

                <div className="summary-card summary-total">

                    <div className="summary-card-top">
                        <span>
                            Total
                        </span>

                        <div className="summary-icon">
                            ▣
                        </div>
                    </div>

                    <strong className="summary-value">
                        {requests.length}
                    </strong>

                    <small>
                        Solicitações recebidas
                    </small>

                </div>

                <div className="summary-card summary-pending">

                    <div className="summary-card-top">
                        <span>
                            Pendentes
                        </span>

                        <div className="summary-icon">
                            !
                        </div>
                    </div>

                    <strong className="summary-value">
                        {pendingCount}
                    </strong>

                    <small>
                        Aguardam atendimento
                    </small>

                </div>

                <div className="summary-card summary-progress">

                    <div className="summary-card-top">
                        <span>
                            Em andamento
                        </span>

                        <div className="summary-icon">
                            ◌
                        </div>
                    </div>

                    <strong className="summary-value">
                        {inProgressCount}
                    </strong>

                    <small>
                        Em processo de atendimento
                    </small>

                </div>

                <div className="summary-card summary-completed">

                    <div className="summary-card-top">
                        <span>
                            Concluídas
                        </span>

                        <div className="summary-icon">
                            ✓
                        </div>
                    </div>

                    <strong className="summary-value">
                        {completedCount}
                    </strong>

                    <small>
                        Solicitações finalizadas
                    </small>

                </div>

            </div>

            {/* =====================================================
                EMPTY STATE
            ====================================================== */}

            {requests.length === 0 ? (

                <div className="requests-empty">

                    <div className="requests-empty-glow" />

                    <div className="requests-empty-icon">
                        <span>⌁</span>
                    </div>

                    <div className="requests-empty-badge">
                        WHATSAPP
                    </div>

                    <h2>
                        Nenhuma solicitação ainda
                    </h2>

                    <p>
                        Quando um cliente solicitar um
                        serviço através do WhatsApp,
                        a solicitação aparecerá aqui.
                    </p>

                    <div className="requests-empty-line" />

                </div>

            ) : (

                /* =================================================
                   TABLE
                ================================================== */

                <div className="requests-table-container">

                    <div className="requests-table-header">

                        <div>
                            <span className="table-eyebrow">
                                CENTRAL DE ATENDIMENTO
                            </span>

                            <h2>
                                Solicitações recentes
                            </h2>
                        </div>

                        <span className="requests-count">
                            {requests.length}{' '}
                            {requests.length === 1
                                ? 'solicitação'
                                : 'solicitações'}
                        </span>

                    </div>

                    <div className="requests-table-scroll">

                        <table className="requests-table">

                            <thead>

                                <tr>
                                    <th>
                                        Cliente
                                    </th>

                                    <th>
                                        Serviço
                                    </th>

                                    <th>
                                        Solicitação
                                    </th>

                                    <th>
                                        Data
                                    </th>

                                    <th>
                                        Estado
                                    </th>
                                </tr>

                            </thead>

                            <tbody>

                                {requests.map(
                                    (request) => (

                                        <tr
                                            key={request.id}
                                            className="request-row"
                                            onClick={() =>
                                                openRequest(
                                                    request
                                                )
                                            }
                                        >

                                            <td>

                                                <div className="customer-info">

                                                    <div className="customer-avatar">
                                                        {
                                                            (
                                                                request
                                                                    .customers
                                                                    ?.name ||
                                                                'C'
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()
                                                        }
                                                    </div>

                                                    <div className="customer-data">

                                                        <strong>
                                                            {
                                                                request
                                                                    .customers
                                                                    ?.name ||
                                                                'Cliente'
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                request
                                                                    .customers
                                                                    ?.phone ||
                                                                '-'
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>

                                            <td>

                                                <div className="service-info">

                                                    <strong>
                                                        {
                                                            request
                                                                .services
                                                                ?.name ||
                                                            'Serviço'
                                                        }
                                                    </strong>

                                                    {getServicePrice(
                                                        request.services
                                                    ) && (
                                                        <span>
                                                            {getServicePrice(
                                                                request.services
                                                            )}
                                                        </span>
                                                    )}

                                                </div>

                                            </td>

                                            <td>

                                                <div className="request-description">

                                                    {
                                                        request.request_text ||
                                                        'Sem descrição'
                                                    }

                                                </div>

                                            </td>

                                            <td>

                                                <span className="request-date">
                                                    {formatDate(
                                                        request.created_at
                                                    )}
                                                </span>

                                            </td>

                                            <td>

                                                <span
                                                    className={getStatusClass(
                                                        request.status
                                                    )}
                                                >
                                                    <span className="status-dot" />

                                                    {
                                                        getStatusLabel(
                                                            request.status
                                                        )
                                                    }
                                                </span>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            )}

            {/* =====================================================
                REQUEST MODAL
            ====================================================== */}

            {selectedRequest && (

                <div
                    className="request-modal-overlay"
                    onClick={closeRequest}
                >

                    <div
                        className="request-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="request-modal-header">

                            <div className="request-modal-title-area">

                                <div className="request-modal-icon">
                                    ▣
                                </div>

                                <div>

                                    <span className="request-modal-label">
                                        SOLICITAÇÃO
                                    </span>

                                    <h2>
                                        {
                                            selectedRequest
                                                .services
                                                ?.name ||
                                            'Solicitação de serviço'
                                        }
                                    </h2>

                                </div>

                            </div>

                            <button
                                className="request-modal-close"
                                onClick={closeRequest}
                                aria-label="Fechar"
                                type="button"
                            >
                                ✕
                            </button>

                        </div>

                        {/* STATUS ATUAL */}

                        <div className="request-detail-status">

                            <span>
                                Estado atual
                            </span>

                            <span
                                className={getStatusClass(
                                    selectedRequest.status
                                )}
                            >
                                <span className="status-dot" />

                                {
                                    getStatusLabel(
                                        selectedRequest.status
                                    )
                                }
                            </span>

                        </div>

                        {/* CLIENTE */}

                        <div className="request-detail-section">

                            <h3>
                                <span className="detail-section-icon">
                                    👤
                                </span>

                                Cliente
                            </h3>

                            <div className="request-detail-card">

                                <div className="detail-customer-avatar">
                                    {
                                        (
                                            selectedRequest
                                                .customers
                                                ?.name ||
                                            'C'
                                        )
                                            .charAt(0)
                                            .toUpperCase()
                                    }
                                </div>

                                <div className="detail-customer-info">

                                    <strong>
                                        {
                                            selectedRequest
                                                .customers
                                                ?.name ||
                                            'Cliente'
                                        }
                                    </strong>

                                    <span>
                                        {
                                            selectedRequest
                                                .customers
                                                ?.phone ||
                                            'Telefone não disponível'
                                        }
                                    </span>

                                </div>

                            </div>

                            {selectedRequest.customers?.phone && (

                                <a
                                    className="whatsapp-contact-button"
                                    href={getWhatsAppLink(
                                        selectedRequest
                                            .customers
                                            .phone
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="whatsapp-button-icon">
                                        ◉
                                    </span>

                                    Contactar no WhatsApp

                                    <span className="whatsapp-button-arrow">
                                        ↗
                                    </span>
                                </a>

                            )}

                        </div>

                        {/* SERVIÇO */}

                        <div className="request-detail-section">

                            <h3>
                                <span className="detail-section-icon">
                                    ◈
                                </span>

                                Serviço
                            </h3>

                            <div className="request-service-card">

                                <strong>
                                    {
                                        selectedRequest
                                            .services
                                            ?.name ||
                                        'Serviço não disponível'
                                    }
                                </strong>

                                {getServicePrice(
                                    selectedRequest.services
                                ) && (
                                    <span>
                                        {getServicePrice(
                                            selectedRequest.services
                                        )}
                                    </span>
                                )}

                            </div>

                        </div>

                        {/* DESCRIÇÃO */}

                        <div className="request-detail-section">

                            <h3>
                                <span className="detail-section-icon">
                                    ✎
                                </span>

                                Detalhes da solicitação
                            </h3>

                            <div className="request-detail-description">

                                {
                                    selectedRequest.request_text ||
                                    'Nenhum detalhe informado.'
                                }

                            </div>

                        </div>

                        {/* DATAS */}

                        <div className="request-detail-section">

                            <h3>
                                <span className="detail-section-icon">
                                    ◷
                                </span>

                                Informações
                            </h3>

                            <div className="request-dates">

                                <div>
                                    <span>
                                        Recebida
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedRequest.created_at
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Última atualização
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedRequest.updated_at
                                        )}
                                    </strong>
                                </div>

                            </div>

                        </div>

                        {/* AÇÕES */}

                        <div className="request-actions">

                            <h3>
                                Alterar estado
                            </h3>

                            <div className="request-status-buttons">

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'pending'
                                            ? 'active pending-action'
                                            : ''
                                    }
                                    disabled={
                                        updatingId ===
                                        selectedRequest.id
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            selectedRequest.id,
                                            'pending'
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="status-action-dot" />
                                    Pendente
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'contacted'
                                            ? 'active contacted-action'
                                            : ''
                                    }
                                    disabled={
                                        updatingId ===
                                        selectedRequest.id
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            selectedRequest.id,
                                            'contacted'
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="status-action-dot" />
                                    Contactado
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'in_progress'
                                            ? 'active progress-action'
                                            : ''
                                    }
                                    disabled={
                                        updatingId ===
                                        selectedRequest.id
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            selectedRequest.id,
                                            'in_progress'
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="status-action-dot" />
                                    Em andamento
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'completed'
                                            ? 'active completed-action'
                                            : ''
                                    }
                                    disabled={
                                        updatingId ===
                                        selectedRequest.id
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            selectedRequest.id,
                                            'completed'
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="status-action-dot" />
                                    Concluído
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'cancelled'
                                            ? 'active cancelled-action'
                                            : ''
                                    }
                                    disabled={
                                        updatingId ===
                                        selectedRequest.id
                                    }
                                    onClick={() =>
                                        handleStatusChange(
                                            selectedRequest.id,
                                            'cancelled'
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="status-action-dot" />
                                    Cancelado
                                </button>

                            </div>

                            {updatingId ===
                                selectedRequest.id && (
                                <div className="request-updating">
                                    <div className="request-updating-spinner" />

                                    Atualizando estado...
                                </div>
                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Requests;