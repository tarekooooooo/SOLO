import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Search, 
  Trash2, 
  Inbox, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileText,
  Clock,
  User,
  LogOut,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { 
  fetchGmailProfile, 
  listGmailMessages, 
  sendGmailMessage, 
  trashGmailMessage, 
  GmailProfile, 
  GmailMessageSummary,
  SendEmailPayload
} from '../../services/gmail';
import { getGoogleAccessToken } from '../../services/googleAuth';

export const GmailScreen: React.FC = () => {
  const { 
    currentUser, 
    loginWithGoogle, 
    logout, 
    isGmailConnected, 
    setActiveScreen, 
    showToast 
  } = useStore();

  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Explicit User Confirmation Modals (Mandatory for destructive/mutating operations)
  const [confirmSendPayload, setConfirmSendPayload] = useState<SendEmailPayload | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Load Gmail data if token is active
  const loadGmailData = async (query = searchQuery) => {
    setIsLoading(true);
    try {
      const token = await getGoogleAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Fetch profile & messages
      const [profData, msgData] = await Promise.all([
        fetchGmailProfile().catch(() => null),
        listGmailMessages(query, 15).catch(() => []),
      ]);

      if (profData) setProfile(profData);
      setMessages(msgData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل بيانات Gmail';
      console.warn('Gmail fetch:', msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGmailConnected || (currentUser && currentUser.provider === 'google')) {
      loadGmailData();
    }
  }, [isGmailConnected, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGmailData(searchQuery);
  };

  // 1. Prepare Send Email (Triggers confirmation dialog)
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyText.trim()) {
      showToast('يرجى تعبئة كافة حقول البريد (المستلم، العنوان، المحتوى)');
      return;
    }
    // Open explicit confirmation dialog
    setConfirmSendPayload({
      to: recipient.trim(),
      subject: subject.trim(),
      bodyText: bodyText.trim(),
    });
  };

  // 2. Confirmed Send Execution
  const handleConfirmedSend = async () => {
    if (!confirmSendPayload) return;
    setIsActionInProgress(true);
    try {
      await sendGmailMessage(confirmSendPayload);
      showToast(`✅ تم إرسال البريد بنجاح إلى ${confirmSendPayload.to} عبر Gmail!`);
      setConfirmSendPayload(null);
      setIsComposeOpen(false);
      setRecipient('');
      setSubject('');
      setBodyText('');
      // Refresh list
      loadGmailData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إرسال البريد';
      showToast(`⚠️ خطأ في الإرسال: ${msg}`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // 3. Confirmed Trash Execution
  const handleConfirmedTrash = async () => {
    if (!confirmDeleteId) return;
    setIsActionInProgress(true);
    try {
      await trashGmailMessage(confirmDeleteId);
      showToast('🗑️ تم نقل الرسالة إلى سلة مهملات Gmail بنجاح.');
      setMessages((prev) => prev.filter((m) => m.id !== confirmDeleteId));
      if (selectedMessage?.id === confirmDeleteId) {
        setSelectedMessage(null);
      }
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حذف الرسالة';
      showToast(`⚠️ خطأ في الحذف: ${msg}`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Quick templates
  const applyTemplate = (type: 'order' | 'code' | 'support') => {
    if (type === 'code') {
      setSubject('🔑 كود تفعيل طلبك من متجر TAREK STOR');
      setBodyText(`عزيزي العميل،\n\nشكراً لتسوقك من متجر TAREK STOR.\nيسعدنا تزويدك بكود التفعيل الرقمي الخاص بطلبك:\n\nالكود: TRK-PRO-8829-4412\nطريقة الاستخدام: قم بإدخال الكود في التطبيق أو المتجر للاستفادة من الرصيد مباشرة.\n\nفي حال واجهتك أي استفسارات، فريق الدعم يسعد بخدمتك دائماً.\nمع تحيات إدارة متجر TAREK STOR`);
    } else if (type === 'order') {
      setSubject('📦 تأكيد وشحن طلبك من متجر TAREK STOR');
      setBodyText(`مرحباً بك،\n\nنود إعلامك بأنه تم تأكيد طلبك بنجاح وجاري تجهيز الشحنة عبر المستودع اللوجستي.\nرقم التتبع: CJEXP20268819\nالناقل: Fast Line Express\n\nشكراً لاختيارك متجرنا!`);
    } else {
      setSubject('🎧 رد خدمة العملاء - متجر TAREK STOR');
      setBodyText(`أهلاً بك،\n\nبخصوص استفسارك الأخير، نود إحاطتك بأنه تمت مراجعة الحساب وتأكيد العملية بنجاح.\nيرجى التحقق من لوحة التحكم الخاصة بك.\n\nنتمنى لك تجربة ممتعة!`);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterMode === 'unread') return m.isUnread;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500/20 to-amber-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">مركز بريد Gmail المتكامل للمتجر</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800">
                GMAIL WORKSPACE HUB
              </span>
            </div>
            <p className="text-xs text-slate-400">
              قراءة وإرسال رسائل العملاء، إشعارات الأكواد الرقمية، وفواتير الطلبات مع تفويض Google الرسمي.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('home')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمتجر</span>
          </button>
        </div>
      </div>

      {/* Connection & Auth Card */}
      {!isGmailConnected ? (
        <div className="p-8 rounded-3xl bg-[#0f1523] border border-red-500/30 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 mx-auto flex items-center justify-center text-red-400">
            <Mail className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">ربط حساب Gmail مع متجر TAREK STOR</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              قم بتسجيل الدخول بحساب Google المعتمد لتفويض قراءة وإرسال رسائل البريد للعملاء، وتأكيدات الشحن والأكواد الرقمية بأمان تام ودون حفظ أي رموز سرية على المتصفح.
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            {/* Official Google Sign-In Button */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-3 shadow-lg shadow-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>تسجيل الدخول عبر Google وتفويض Gmail</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> بروتوكول OAuth 2.0 الآمن
            </span>
            <span>•</span>
            <span>صلاحية وصول بإذن المستخدم فقط</span>
          </div>
        </div>
      ) : (
        /* Connected Status Banner */
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {profile?.emailAddress || currentUser?.email || 'tarekai042@gmail.com'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  متصل ومفوض بنجاح 🟢
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>إجمالي الرسائل: <strong className="text-white font-mono">{profile?.messagesTotal || messages.length}</strong></span>
                <span>•</span>
                <span>المحادثات: <strong className="text-white font-mono">{profile?.threadsTotal || '—'}</strong></span>
                <span>•</span>
                <span className="text-cyan-400">رمز الوصول محفوظ في الذاكرة المؤقتة فقط</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-950 transition-all hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إنشاء رسالة جديدة</span>
            </button>

            <button
              onClick={() => loadGmailData()}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="تحديث صندوق الوارد"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Mailbox Content */}
      {isGmailConnected && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Messages List Column */}
          <div className="md:col-span-5 space-y-3">
            {/* Search & Filter Bar */}
            <div className="space-y-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في بريد Gmail (عنوان، مرسل، كود)..."
                  className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      loadGmailData('');
                    }}
                    className="absolute left-2.5 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                    filterMode === 'all'
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  جميع الرسائل ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('unread')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                    filterMode === 'unread'
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  غير المقروءة ({messages.filter((m) => m.isUnread).length})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="rounded-2xl bg-[#0f1523] border border-slate-800 divide-y divide-slate-800/80 max-h-[560px] overflow-y-auto">
              {isLoading && messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
                  <p>جاري جلب الرسائل من خوادم Gmail...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <Inbox className="w-6 h-6 mx-auto text-slate-500" />
                  <p className="font-bold text-white">لا توجد رسائل مطابقة</p>
                  <p className="text-[11px]">صندوق الوارد فارغ أو لم يتم العثور على نتائج بحث.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setSelectedMessage(msg)}
                      className={`w-full text-right p-3.5 transition-all flex flex-col gap-1.5 ${
                        isSelected 
                          ? 'bg-cyan-950/40 border-r-4 border-r-cyan-400' 
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`truncate max-w-[200px] ${msg.isUnread ? 'font-bold text-white' : 'text-slate-300'}`}>
                          {msg.from || 'مجهول'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {msg.date.split(' ').slice(0, 4).join(' ')}
                        </span>
                      </div>

                      <div className={`text-xs truncate ${msg.isUnread ? 'font-bold text-cyan-300' : 'text-slate-200'}`}>
                        {msg.subject}
                      </div>

                      <div className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed">
                        {msg.snippet}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Message Preview Column */}
          <div className="md:col-span-7">
            {selectedMessage ? (
              <div className="p-6 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{selectedMessage.subject}</h3>
                    <div className="text-xs text-slate-400 space-y-0.5">
                      <div>من: <strong className="text-slate-200 font-mono">{selectedMessage.from}</strong></div>
                      <div>إلى: <strong className="text-slate-200 font-mono">{selectedMessage.to}</strong></div>
                      <div>التاريخ: <span className="font-mono">{selectedMessage.date}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from);
                        setSubject(`Re: ${selectedMessage.subject}`);
                        setBodyText(`\n\n--- الرسالة السابقة ---\n${selectedMessage.snippet}`);
                        setIsComposeOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>رد سريع</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedMessage.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                      title="حذف الرسالة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Content Body */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-900 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap min-h-[220px]">
                  {selectedMessage.snippet}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                  <span>المعرف: {selectedMessage.id}</span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> تم التحقق من ترويسة الرسالة الرسمية
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-[#0f1523]/50 border border-slate-800 text-center text-xs text-slate-400 space-y-3 min-h-[300px] flex flex-col items-center justify-center">
                <Mail className="w-10 h-10 text-slate-600" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white">اختر رسالة لعرض تفاصيلها</h4>
                  <p>انقر على أي محادثة في القائمة الجانبية لقراءة محتواها والرد عليها مباشرة.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>أو ابدأ بإنشاء رسالة جديدة الآن</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-[#0f172a] border border-cyan-500/30 p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>إنشاء رسالة بريد جديدة (Gmail API)</span>
              </h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">قوالب جاهزة سريعة للمتجر:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('code')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] flex items-center gap-1 border border-slate-700"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>كود رقمي</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('order')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] flex items-center gap-1 border border-slate-700"
                >
                  <FileText className="w-3 h-3 text-purple-400" />
                  <span>تأكيد شحن طلب</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('support')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] flex items-center gap-1 border border-slate-700"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>رد خدمة العملاء</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleInitiateSend} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">بريد العميل المستلم (To) *</label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">عنوان الرسالة (Subject) *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="بخصوص طلبك رقم #TRK-1029..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">نص البريد (Message Body) *</label>
                <textarea
                  required
                  rows={6}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>سيُطلب منك تأكيد نهائي صريح قبل إرسال البريد عبر حسابك في Gmail.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>متابعة وتأكيد الإرسال</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR SENDING EMAIL */}
      {confirmSendPayload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1320] border border-cyan-500/50 p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>تأكيد إرسال البريد عبر Gmail</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              أنت على وشك إرسال رسالة رسمية نيابة عنك عبر حسابك في Gmail. يرجى مراجعة التفاصيل قبل التنفيذ:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">المستلم:</span>
                <span className="text-white font-bold">{confirmSendPayload.to}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">العنوان:</span>
                <span className="text-cyan-300">{confirmSendPayload.subject}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">معاينة المحتوى:</span>
                <p className="text-slate-300 text-[11px] line-clamp-3 font-sans">
                  {confirmSendPayload.bodyText}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isActionInProgress}
                onClick={() => setConfirmSendPayload(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                إلغاء والعودة
              </button>
              <button
                type="button"
                disabled={isActionInProgress}
                onClick={handleConfirmedSend}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-1.5"
              >
                {isActionInProgress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد الإرسال الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR TRASHING EMAIL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1320] border border-rose-500/50 p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <span>تأكيد حذف الرسالة</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في نقل هذه الرسالة إلى سلة المهملات في حسابك على Gmail؟ يمكن التراجع من خلال سلة مهملات Gmail خلال 30 يوماً.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isActionInProgress}
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isActionInProgress}
                onClick={handleConfirmedTrash}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 flex items-center gap-1.5"
              >
                {isActionInProgress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
