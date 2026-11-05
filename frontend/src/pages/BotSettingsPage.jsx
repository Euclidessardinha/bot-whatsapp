import './BotSettingsPage.css';

function BotSettingsPage() {
    return (
        <div className="bot-settings-page">

            <div className="bot-settings-header">
                <h1>🤖 Configurações do Bot</h1>

                <p>
                    Controle o funcionamento do atendimento
                    automático do seu restaurante.
                </p>
            </div>

            <div className="settings-card">

                <div className="setting-info">
                    <div className="setting-icon">
                        🤖
                    </div>

                    <div>
                        <h2>Bot automático</h2>

                        <p>
                            Ative ou desative o atendimento
                            automático do restaurante.
                        </p>
                    </div>
                </div>

                <button className="bot-toggle">
                    <span className="toggle-circle"></span>
                    ON
                </button>

            </div>

        </div>
    );
}

export default BotSettingsPage;