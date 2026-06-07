const fs = require('fs');

let adminCode = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add fetchSettings, settings, setSettings to useCRMStore
adminCode = adminCode.replace(
  'const { clients, fetchAdminClients, markClientsAsExported } = useCRMStore();',
  'const { clients, fetchAdminClients, markClientsAsExported, settings, setSettings, fetchSettings } = useCRMStore();'
);

// 2. Add fetchSettings(password) when logging in? No, fetchSettings doesn't take password, it gets global settings. But wait, API requires auth. The user is logged in, so fetchSettings will work.
adminCode = adminCode.replace(
  'fetchGlobalPrompt(password);',
  'fetchGlobalPrompt(password);\n      fetchSettings();'
);

// 3. Inject the settings UI blocks right before "Tabela de Leads" section.
const settingsBlocks = `
        {/* Configurações do CRM */}
        <div className="glass-panel p-6 border border-surface-border relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-white">Configurações de Automação e CRM</h2>
            </div>
            
            <div className="space-y-6">
              {/* Tempo sem resposta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Tempo de Retorno Rápido</h3>
                  <p className="text-sm text-gray-400">Minutos sem resposta do cliente antes de alertar ou mudar status automaticamente.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="1440"
                    value={settings.minutesWithoutResponse || ''}
                    onChange={(e) => setSettings({ minutesWithoutResponse: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">min</span>
                </div>
              </div>

              {/* Insistência da IA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Insistência da IA</h3>
                  <p className="text-sm text-gray-400">Tempo em horas para a IA enviar automaticamente nova mensagem.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="72"
                    value={settings.followUpIntervalHours || ''}
                    onChange={(e) => setSettings({ followUpIntervalHours: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">horas</span>
                </div>
              </div>

              {/* Dias Padrão para Reposição */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Dias Padrão para Reposição</h3>
                  <p className="text-sm text-gray-400">Dias após a compra para mover cliente para "Reposição".</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="365"
                    value={settings.reposicao_days_global || ''}
                    onChange={(e) => setSettings({ reposicao_days_global: e.target.value === '' ? 30 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">dias</span>
                </div>
              </div>

              {/* Limite de Repetições */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Limite de Repetições (Insistência)</h3>
                  <p className="text-sm text-gray-400">Quantidade máxima de vezes para retomar contato em horas.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="10"
                    value={settings.insistenciaMaxRepetitions || ''}
                    onChange={(e) => setSettings({ insistenciaMaxRepetitions: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">tentativas</span>
                </div>
              </div>

              {/* Insistência por Dias */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border/50">
                <div className="mb-2 sm:mb-0 pr-4">
                  <h3 className="text-base font-semibold text-white">Insistência por Dias (Após limite)</h3>
                  <p className="text-sm text-gray-400">Após atingir limite de repetições, IA tentará contato a cada X dias.</p>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <input 
                    type="number" min="1" max="30"
                    value={settings.insistenciaDaysInterval || ''}
                    onChange={(e) => setSettings({ insistenciaDaysInterval: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-24 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="ml-3 text-gray-400 text-sm">dias</span>
                </div>
              </div>

              {/* Nomes das Colunas do Kanban */}
              <div className="flex flex-col pb-4">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-white">Nomes das Colunas do Kanban</h3>
                  <p className="text-sm text-gray-400">Personalize os nomes de exibição dos estágios.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {['Novo', 'Contato Feito', 'Em Qualificação', 'Proposta Enviada', 'Finalizado', 'Reposição', 'Perdido'].map((status) => (
                    <div key={status}>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{status}</label>
                      <input 
                        type="text" 
                        placeholder={status}
                        value={settings.kanbanColumnNames?.[status] || ''}
                        onChange={(e) => setSettings({ 
                          kanbanColumnNames: { 
                            ...(settings.kanbanColumnNames || {}), 
                            [status]: e.target.value 
                          } 
                        })}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

`;

adminCode = adminCode.replace('{/* Tabela de Leads */}', settingsBlocks + '        {/* Tabela de Leads */}');

fs.writeFileSync('src/app/admin/page.tsx', adminCode);
console.log('Fixed admin/page.tsx successfully');
