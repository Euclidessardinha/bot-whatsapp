import './Download.css';

function Download() {
    return (
        <main className="download-page">

            <section className="download-hero">

                <div className="download-badge">
                    ANDROID • DOWNLOAD GRATUITO
                </div>

                <div className="download-icon">
                    📱
                </div>

                <h1>
                    WhatsApp Bot
                    <span> no seu Android.</span>
                </h1>

                <p className="download-description">
                    Acompanhe o seu negócio, configure o atendimento
                    e tenha o seu WhatsApp Bot sempre consigo.
                </p>

                <a
                    className="download-button"
                    href="/downloads/whatsapp-bot.apk"
                    download
                >
                    <span>↓</span>
                    Baixar aplicativo Android
                </a>

                <p className="download-version">
                    Versão de teste • Android
                </p>

            </section>


            <section className="download-features">

                <div className="download-feature">
                    <span>🤖</span>
                    <h3>Automatize</h3>
                    <p>
                        Responda aos seus clientes automaticamente
                        através do WhatsApp.
                    </p>
                </div>

                <div className="download-feature">
                    <span>📊</span>
                    <h3>Gerencie</h3>
                    <p>
                        Acompanhe produtos, clientes, pedidos e
                        outras informações do seu negócio.
                    </p>
                </div>

                <div className="download-feature">
                    <span>📱</span>
                    <h3>Tenha mobilidade</h3>
                    <p>
                        Aceda ao seu sistema diretamente pelo
                        seu dispositivo Android.
                    </p>
                </div>

            </section>


            <section className="download-install">

                <div>
                    <span className="download-section-label">
                        INSTALAÇÃO
                    </span>

                    <h2>
                        Comece em poucos passos.
                    </h2>

                    <p>
                        Baixe o aplicativo e instale-o no seu
                        dispositivo Android.
                    </p>
                </div>

                <div className="download-steps">

                    <div className="download-step">
                        <strong>01</strong>
                        <div>
                            <h3>Baixe o APK</h3>
                            <p>
                                Clique no botão acima para iniciar
                                o download.
                            </p>
                        </div>
                    </div>

                    <div className="download-step">
                        <strong>02</strong>
                        <div>
                            <h3>Instale</h3>
                            <p>
                                Abra o arquivo baixado e siga as
                                instruções do Android.
                            </p>
                        </div>
                    </div>

                    <div className="download-step">
                        <strong>03</strong>
                        <div>
                            <h3>Abra o aplicativo</h3>
                            <p>
                                Inicie o WhatsApp Bot e comece
                                a utilizar a plataforma.
                            </p>
                        </div>
                    </div>

                </div>

            </section>


            <footer className="download-footer">
                <p>
                    WhatsApp Bot SaaS
                </p>

                <span>
                    Tecnologia para automatizar o seu negócio.
                </span>
            </footer>

        </main>
    );
}

export default Download;