'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  code: string | null;
  active: boolean;
}

export default function ProdutosPage() {
  const [mounted, setMounted] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const supabase = createClient();

  // Form states
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCode, setNewCode] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('name');
      
      if (error) {
        // Tabela não existe ou outro erro
        console.error(error);
        toast.error('Erro ao buscar produtos. A tabela foi criada no Supabase?');
        return;
      }
      
      setProdutos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    
    const toastId = toast.loading('Adicionando...');
    try {
      const { data, error } = await supabase.from('produtos').insert([
        { 
          name: newName, 
          price: parseFloat(newPrice.replace(',', '.')), 
          code: newCode || null,
          active: true
        }
      ]).select();

      if (error) throw error;

      toast.success('Produto adicionado!', { id: toastId });
      setProdutos([...produtos, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddForm(false);
      setNewName('');
      setNewPrice('');
      setNewCode('');
    } catch (error: any) {
      toast.error('Erro ao adicionar produto', { id: toastId });
      console.error(error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setProdutos(produtos.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      toast.success(currentStatus ? 'Produto desativado' : 'Produto ativado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      setProdutos(produtos.filter(p => p.id !== id));
      toast.success('Produto excluído');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir');
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(p.price.toString());
  };

  const saveEdit = async (id: string) => {
    const toastId = toast.loading('Salvando...');
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ name: editName, price: parseFloat(editPrice.replace(',', '.')) })
        .eq('id', id);

      if (error) throw error;

      setProdutos(produtos.map(p => p.id === id ? { ...p, name: editName, price: parseFloat(editPrice.replace(',', '.')) } : p));
      setEditingId(null);
      toast.success('Salvo!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar', { id: toastId });
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <header className="px-8 py-6 border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-white">Produtos</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Gerencie a tabela de preços que a IA utilizará nos orçamentos</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? 'Cancelar' : 'Novo Produto'}
        </button>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full">
        {showAddForm && (
          <form onSubmit={handleAddProduct} className="glass-panel p-6 mb-8 border border-primary/30 shadow-[0_0_15px_rgba(30,215,96,0.1)]">
            <h3 className="text-lg font-bold text-white mb-4">Adicionar Novo Produto</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Produto</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Rosa Vermelha (Pacote)" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                <input required type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Ex: 15.00" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Código (Opcional)</label>
                <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ex: ROSA-01" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg">Salvar Produto</button>
            </div>
          </form>
        )}

        <div className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Carregando catálogo de produtos...</div>
          ) : produtos.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <ShoppingBag className="w-12 h-12 text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum produto cadastrado</h3>
              <p className="text-gray-400 max-w-md">
                Você ainda não tem produtos no banco de dados. Adicione o primeiro produto para que a IA possa começar a enviar orçamentos automáticos!
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-surface-hover/30">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preço</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {produtos.map(p => (
                  <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === p.id ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-surface border border-surface-border rounded px-2 py-1 text-white w-full" />
                      ) : (
                        <div className="font-medium text-white">{p.name}</div>
                      )}
                      {p.code && <div className="text-xs text-gray-500 mt-1">{p.code}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id ? (
                        <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="bg-surface border border-surface-border rounded px-2 py-1 text-white w-24" />
                      ) : (
                        <span className="text-emerald-400 font-medium">R$ {p.price.toFixed(2).replace('.', ',')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(p.id, p.active)}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}
                      >
                        {p.active ? 'Ativo na IA' : 'Pausado'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {editingId === p.id ? (
                          <>
                            <button onClick={() => saveEdit(p.id)} className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-surface-border text-gray-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-white bg-surface hover:bg-surface-border rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
