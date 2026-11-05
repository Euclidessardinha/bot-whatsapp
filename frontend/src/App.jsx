
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from 'react-router-dom';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

import Pedidos from './pages/Pedidos';
import Bot from './pages/Bot';
import Empresa from './pages/Empresa';
import Produtos from './pages/Produtos';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Clientes from './pages/Clientes';
import WhatsApp from './pages/WhatsApp';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Servicos from './pages/Servicos';
import Onboarding from './pages/Onboarding';


function App() {

    const [authLoading, setAuthLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [onboardingCompleted, setOnboardingCompleted] = useState(null);


    useEffect(() => {

        let mounted = true;


        async function checkAuthentication() {

            try {

                const {
                    data: {
                        user: currentUser
                    },
                    error: userError
                } = await supabase.auth.getUser();


                if (userError) {
                    throw userError;
                }


                if (!mounted) {
                    return;
                }


                setUser(currentUser);


                /*
                 * =================================================
                 * UTILIZADOR NÃO AUTENTICADO
                 * =================================================
                 */

                if (!currentUser) {

                    setOnboardingCompleted(null);
                    setAuthLoading(false);

                    return;
                }


                /*
                 * =================================================
                 * BUSCAR PERFIL
                 * =================================================
                 */

                const {
                    data: profile,
                    error: profileError
                } = await supabase
                    .from('profiles')
                    .select(`
                        onboarding_completed
                    `)
                    .eq('id', currentUser.id)
                    .single();


                if (profileError) {
                    throw profileError;
                }


                if (!mounted) {
                    return;
                }


                setOnboardingCompleted(
                    profile?.onboarding_completed === true
                );

            } catch (error) {

                console.error(
                    'Erro ao verificar autenticação:',
                    error
                );

                if (mounted) {

                    setUser(null);
                    setOnboardingCompleted(null);

                }

            } finally {

                if (mounted) {
                    setAuthLoading(false);
                }

            }

        }


        checkAuthentication();


        /*
         * =========================================================
         * OBSERVAR ALTERAÇÕES DE AUTENTICAÇÃO
         * =========================================================
         */

        const {
            data: {
                subscription
            }
        } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                if (!mounted) {
                    return;
                }


                const currentUser = session?.user || null;

                setUser(currentUser);


                if (!currentUser) {

                    setOnboardingCompleted(null);
                    setAuthLoading(false);

                    return;
                }


                try {

                    const {
                        data: profile,
                        error
                    } = await supabase
                        .from('profiles')
                        .select(`
                            onboarding_completed
                        `)
                        .eq('id', currentUser.id)
                        .single();


                    if (error) {
                        throw error;
                    }


                    if (mounted) {

                        setOnboardingCompleted(
                            profile?.onboarding_completed === true
                        );

                    }

                } catch (error) {

                    console.error(
                        'Erro ao atualizar perfil:',
                        error
                    );

                    if (mounted) {
                        setOnboardingCompleted(false);
                    }

                } finally {

                    if (mounted) {
                        setAuthLoading(false);
                    }

                }

            }
        );


        return () => {

            mounted = false;

            subscription.unsubscribe();

        };

    }, []);


    /*
     * =============================================================
     * LOADING INICIAL
     * =============================================================
     */

    if (authLoading) {

        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#08090d',
                    color: '#8f929d',
                    fontFamily: 'Arial, sans-serif'
                }}
            >
                A carregar...
            </div>
        );

    }


    return (

        <BrowserRouter>

            <Routes>

                {/* =================================================
                    LOGIN
                ================================================= */}

                <Route
                    path="/"
                    element={
                        user
                            ? (
                                onboardingCompleted
                                    ? (
                                        <Navigate
                                            to="/dashboard"
                                            replace
                                        />
                                    )
                                    : (
                                        <Navigate
                                            to="/onboarding"
                                            replace
                                        />
                                    )
                            )
                            : (
                                <Login />
                            )
                    }
                />


                {/* =================================================
                    CADASTRO
                ================================================= */}

                <Route
                    path="/register"
                    element={
                        user
                            ? (
                                <Navigate
                                    to={
                                        onboardingCompleted
                                            ? "/dashboard"
                                            : "/onboarding"
                                    }
                                    replace
                                />
                            )
                            : (
                                <Register />
                            )
                    }
                />


                {/* =================================================
                    ONBOARDING
                ================================================= */}

                <Route
                    path="/onboarding"
                    element={
                        user
                            ? (
                                onboardingCompleted
                                    ? (
                                        <Navigate
                                            to="/dashboard"
                                            replace
                                        />
                                    )
                                    : (
                                        <Onboarding />
                                    )
                            )
                            : (
                                <Navigate
                                    to="/"
                                    replace
                                />
                            )
                    }
                />


                {/* =================================================
                    PAINEL
                ================================================= */}

                <Route
                    element={
                        user && onboardingCompleted
                            ? (
                                <Layout />
                            )
                            : (
                                <Navigate
                                    to={
                                        user
                                            ? "/onboarding"
                                            : "/"
                                    }
                                    replace
                                />
                            )
                    }
                >

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/empresa"
                        element={<Empresa />}
                    />

                    <Route
                        path="/bot"
                        element={<Bot />}
                    />

                    <Route
                        path="/produtos"
                        element={<Produtos />}
                    />

                    <Route
                        path="/servicos"
                        element={<Servicos />}
                    />

                    <Route
                        path="/pedidos"
                        element={<Pedidos />}
                    />

                    <Route
                        path="/clientes"
                        element={<Clientes />}
                    />

                    <Route
                        path="/solicitacoes"
                        element={<Requests />}
                    />

                    <Route
                        path="/whatsapp"
                        element={<WhatsApp />}
                    />

                </Route>


                {/* =================================================
                    ROTA DESCONHECIDA
                ================================================= */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={
                                user
                                    ? (
                                        onboardingCompleted
                                            ? "/dashboard"
                                            : "/onboarding"
                                    )
                                    : "/"
                            }
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>

    );
}

export default App;
