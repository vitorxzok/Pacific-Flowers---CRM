'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, Check, X, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface Product {
  id: string;
  name: string;
  price: number;
  code: string | null;
  min_quantity: number;
  active: boolean;
}

export default function ProdutosPage() {
  const [mounted, setMounted] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newMinQuantity, setNewMinQuantity] = useState('1');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMinQuantity, setEditMinQuantity] = useState('');

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
          min_quantity: parseInt(newMinQuantity) || 1,
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
      setNewMinQuantity('1');
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
    setEditMinQuantity((p.min_quantity || 1).toString());
  };

  const saveEdit = async (id: string) => {
    const toastId = toast.loading('Salvando...');
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ 
          name: editName, 
          price: parseFloat(editPrice.replace(',', '.')),
          min_quantity: parseInt(editMinQuantity) || 1
        })
        .eq('id', id);

      if (error) throw error;

      setProdutos(produtos.map(p => p.id === id ? { 
        ...p, 
        name: editName, 
        price: parseFloat(editPrice.replace(',', '.')),
        min_quantity: parseInt(editMinQuantity) || 1
      } : p));
      setEditingId(null);
      toast.success('Salvo!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar', { id: toastId });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const validProducts = rows.map(row => {
          // Flexible mapping based on common column names
          const code = row['código'] || row['codigo'] || row['code'] || row['cod'] || row['Código'] || row['Codigo'] || null;
          const name = row['descrição'] || row['descricao'] || row['nome'] || row['name'] || row['description'] || row['Descrição'] || row['Descricao'] || row['Nome'] || '';
          const rawPrice = row['preço unitário'] || row['preco unitario'] || row['preço'] || row['preco'] || row['price'] || row['Preço Unitário'] || row['Preco Unitario'] || row['Preço'] || row['Preco'] || '0';
          const priceStr = String(rawPrice).replace('R$', '').trim().replace(',', '.');
          const price = parseFloat(priceStr) || 0;
          const rawMin = row['quantidade mínima'] || row['quantidade minima'] || row['qtd'] || row['quantidade'] || row['min'] || row['Quantidade Mínima'] || row['Quantidade Minima'] || row['Qtd Mínima'] || '1';
          const minQuantity = parseInt(String(rawMin), 10) || 1;

          return {
            code,
            name,
            price,
            min_quantity: minQuantity,
            active: true
          };
        }).filter(p => p.name && p.price > 0);

        if (validProducts.length === 0) {
          toast.error('Nenhum produto válido encontrado. Verifique se a planilha tem cabeçalhos como: Código, Descrição, Quantidade Mínima, Preço.');
          return;
        }

        const toastId = toast.loading(`Importando ${validProducts.length} produtos...`);
        try {
          const { data, error } = await supabase.from('produtos').insert(validProducts).select();
          if (error) throw error;
          
          toast.success(`${validProducts.length} produtos importados com sucesso!`, { id: toastId });
          setProdutos([...produtos, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error: any) {
          toast.error('Erro ao importar. Verifique se o formato está correto.', { id: toastId });
          console.error(error);
        }
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        toast.error('Erro ao ler arquivo CSV');
        console.error(error);
      }
    });
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
        <div className="flex gap-3">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors font-medium border border-surface-border"
          >
            <Upload className="w-5 h-5" />
            Importar CSV
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
          >
            {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showAddForm ? 'Cancelar' : 'Novo Produto'}
          </button>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto w-full">
        {showAddForm && (
          <form onSubmit={handleAddProduct} className="glass-panel p-6 mb-8 border border-primary/30 shadow-[0_0_15px_rgba(30,215,96,0.1)]">
            <h3 className="text-lg font-bold text-white mb-4">Adicionar Novo Produto</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Código (Opcional)</label>
                <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ex: COD-01" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Rosa Vermelha" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                <input required type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Ex: 15.00" className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Qtd Mínima</label>
                <input required type="number" min="1" value={newMinQuantity} onChange={e => setNewMinQuantity(e.target.value)} className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" />
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
                Você ainda não tem produtos no banco de dados. Adicione o primeiro produto ou importe uma planilha (CSV) para começar!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-hover/30">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qtd Mín</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preço Un.</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {produtos.map(p => (
                    <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400">
                        {p.code || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === p.id ? (
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-surface border border-surface-border rounded px-2 py-1 text-white w-full" />
                        ) : (
                          <div className="font-medium text-white">{p.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === p.id ? (
                          <input type="number" min="1" value={editMinQuantity} onChange={e => setEditMinQuantity(e.target.value)} className="bg-surface border border-surface-border rounded px-2 py-1 text-white w-20" />
                        ) : (
                          <span className="text-gray-300">{p.min_quantity || 1}</span>
                        )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
