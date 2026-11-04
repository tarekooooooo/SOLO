import React, { useState } from 'react';
import { X, Plus, Trash2, Key, Gamepad2, Layers } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory, ProductPackage } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose }) => {
  const { addProduct } = useStore();

  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [category, setCategory] = useState<ProductCategory>('game_currency');
  const [platform, setPlatform] = useState<'pubg' | 'steam' | 'playstation' | 'xbox' | 'freefire' | 'roblox' | 'other'>('pubg');
  const [description, setDescription] = useState('');
  const [deliveryType, setDeliveryType] = useState<'instant_code' | 'direct_id_recharge' | 'manual_service'>('direct_id_recharge');

  const [packages, setPackages] = useState<ProductPackage[]>([
    { id: 'pkg-1', name: 'باقة أساسية (Basic)', amount: 100, priceUSD: 1.99 },
    { id: 'pkg-2', name: 'باقة مميزة (Plus)', amount: 500, priceUSD: 8.99, bonus: '+50 مجاناً' },
  ]);

  const [newCodesInput, setNewCodesInput] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const handleAddPackage = () => {
    const newId = `pkg-${Date.now()}`;
    setPackages([
      ...packages,
      { id: newId, name: 'باقة جديدة', amount: 100, priceUSD: 4.99 },
    ]);
  };

  const handleRemovePackage = (id: string) => {
    if (packages.length <= 1) return;
    setPackages(packages.filter((p) => p.id !== id));
  };

  const handlePackageChange = (id: string, field: keyof ProductPackage, value: any) => {
    setPackages(
      packages.map((pkg) => (pkg.id === id ? { ...pkg, [field]: value } : pkg))
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim()) return;

    // Attach any entered codes
    const finalPackages = packages.map((pkg) => {
      const rawCodes = newCodesInput[pkg.id] || '';
      const parsed = rawCodes
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      return {
        ...pkg,
        availableCodes: parsed,
      };
    });

    addProduct({
      title: title || titleAr,
      titleAr,
      category,
      platform,
      image: '/assets/aistudio/file_000000007e1c81f5ba66efa05ab9f2e5_0ba40384.png',
      description: description || 'منتج رقمي عالي الجودة مع تسليم فوري وضمان متجر طارق ستور.',
      rating: 5.0,
      deliveryType,
      packages: finalPackages,
      merchantId: 'm-tarek',
      merchantName: 'متجر طارق الرسمي',
      inStock: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a0f1d] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إضافة منتج رقمي جديد للمتجر</h3>
              <p className="text-xs text-slate-400">حدد نوع التسليم، الأسعار بالدولار وبنك الأكواد الرقمية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">اسم المنتج (بالعربية) *</label>
              <input
                type="text"
                required
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="مثال: شحن جواهر فري فاير"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">الاسم بالإنجليزية</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Free Fire Diamonds"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">القسم</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="game_currency">عملات داخل الألعاب</option>
                <option value="cards">بطاقات رقمية وشحن</option>
                <option value="games">ألعاب رقمية كاملة</option>
                <option value="services">خدمات اللاعبين والحسابات</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">المنصة</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="pubg">PUBG Mobile</option>
                <option value="steam">Steam PC</option>
                <option value="playstation">PlayStation</option>
                <option value="xbox">Xbox</option>
                <option value="freefire">Free Fire</option>
                <option value="roblox">Roblox</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">آلية التسليم</label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
              >
                <option value="direct_id_recharge">شحن مباشر عبر الآيدي (Player ID)</option>
                <option value="instant_code">كود رقمي فوري (Pin Bank)</option>
                <option value="manual_service">تجهيز يدوي / خدمة خاصة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">وصف المنتج</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفاً مفصلاً لطريقة الاستخدام أو الشحن..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Packages & Pricing List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                باقات وأسعار المنتج (Packages):
              </span>
              <button
                type="button"
                onClick={handleAddPackage}
                className="text-xs px-2.5 py-1 rounded bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة باقة
              </button>
            </div>

            <div className="space-y-3">
              {packages.map((pkg, idx) => (
                <div key={pkg.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">اسم الباقة</span>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => handlePackageChange(pkg.id, 'name', e.target.value)}
                        placeholder="مثال: 600 شدة"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">السعر (بالدولار USD)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={pkg.priceUSD}
                        onChange={(e) => handlePackageChange(pkg.id, 'priceUSD', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-cyan-400"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block">مكافأة إضافية (اختياري)</span>
                        <input
                          type="text"
                          value={pkg.bonus || ''}
                          onChange={(e) => handlePackageChange(pkg.id, 'bonus', e.target.value)}
                          placeholder="+60 مجاناً"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100"
                        />
                      </div>
                      {packages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(pkg.id)}
                          className="p-2 text-slate-400 hover:text-red-400 rounded bg-slate-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {deliveryType === 'instant_code' && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <label className="text-[11px] text-cyan-300 font-semibold block mb-1 flex items-center gap-1">
                        <Key className="w-3 h-3" /> بنك الأكواد الرقمية (أدخل كل كود في سطر جديد):
                      </label>
                      <textarea
                        rows={2}
                        value={newCodesInput[pkg.id] || ''}
                        onChange={(e) => setNewCodesInput({ ...newCodesInput, [pkg.id]: e.target.value })}
                        placeholder="CODE-1234-5678&#10;CODE-9876-5432"
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md shadow-cyan-600/30"
            >
              حفظ ونشر المنتج في المتجر
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
