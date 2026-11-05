import { useEffect, useState } from 'react';

import {
    getCurrentProfile
} from '../services/authService';

import {
    getOrders,
    updateOrderStatus
} from '../services/orderService';

import './Pedidos.css';


function Pedidos() {
    const [profile, setProfile] = useState(null);
    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedOrder, setSelectedOrder] =
        useState(null);

    const [updatingStatus, setUpdatingStatus] =
        useState(false);


    useEffect(() => {
        loadOrders();
    }, []);


    async function loadOrders() {
        try {
            setLoading(true);
            setError('');

            const currentProfile =
                await getCurrentProfile();

            if (!currentProfile) {
                throw new Error(
                    'Perfil do utilizador não encontrado.'
                );
            }

            setProfile(currentProfile);

            const companyId =
                currentProfile.company_id;

            const data =
                await getOrders(companyId);

            setOrders(data);

        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível carregar os pedidos.'
            );

        } finally {
            setLoading(false);
        }
    }


    async function handleStatusChange(
        orderId,
        newStatus
    ) {
        try {
            setUpdatingStatus(true);

            await updateOrderStatus(
                orderId,
                newStatus
            );

            await loadOrders();

            if (selectedOrder) {
                setSelectedOrder(
                    (current) =>
                        current
                            ? {
                                ...current,
                                status: newStatus
                            }
                            : null
                );
            }

        } catch (err) {
            console.error(err);

            setError(
                'Não foi possível atualizar o pedido.'
            );

        } finally {
            setUpdatingStatus(false);
        }
    }


    function formatPrice(value) {
        return (
            Number(value || 0)
                .toLocaleString('pt-MZ')
            + ' MT'
        );
    }


    function formatDate(date) {
        if (!date) {
            return '-';
        }

        return new Date(date)
            .toLocaleString('pt-MZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    }


    function getCustomerName(order) {
        return (
            order?.customers?.name ||
            'Cliente'
        );
    }


    function getCustomerPhone(order) {
        return (
            order?.customers?.phone ||
            'Sem telefone'
        );
    }


    function getStatusLabel(status) {
        switch (status) {
            case 'pending':
                return 'Pendente';

            case 'confirmed':
                return 'Confirmado';

            case 'preparing':
                return 'Preparando';

            case 'completed':
                return 'Concluído';

            case 'cancelled':
                return 'Cancelado';

            default:
                return status || 'Pendente';
        }
    }


    function getStatusClass(status) {
        switch (status) {
            case 'confirmed':
                return 'status-confirmed';

            case 'preparing':
                return 'status-preparing';

            case 'completed':
                return 'status-completed';

            case 'cancelled':
                return 'status-cancelled';

            default:
                return 'status-pending';
        }
    }


    function getItemsCount(order) {
        if (!order?.order_items) {
            return 0;
        }

        return order.order_items.reduce(
            (total, item) =>
                total +
                Number(item.quantity || 0),
            0
        );
    }


    if (loading) {
        return (
            <div className="pedidos-page">
                <div className="pedidos-loading">
                    <div className="loading-spinner"></div>

                    <p>
                        A carregar pedidos...
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="pedidos-page">

            <div className="pedidos-header">

                <div>
                    <h1>
                        🛒 Pedidos
                    </h1>

                    <p>
                        Gerencie os pedidos
                        recebidos pelo seu bot.
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadOrders}
                >
                    ↻ Atualizar
                </button>

            </div>


            {error && (
                <div className="pedidos-error">
                    {error}
                </div>
            )}


            <div className="pedidos-stats">

                <div className="pedido-stat-card">

                    <div className="pedido-stat-icon">
                        📦
                    </div>

                    <div>
                        <span>
                            Total
                        </span>

                        <strong>
                            {orders.length}
                        </strong>
                    </div>

                </div>


                <div className="pedido-stat-card">

                    <div className="pedido-stat-icon">
                        ⏳
                    </div>

                    <div>
                        <span>
                            Pendentes
                        </span>

                        <strong>
                            {
                                orders.filter(
                                    order =>
                                        !order.status ||
                                        order.status ===
                                            'pending'
                                ).length
                            }
                        </strong>
                    </div>

                </div>


                <div className="pedido-stat-card">

                    <div className="pedido-stat-icon">
                        🔄
                    </div>

                    <div>
                        <span>
                            Em preparação
                        </span>

                        <strong>
                            {
                                orders.filter(
                                    order =>
                                        order.status ===
                                        'preparing'
                                ).length
                            }
                        </strong>
                    </div>

                </div>


                <div className="pedido-stat-card">

                    <div className="pedido-stat-icon">
                        💰
                    </div>

                    <div>
                        <span>
                            Concluídos
                        </span>

                        <strong>
                            {
                                orders.filter(
                                    order =>
                                        order.status ===
                                        'completed'
                                ).length
                            }
                        </strong>
                    </div>

                </div>

            </div>


            <div className="pedidos-content">

                {orders.length === 0 ? (

                    <div className="empty-orders">

                        <div className="empty-icon">
                            🛒
                        </div>

                        <h2>
                            Ainda não existem pedidos
                        </h2>

                        <p>
                            Quando um cliente fizer
                            um pedido através do
                            WhatsApp, ele aparecerá
                            aqui.
                        </p>

                    </div>

                ) : (

                    <div className="orders-table-wrapper">

                        <table className="orders-table">

                            <thead>
                                <tr>

                                    <th>
                                        Pedido
                                    </th>

                                    <th>
                                        Cliente
                                    </th>

                                    <th>
                                        Produtos
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Data
                                    </th>

                                    <th>
                                        Ações
                                    </th>

                                </tr>
                            </thead>


                            <tbody>

                                {orders.map(
                                    (order) => (

                                        <tr
                                            key={order.id}
                                        >

                                            <td>
                                                <strong>
                                                    #
                                                    {
                                                        order.id
                                                            .slice(
                                                                0,
                                                                8
                                                            )
                                                    }
                                                </strong>
                                            </td>


                                            <td>

                                                <div className="customer-cell">

                                                    <strong>
                                                        {
                                                            getCustomerName(
                                                                order
                                                            )
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            getCustomerPhone(
                                                                order
                                                            )
                                                        }
                                                    </span>

                                                </div>

                                            </td>


                                            <td>
                                                {
                                                    getItemsCount(
                                                        order
                                                    )
                                                }{' '}
                                                item(ns)
                                            </td>


                                            <td>
                                                <strong>
                                                    {
                                                        formatPrice(
                                                            order.total
                                                        )
                                                    }
                                                </strong>
                                            </td>


                                            <td>

                                                <span
                                                    className={`order-status ${getStatusClass(
                                                        order.status
                                                    )}`}
                                                >
                                                    {
                                                        getStatusLabel(
                                                            order.status
                                                        )
                                                    }
                                                </span>

                                            </td>


                                            <td>
                                                {
                                                    formatDate(
                                                        order.created_at
                                                    )
                                                }
                                            </td>


                                            <td>

                                                <button
                                                    className="view-order-button"
                                                    onClick={() =>
                                                        setSelectedOrder(
                                                            order
                                                        )
                                                    }
                                                >
                                                    Ver
                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>


            {selectedOrder && (

                <div
                    className="order-modal-overlay"
                    onClick={() =>
                        setSelectedOrder(null)
                    }
                >

                    <div
                        className="order-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="order-modal-header">

                            <div>

                                <h2>
                                    Pedido #
                                    {
                                        selectedOrder.id.slice(
                                            0,
                                            8
                                        )
                                    }
                                </h2>

                                <span>
                                    {
                                        formatDate(
                                            selectedOrder.created_at
                                        )
                                    }
                                </span>

                            </div>


                            <button
                                className="close-modal-button"
                                onClick={() =>
                                    setSelectedOrder(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="order-customer">

                            <h3>
                                👤 Cliente
                            </h3>

                            <p>
                                <strong>
                                    Nome:
                                </strong>{' '}
                                {
                                    getCustomerName(
                                        selectedOrder
                                    )
                                }
                            </p>

                            <p>
                                <strong>
                                    Telefone:
                                </strong>{' '}
                                {
                                    getCustomerPhone(
                                        selectedOrder
                                    )
                                }
                            </p>

                        </div>


                        <div className="order-products">

                            <h3>
                                🍔 Produtos
                            </h3>


                            {selectedOrder.order_items?.map(
                                (item) => (

                                    <div
                                        className="order-product-row"
                                        key={item.id}
                                    >

                                        <div>

                                            <strong>
                                                {
                                                    item
                                                        .products
                                                        ?.name ||
                                                    'Produto'
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    item.quantity
                                                }{' '}
                                                ×{' '}
                                                {
                                                    formatPrice(
                                                        item.unit_price
                                                    )
                                                }
                                            </span>

                                        </div>


                                        <strong>
                                            {
                                                formatPrice(
                                                    Number(
                                                        item.quantity
                                                    ) *
                                                    Number(
                                                        item.unit_price
                                                    )
                                                )
                                            }
                                        </strong>

                                    </div>

                                )
                            )}

                        </div>


                        <div className="order-total">

                            <span>
                                Total
                            </span>

                            <strong>
                                {
                                    formatPrice(
                                        selectedOrder.total
                                    )
                                }
                            </strong>

                        </div>


                        <div className="order-status-section">

                            <h3>
                                Estado do pedido
                            </h3>

                            <select
                                value={
                                    selectedOrder.status ||
                                    'pending'
                                }
                                onChange={(event) =>
                                    handleStatusChange(
                                        selectedOrder.id,
                                        event.target.value
                                    )
                                }
                                disabled={
                                    updatingStatus
                                }
                            >

                                <option value="pending">
                                    Pendente
                                </option>

                                <option value="confirmed">
                                    Confirmado
                                </option>

                                <option value="preparing">
                                    Preparando
                                </option>

                                <option value="completed">
                                    Concluído
                                </option>

                                <option value="cancelled">
                                    Cancelado
                                </option>

                            </select>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}


export default Pedidos;