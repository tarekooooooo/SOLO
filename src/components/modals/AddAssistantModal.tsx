import React, { useState } from 'react';
import { X, UserPlus, Shield, Check, Mail, Phone, User, Briefcase } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface AddAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAssistantModal: React.FC<AddAssistantModalProps> = ({ isOpen, onClose }) => {
  const { addAssistant } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('مساعد تجهيز وشحن طلبات');
  const [permissions, setPermissions] = useState<Array<'fulfill_orders' | 'customer_support' | 'manage_products' | 'manage_wallet' | 'view_analytics'>>([
    'fulfill_orders',
    'customer_support',
  ]);

  if (!isOpen) return null;

  const togglePermission = (perm: 'fulfill_orders' | 'customer_support' | 'manage_products' | 'manage_wallet' | 'view_analytics') => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addAssistant({
      name,
      email,
      phone: phone || '+966500000000',
      roleTitle,
      permissions,
      status: 'active',
    });

    onClose();
    setName('');
    setEmail('');
    setPhone('');
  };

  const permissionOptions = [
    { id: 'fulfill_orders', label: 'تجهيز وشحن طلبات العملاء (Player ID & الأكواد)', desc: 'السماح بمعالجة وتأكيد إرسال الشحنات' },
    { id: 'customer_support', label: 'الرد على خدمة العملاء ومحادثات الدعم', desc: 'استلام التذاكر وحل استفسارات العملاء' },
    { id: 'manage_products', label: 'إدارة وتحديث المنتجات والمخزون', desc: 'إضافة المنتجات وإدخال الأكواد إلى بنك الأكواد' },
    { id: 'manage_wallet', label: 'إدارة المعاملات المالية والمحفظة', desc: 'مراجعة طلبات السحب والشحن' },
    { id: 'view_analytics', label: 'الاطلاع على التقارير والإحصائيات العامة', desc: 'متابعة أرقام المبيعات والأرباح' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a0f1d] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تعيين مساعد أو موظف جديد</h3>
              <p className="text-xs text-slate-400">حدد المسمى الوظيفي والصلاحيات الممنوحة للمساعد</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">اسم المساعد الكامل *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: عبد الله السبيعي"
                className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">البريد الإلكتروني للعمل *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="assistant@tarekstor.com"
                  className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">رقم الهاتف / واتساب</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5x xxx xxxx"
                  className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">المسمى الوظيفي والدور</label>
            <select
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="مساعد تجهيز وشحن طلبات">مساعد تجهيز وشحن طلبات (Order Fulfillment)</option>
              <option value="مشرف خدمة عملاء ودعم فني">مشرف خدمة عملاء ودعم فني (Customer Support)</option>
              <option value="مسؤول بنك الأكواد والمخزون">مسؤول بنك الأكواد والمخزون (Stock Manager)</option>
              <option value="نائب مدير متجر عام">نائب مدير متجر عام (Deputy Store Manager)</option>
            </select>
          </div>

          {/* Permissions Section */}
          <div className="pt-2">
            <label className="text-slate-200 font-bold block mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>الصلاحيات الممنوحة للمساعد في لوحة التحكم:</span>
            </label>
            <div className="space-y-2">
              {permissionOptions.map((opt) => {
                const isChecked = permissions.includes(opt.id as any);
                return (
                  <div
                    key={opt.id}
                    onClick={() => togglePermission(opt.id as any)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isChecked
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 ${
                      isChecked ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-700'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block">{opt.label}</span>
                      <span className="text-[10px] text-slate-400">{opt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-md shadow-cyan-600/20"
            >
              تأكيد تعيين المساعد
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
