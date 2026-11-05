import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    getCurrentProfile
} from '../services/authService';

import {
    getCustomers,
    getCustomerById
} from '../services/customerService';

import './Clientes.css';


function Clientes() {

    const [
        customers,
        setCustomers
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState('');

    const [
        search,
        setSearch
    ] = useState('');

    const [
        selectedCustomer,
        setSelectedCustomer
    ] = useState(null);

    const [
        loadingDetails,
        setLoadingDetails
    ] = useState(false);


    /**
     * =====================================================
     * CARREGAR CLIENTES
     * =====================================================
     */
    async function loadCustomers() {

        try {

            setLoading(true);
            setError('');

            const profile =
                await getCurrentProfile();


            if (
                !profile ||
                !profile.company_id
            ) {

                throw new Error(
                    'Empresa do usuário não encontrada.'
                );
            }


            const data =
                await getCustomers(
                    profile.company_id
                );


            setCustomers(data);

        } catch (err) {

            console.error(
                'Erro ao carregar clientes:',
                err
            );

            setError(
                'Não foi possível carregar os clientes.'
            );

        } finally {

            setLoading(false);

        }
    }


    useEffect(() => {

        loadCustomers();

    }, []);


    /**
     * =====================================================
     * CLIENTES FILTRADOS
     * =====================================================
     */
    const filteredCustomers =
        useMemo(() => {

            const value =
                search
                    .toLowerCase()
                    .trim();


            if (!value) {
                return customers;
            }


            return customers.filter(
                customer => {

                    const name =
                        (
                            customer.name ||
                            ''
                        ).toLowerCase();

                    const phone =
                        (
                            customer.phone ||
                            ''
                        ).toLowerCase();


                    return (
                        name.includes(value) ||
                        phone.includes(value)
                    );

                }
            );

        }, [
            customers,
            search
        ]);


    /**
     * =====================================================
     * ESTATÍSTICAS
     * =====================================================
     */
    const totalCustomers =
        customers.length;


    const customersWithOrders =
        customers.filter(
            customer =>
                customer.orders &&
                customer.orders.length > 0
        ).length;


    const totalRevenue =
        customers.reduce(
            (
                total,
                customer
            ) => {

                const orders =
                    customer.orders || [];


                return (
                    total +
                    orders.reduce(
                        (
                            sum,
                            order
                        ) => {

                            return (
                                sum +
                                Number(
                                    order.total || 0
                                )
                            );

                        },
                        0
                    )
                );

            },
            0
        );


    /**
     * =====================================================
     * ÚLTIMO PEDIDO
     * =====================================================
     */
    function getLastOrder(
        customer
    ) {

        const orders =
            customer.orders || [];


        if (!orders.length) {
            return null;
        }


        return [
            ...orders
        ].sort(
            (
                a,
                b
            ) =>
                new Date(
                    b.created_at
                ) -
                new Date(
                    a.created_at
                )
        )[0];
    }


    /**
     * =====================================================
     * FORMATAÇÕES
     * =====================================================
     */
    function formatCurrency(
        value
    ) {

        return `${Number(
            value || 0
        ).toLocaleString(
            'pt-MZ'
        )} MT`;
    }


    function formatDate(
        date
    ) {

        if (!date) {
            return '-';
        }


        return new Date(
            date
        ).toLocaleDateString(
            'pt-MZ',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }
        );
    }


    /**
     * =====================================================
     * ABRIR DETALHES
     * =====================================================
     */
    async function openCustomer(
        customerId
    ) {

        try {

            setLoadingDetails(true);

            const customer =
                await getCustomerById(
                    customerId
                );


            setSelectedCustomer(
                customer
            );

        } catch (err) {

            console.error(
                'Erro ao abrir cliente:',
                err
            );

        } finally {

            setLoadingDetails(false);

        }
    }


    /**
     * =====================================================
     * FECHAR DETALHES
     * =====================================================
     */
    function closeCustomer() {

        setSelectedCustomer(
            null
        );

    }


    /**
     * =====================================================
     * LOADING
     * =====================================================
     */
    if (loading) {

        return (
            <div className="clientes-page">

                <div className="clientes-loading">

                    <div className="clientes-spinner"></div>

                    <p>
                        Carregando clientes...
                    </p>

                </div>

            </div>
        );
    }


    return (

        <div className="clientes-page">

            {/* =================================================
                CABEÇALHO
            ================================================= */}

            <div className="clientes-header">

                <div>

                    <h1>
                        Clientes
                    </h1>

                    <p>
                        Gerencie os clientes da sua empresa.
                    </p>

                </div>

                <button
                    className="clientes-refresh-button"
                    onClick={loadCustomers}
                >
                    ↻ Atualizar
                </button>

            </div>


            {/* =================================================
                ERRO
            ================================================= */}

            {error && (

                <div className="clientes-error">

                    {error}

                </div>

            )}


            {/* =================================================
                ESTATÍSTICAS
            ================================================= */}

            <div className="clientes-stats">

                <div className="cliente-stat-card">

                    <div className="cliente-stat-icon">
                        👥
                    </div>

                    <div>

                        <span>
                            Total de clientes
                        </span>

                        <strong>
                            {totalCustomers}
                        </strong>

                    </div>

                </div>


                <div className="cliente-stat-card">

                    <div className="cliente-stat-icon">
                        🛒
                    </div>

                    <div>

                        <span>
                            Clientes com pedidos
                        </span>

                        <strong>
                            {customersWithOrders}
                        </strong>

                    </div>

                </div>


                <div className="cliente-stat-card">

                    <div className="cliente-stat-icon">
                        💰
                    </div>

                    <div>

                        <span>
                            Valor movimentado
                        </span>

                        <strong>
                            {formatCurrency(
                                totalRevenue
                            )}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =================================================
                CONTEÚDO
            ================================================= */}

            <div className="clientes-card">

                <div className="clientes-toolbar">

                    <div>

                        <h2>
                            Lista de clientes
                        </h2>

                        <p>
                            {filteredCustomers.length}
                            {' '}
                            cliente
                            {filteredCustomers.length !== 1
                                ? 's'
                                : ''
                            }
                        </p>

                    </div>


                    <div className="clientes-search">

                        <span>
                            🔎
                        </span>

                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou telefone..."
                            value={search}
                            onChange={event =>
                                setSearch(
                                    event.target.value
                                )
                            }
                        />

                    </div>

                </div>


                {/* =================================================
                    TABELA
                ================================================= */}

                {filteredCustomers.length === 0 ? (

                    <div className="clientes-empty">

                        <div className="clientes-empty-icon">
                            👥
                        </div>

                        <h3>
                            {search
                                ? 'Nenhum cliente encontrado'
                                : 'Ainda não existem clientes'
                            }
                        </h3>

                        <p>
                            {search
                                ? 'Tente pesquisar por outro nome ou número.'
                                : 'Os clientes aparecerão aqui quando entrarem em contacto com o bot.'
                            }
                        </p>

                    </div>

                ) : (

                    <div className="clientes-table-wrapper">

                        <table className="clientes-table">

                            <thead>

                                <tr>

                                    <th>
                                        Cliente
                                    </th>

                                    <th>
                                        Telefone
                                    </th>

                                    <th>
                                        Pedidos
                                    </th>

                                    <th>
                                        Total gasto
                                    </th>

                                    <th>
                                        Último pedido
                                    </th>

                                    <th>
                                        Ação
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filteredCustomers.map(
                                    customer => {

                                        const orders =
                                            customer.orders ||
                                            [];

                                        const totalSpent =
                                            orders.reduce(
                                                (
                                                    sum,
                                                    order
                                                ) =>
                                                    sum +
                                                    Number(
                                                        order.total ||
                                                        0
                                                    ),
                                                0
                                            );

                                        const lastOrder =
                                            getLastOrder(
                                                customer
                                            );


                                        return (

                                            <tr
                                                key={
                                                    customer.id
                                                }
                                            >

                                                <td>

                                                    <div className="cliente-name">

                                                        <div className="cliente-avatar">

                                                            {(
                                                                customer.name ||
                                                                customer.phone ||
                                                                '?'
                                                            )
                                                                .charAt(0)
                                                                .toUpperCase()
                                                            }

                                                        </div>

                                                        <div>

                                                            <strong>
                                                                {
                                                                    customer.name ||
                                                                    'Cliente'
                                                                }
                                                            </strong>

                                                        </div>

                                                    </div>

                                                </td>


                                                <td>

                                                    {
                                                        customer.phone ||
                                                        '-'
                                                    }

                                                </td>


                                                <td>

                                                    <span className="cliente-orders-badge">

                                                        {
                                                            orders.length
                                                        }

                                                    </span>

                                                </td>


                                                <td>

                                                    <strong>
                                                        {
                                                            formatCurrency(
                                                                totalSpent
                                                            )
                                                        }
                                                    </strong>

                                                </td>


                                                <td>

                                                    {
                                                        lastOrder
                                                            ? formatDate(
                                                                lastOrder.created_at
                                                            )
                                                            : '-'
                                                    }

                                                </td>


                                                <td>

                                                    <button
                                                        className="cliente-view-button"
                                                        onClick={() =>
                                                            openCustomer(
                                                                customer.id
                                                            )
                                                        }
                                                    >
                                                        Ver detalhes
                                                    </button>

                                                </td>

                                            </tr>

                                        );

                                    }
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>


            {/* =================================================
                MODAL
            ================================================= */}

            {selectedCustomer && (

                <div
                    className="cliente-modal-overlay"
                    onClick={
                        closeCustomer
                    }
                >

                    <div
                        className="cliente-modal"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <div className="cliente-modal-header">

                            <div>

                                <h2>
                                    {
                                        selectedCustomer.name ||
                                        'Cliente'
                                    }
                                </h2>

                                <p>
                                    {
                                        selectedCustomer.phone ||
                                        'Sem telefone'
                                    }
                                </p>

                            </div>


                            <button
                                className="cliente-modal-close"
                                onClick={
                                    closeCustomer
                                }
                            >
                                ×
                            </button>

                        </div>


                        {loadingDetails ? (

                            <div className="cliente-modal-loading">

                                Carregando...

                            </div>

                        ) : (

                            <>

                                <div className="cliente-detail-stats">

                                    <div>

                                        <span>
                                            Pedidos
                                        </span>

                                        <strong>
                                            {
                                                (
                                                    selectedCustomer.orders ||
                                                    []
                                                ).length
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Total gasto
                                        </span>

                                        <strong>
                                            {
                                                formatCurrency(
                                                    (
                                                        selectedCustomer.orders ||
                                                        []
                                                    ).reduce(
                                                        (
                                                            sum,
                                                            order
                                                        ) =>
                                                            sum +
                                                            Number(
                                                                order.total ||
                                                                0
                                                            ),
                                                        0
                                                    )
                                                )
                                            }
                                        </strong>

                                    </div>

                                </div>


                                <div className="cliente-history">

                                    <h3>
                                        Histórico de pedidos
                                    </h3>


                                    {
                                        (
                                            selectedCustomer.orders ||
                                            []
                                        ).length === 0 ? (

                                            <p className="cliente-no-orders">

                                                Este cliente ainda não possui pedidos.

                                            </p>

                                        ) : (

                                            <div className="cliente-orders-list">

                                                {[
                                                    ...(
                                                        selectedCustomer.orders ||
                                                        []
                                                    )
                                                ]
                                                    .sort(
                                                        (
                                                            a,
                                                            b
                                                        ) =>
                                                            new Date(
                                                                b.created_at
                                                            ) -
                                                            new Date(
                                                                a.created_at
                                                            )
                                                    )
                                                    .map(
                                                        order => (

                                                            <div
                                                                className="cliente-order-row"
                                                                key={
                                                                    order.id
                                                                }
                                                            >

                                                                <div>

                                                                    <strong>
                                                                        Pedido #
                                                                        {
                                                                            order.id
                                                                                .slice(
                                                                                    0,
                                                                                    8
                                                                                )
                                                                        }
                                                                    </strong>

                                                                    <span>
                                                                        {
                                                                            formatDate(
                                                                                order.created_at
                                                                            )
                                                                        }
                                                                    </span>

                                                                </div>


                                                                <div>

                                                                    <strong>
                                                                        {
                                                                            formatCurrency(
                                                                                order.total
                                                                            )
                                                                        }
                                                                    </strong>

                                                                    <span
                                                                        className={
                                                                            `cliente-order-status cliente-status-${order.status}`
                                                                        }
                                                                    >
                                                                        {
                                                                            order.status === 'pending'
                                                                                ? 'Pendente'
                                                                                : order.status === 'preparing'
                                                                                    ? 'Em preparação'
                                                                                    : order.status === 'ready'
                                                                                        ? 'Pronto'
                                                                                        : order.status === 'completed'
                                                                                            ? 'Concluído'
                                                                                            : order.status
                                                                        }
                                                                    </span>

                                                                </div>

                                                            </div>

                                                        )
                                                    )}

                                            </div>

                                        )
                                    }

                                </div>

                            </>

                        )}

                    </div>

                </div>

            )}

        </div>

    );
}


export default Clientes;