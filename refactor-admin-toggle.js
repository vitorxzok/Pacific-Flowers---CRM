const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/app/admin/page.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add loading states
const stateSearch = "const [isSavingSettings, setIsSavingSettings] = useState(false);";
const stateReplace = `const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [isDeactivatingAll, setIsDeactivatingAll] = useState(false);`;
code = code.replace(stateSearch, stateReplace);

// 2. Add handleToggleGlobalAI function
const handlerHtml = `  const handleToggleGlobalAI = async (enabled: boolean) => {
    if (enabled) setIsActivatingAll(true);
    else setIsDeactivatingAll(true);
    
    const toastId = toast.loading(enabled ? 'Ativando IA para todos...' : 'Desativando IA para todos...');
    try {
      const res = await fetch('/api/admin/global-ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) throw new Error('Falha');
      const data = await res.json();
      toast.success(\`IA \${enabled ? 'ativada' : 'desativada'} para \${data.count} operadores!\`, { id: toastId });
    } catch (err) {
      toast.error('Erro ao alterar configuração global da IA.', { id: toastId });
    } finally {
      if (enabled) setIsActivatingAll(false);
      else setIsDeactivatingAll(false);
    }
  };

  const handleLogin`;

code = code.replace("  const handleLogin", handlerHtml);

// 3. Add UI block
const uiHtml = `        {/* Controle Global da IA */}
        <div className="glass-panel p-6 border border-surface-border relative overflow-hidden mb-6">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Controle Global da IA (Operadores)</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Use estes botões para ativar ou desativar o <strong>Atendimento Automático da IA</strong> para TODOS os operadores do sistema de uma única vez. 
              Após a alteração, cada operador ainda poderá ligar/desligar individualmente em seu próprio painel.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleToggleGlobalAI(true)}
                disabled={isActivatingAll || isDeactivatingAll}
                className="px-6 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isActivatingAll ? 'Ativando...' : 'Ligar IA para Todos'}
              </button>
              <button
                onClick={() => handleToggleGlobalAI(false)}
                disabled={isActivatingAll || isDeactivatingAll}
                className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeactivatingAll ? 'Desativando...' : 'Desligar IA para Todos'}
              </button>
            </div>
          </div>
        </div>

        {/* Configurações do CRM */}`;

code = code.replace("{/* Configurações do CRM */}", uiHtml);

fs.writeFileSync(targetFile, code);
console.log('Script executado!');
