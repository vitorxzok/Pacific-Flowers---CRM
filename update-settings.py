import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Settings as SettingsIcon, Save, MessageSquare } from 'lucide-react';",
    "import { Settings as SettingsIcon, Save, MessageSquare, Paperclip, Trash2, Plus, UploadCloud } from 'lucide-react';\nimport { v4 as uuidv4 } from 'uuid';\nimport { Attachment } from '@/types';"
)

# 2. Add state and functions
hook_insert_point = "  const [isImporting, setIsImporting] = useState(false);"
functions_to_add = """  const [isUploading, setIsUploading] = useState(false);

  const handleAddAttachment = () => {
    const newAttachment: Attachment = { id: uuidv4(), trigger: '', url: '', name: '', type: 'document' };
    setLocalSettings({
      ...localSettings,
      attachments: [...(localSettings.attachments || []), newAttachment]
    });
  };

  const handleUpdateAttachment = (id: string, field: keyof Attachment, value: string) => {
    const updated = (localSettings.attachments || []).map(a => 
      a.id === id ? { ...a, [field]: value } : a
    );
    setLocalSettings({ ...localSettings, attachments: updated });
  };

  const handleRemoveAttachment = (id: string) => {
    const updated = (localSettings.attachments || []).filter(a => a.id !== id);
    setLocalSettings({ ...localSettings, attachments: updated });
  };

  const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Fazendo upload...');
    
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `anexos/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file);
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      
      handleUpdateAttachment(id, 'url', publicUrl);
      handleUpdateAttachment(id, 'name', file.name);
      
      toast.success('Upload concluído!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error('Erro no upload: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };"""

content = content.replace(hook_insert_point, hook_insert_point + "\n\n" + functions_to_add)

# 3. Add UI section before Importar Leads
ui_insert_point = "{/* Importar Leads */}"
ui_to_add = """{/* Anexos e Gatilhos da IA */}
          <div className="flex flex-col border-b border-surface-border pb-8 mb-8">
            <div className="mb-6 flex justify-between items-start sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-primary" /> Anexos e Gatilhos da IA
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Faça o upload de catálogos e fotos de kits e defina um "Gatilho" para a IA enviar automaticamente. Ex: "CATALOGO", "KIT_350".
                </p>
              </div>
              <button
                onClick={handleAddAttachment}
                className="flex items-center gap-2 px-3 py-2 bg-surface-hover hover:bg-surface-border text-white text-sm font-medium rounded-lg transition-colors border border-surface-border"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            
            <div className="space-y-4">
              {(localSettings.attachments || []).length === 0 ? (
                <div className="text-center py-6 bg-surface rounded-lg border border-surface-border border-dashed">
                  <p className="text-gray-400 text-sm">Nenhum anexo configurado.</p>
                </div>
              ) : (
                (localSettings.attachments || []).map((attachment) => (
                  <div key={attachment.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-surface rounded-lg border border-surface-border">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Nome do Gatilho (Ex: CATALOGO)</label>
                      <input 
                        type="text" 
                        value={attachment.trigger}
                        onChange={(e) => handleUpdateAttachment(attachment.id, 'trigger', e.target.value.toUpperCase())}
                        placeholder="CATALOGO_PRINCIPAL"
                        className="w-full bg-background border border-surface-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Arquivo (Upload ou Link)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={attachment.url}
                          onChange={(e) => handleUpdateAttachment(attachment.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-background border border-surface-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <div className="relative flex-shrink-0">
                          <input 
                            type="file"
                            onChange={(e) => handleUploadAttachment(e, attachment.id)}
                            className="hidden"
                            id={`upload-${attachment.id}`}
                            disabled={isUploading}
                          />
                          <label 
                            htmlFor={`upload-${attachment.id}`}
                            className="flex items-center justify-center w-10 h-10 bg-surface-hover hover:bg-surface-border border border-surface-border rounded-md cursor-pointer transition-colors"
                            title="Fazer Upload"
                          >
                            <UploadCloud className="w-4 h-4 text-gray-300" />
                          </label>
                        </div>
                      </div>
                      {attachment.name && (
                        <p className="text-xs text-primary mt-1 truncate">Arquivo: {attachment.name}</p>
                      )}
                    </div>
                    <div className="flex items-end pb-[2px]">
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          """

content = content.replace(ui_insert_point, ui_to_add + ui_insert_point)

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings page successfully")
