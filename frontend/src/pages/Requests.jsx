
import { useEffect, useState } from 'react';

import {
    getCustomerRequests,
    updateCustomerRequestStatus
} from '../services/requestService';

import '../pages/Requests.css';

function Requests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [error, setError] = useState('');

    const companyId =
        'd3779995-5533-4198-bee3-556709331dc6';

    async function loadRequests() {
        try {
            setLoading(true);
            setError('');

            const data =
                await getCustomerRequests(companyId);

            setRequests(data);
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

    if (loading) {
        return (
            <div className="requests-page">

                <div className="requests-header">
                    <div>
                        <h1>Solicitações</h1>

                        <p>
                            Solicitações recebidas através do
                            WhatsApp.
                        </p>
                    </div>
                </div>

                <div className="requests-loading">
                    A carregar solicitações...
                </div>

            </div>
        );
    }

    return (
        <div className="requests-page">

            {/* CABEÇALHO */}
            <div className="requests-header">

                <div>
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
                >
                    ↻ Atualizar
                </button>

            </div>

            {/* ERRO */}
            {error && (
                <div className="requests-error">
                    {error}
                </div>
            )}

            {/* RESUMO */}
            <div className="requests-summary">

                <div className="summary-card">

                    <span>
                        Total
                    </span>

                    <strong>
                        {requests.length}
                    </strong>

                </div>

                <div className="summary-card">

                    <span>
                        Pendentes
                    </span>

                    <strong>
                        {
                            requests.filter(
                                (request) =>
                                    request.status ===
                                    'pending'
                            ).length
                        }
                    </strong>

                </div>

                <div className="summary-card">

                    <span>
                        Em andamento
                    </span>

                    <strong>
                        {
                            requests.filter(
                                (request) =>
                                    request.status ===
                                    'in_progress'
                            ).length
                        }
                    </strong>

                </div>

                <div className="summary-card">

                    <span>
                        Concluídas
                    </span>

                    <strong>
                        {
                            requests.filter(
                                (request) =>
                                    request.status ===
                                    'completed'
                            ).length
                        }
                    </strong>

                </div>

            </div>

            {/* LISTA */}
            {requests.length === 0 ? (

                <div className="requests-empty">

                    <div className="requests-empty-icon">
                        📋
                    </div>

                    <h2>
                        Nenhuma solicitação ainda
                    </h2>

                    <p>
                        Quando um cliente solicitar um
                        serviço através do WhatsApp,
                        a solicitação aparecerá aqui.
                    </p>

                </div>

            ) : (

                <div className="requests-table-container">

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

                                                {request.services
                                                    ?.price_type ===
                                                    'fixed' &&
                                                    request.services
                                                        ?.price != null && (
                                                        <span>
                                                            {
                                                                request
                                                                    .services
                                                                    .price
                                                            }{' '}
                                                            MT
                                                        </span>
                                                    )}

                                                {request.services
                                                    ?.price_type ===
                                                    'from' &&
                                                    request.services
                                                        ?.price != null && (
                                                        <span>
                                                            A partir de{' '}
                                                            {
                                                                request
                                                                    .services
                                                                    .price
                                                            }{' '}
                                                            MT
                                                        </span>
                                                    )}

                                                {request.services
                                                    ?.price_type ===
                                                    'quote' && (
                                                        <span>
                                                            Sob orçamento
                                                        </span>
                                                    )}

                                            </div>

                                        </td>

                                        <td>

                                            <div className="request-description">

                                                {
                                                    request.request_text
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

            )}

            {/* PAINEL DE DETALHES */}
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

                        {/* CABEÇALHO DO MODAL */}
                        <div className="request-modal-header">

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

                            <button
                                className="request-modal-close"
                                onClick={closeRequest}
                                aria-label="Fechar"
                            >
                                ✕
                            </button>

                        </div>

                        {/* ESTADO */}
                        <div className="request-detail-status">

                            <span>
                                Estado atual
                            </span>

                            <span
                                className={getStatusClass(
                                    selectedRequest.status
                                )}
                            >
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
                                👤 Cliente
                            </h3>

                            <div className="request-detail-card">

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

                            {selectedRequest.customers?.phone && (
                                <a
                                    className="whatsapp-contact-button"
                                    href={getWhatsAppLink(
                                        selectedRequest
                                            .customers
                                            .phone
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    💬 Contactar no WhatsApp
                                </a>
                            )}

                        </div>

                        {/* SERVIÇO */}
                        <div className="request-detail-section">

                            <h3>
                                🛠️ Serviço
                            </h3>

                            <div className="request-detail-card">

                                <strong>
                                    {
                                        selectedRequest
                                            .services
                                            ?.name ||
                                        'Serviço'
                                    }
                                </strong>

                                {selectedRequest.services
                                    ?.description && (
                                    <span>
                                        {
                                            selectedRequest
                                                .services
                                                .description
                                        }
                                    </span>
                                )}

                                {selectedRequest.services
                                    ?.price_type ===
                                    'fixed' &&
                                    selectedRequest.services
                                        ?.price != null && (
                                        <span>
                                            Preço:{' '}
                                            {
                                                selectedRequest
                                                    .services
                                                    .price
                                            }{' '}
                                            MT
                                        </span>
                                    )}

                                {selectedRequest.services
                                    ?.price_type ===
                                    'from' &&
                                    selectedRequest.services
                                        ?.price != null && (
                                        <span>
                                            Preço a partir de{' '}
                                            {
                                                selectedRequest
                                                    .services
                                                    .price
                                            }{' '}
                                            MT
                                        </span>
                                    )}

                                {selectedRequest.services
                                    ?.price_type ===
                                    'quote' && (
                                    <span>
                                        Preço sob orçamento
                                    </span>
                                )}

                            </div>

                        </div>

                        {/* DESCRIÇÃO */}
                        <div className="request-detail-section">

                            <h3>
                                📝 Detalhes da solicitação
                            </h3>

                            <div className="request-detail-description">

                                {
                                    selectedRequest.request_text
                                }

                            </div>

                        </div>

                        {/* DATAS */}
                        <div className="request-detail-section">

                            <h3>
                                📅 Informações
                            </h3>

                            <div className="request-dates">

                                <div>
                                    <span>
                                        Recebida
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedRequest
                                                .created_at
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Última atualização
                                    </span>

                                    <strong>
                                        {formatDate(
                                            selectedRequest
                                                .updated_at
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
                                            ? 'active'
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
                                >
                                    Pendente
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'contacted'
                                            ? 'active'
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
                                >
                                    Contactado
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'in_progress'
                                            ? 'active'
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
                                >
                                    Em andamento
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'completed'
                                            ? 'active'
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
                                >
                                    Concluído
                                </button>

                                <button
                                    className={
                                        selectedRequest.status ===
                                        'cancelled'
                                            ? 'active'
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
                                >
                                    Cancelado
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Requests;
