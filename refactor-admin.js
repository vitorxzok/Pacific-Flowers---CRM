const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/app/admin/page.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add local settings state and save handler
const storeHook = "const { clients, fetchAdminClients, markClientsAsExported, settings, setSettings, fetchSettings } = useCRMStore();";
const newStates = `const { clients, fetchAdminClients, markClientsAsExported, settings, setSettings, fetchSettings } = useCRMStore();

  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0 && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    const toastId = toast.loading('Salvando configurações...');
    try {
      await setSettings(localSettings);
      toast.success('Configurações salvas com sucesso!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao salvar.', { id: toastId });
    } finally {
      setIsSavingSettings(false);
    }
  };`;
code = code.replace(storeHook, newStates);

// 2. Replace all inputs to use localSettings
code = code.replace(/value=\{settings\.minutesWithoutResponse \|\| ''\}/g, "value={localSettings?.minutesWithoutResponse || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{ minutesWithoutResponse: e\.target\.value === '' \? 0 : parseInt\(e\.target\.value\) \}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, minutesWithoutResponse: e.target.value === '' ? 0 : parseInt(e.target.value) })}");

code = code.replace(/value=\{settings\.followUpIntervalHours \|\| ''\}/g, "value={localSettings?.followUpIntervalHours || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{ followUpIntervalHours: e\.target\.value === '' \? 0 : parseInt\(e\.target\.value\) \}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, followUpIntervalHours: e.target.value === '' ? 0 : parseInt(e.target.value) })}");

code = code.replace(/value=\{settings\.reposicao_days_global \|\| ''\}/g, "value={localSettings?.reposicao_days_global || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{ reposicao_days_global: e\.target\.value === '' \? 30 : parseInt\(e\.target\.value\) \}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, reposicao_days_global: e.target.value === '' ? 30 : parseInt(e.target.value) })}");

code = code.replace(/value=\{settings\.insistenciaMaxRepetitions \|\| ''\}/g, "value={localSettings?.insistenciaMaxRepetitions || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{ insistenciaMaxRepetitions: e\.target\.value === '' \? 0 : parseInt\(e\.target\.value\) \}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, insistenciaMaxRepetitions: e.target.value === '' ? 0 : parseInt(e.target.value) })}");

code = code.replace(/value=\{settings\.insistenciaDaysInterval \|\| ''\}/g, "value={localSettings?.insistenciaDaysInterval || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{ insistenciaDaysInterval: e\.target\.value === '' \? 0 : parseInt\(e\.target\.value\) \}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, insistenciaDaysInterval: e.target.value === '' ? 0 : parseInt(e.target.value) })}");

code = code.replace(/value=\{settings\.kanbanColumnNames\?\.\[status\] \|\| ''\}/g, "value={localSettings?.kanbanColumnNames?.[status] || ''}");
code = code.replace(/onChange=\{\(e\) => setSettings\(\{[\s\S]*?kanbanColumnNames: \{[\s\S]*?\.\.\.\(settings\.kanbanColumnNames \|\| \{\}\),[\s\S]*?\[status\]: e\.target\.value[\s\S]*?\}[\s\S]*?\}\)\}/g, "onChange={(e) => setLocalSettings({ ...localSettings, kanbanColumnNames: { ...(localSettings?.kanbanColumnNames || {}), [status]: e.target.value } })}");

// 3. Add Save Button at the bottom of the section
const buttonHtml = `              <div className="mt-8 flex justify-end border-t border-surface-border/50 pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Leads */}`;

code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Tabela de Leads \*\/\}/g, buttonHtml);

fs.writeFileSync(targetFile, code);
console.log('Script executado com sucesso!');
