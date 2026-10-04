import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert,
  Clock3, FileText, Files, LayoutDashboard, LogOut, Printer, Search, ShieldCheck,
  Upload, X,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  getGetCurrentUserQueryKey, getGetDashboardQueryKey, getGetPrintRequestQueryKey,
  getListPrintRequestsQueryKey, useCreatePrintRequest, useGetCurrentUser,
  useGetDashboard, useGetPrintRequest, useListPrintRequests,
  useListPublicBranches, usePrinterLogin, usePrinterLogout,
  useRequestUploadUrl, useUpdatePrintRequestStatus,
} from '@workspace/api-client-react';
import type { AttachmentInput, Branch, PrintRequest, RequestStatus, UserProfile } from '@workspace/api-client-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20_000 } } });
const statusNames: Record<RequestStatus, string> = {
  queued: 'Navbatda', in_progress: 'Jarayonda', ready: 'Tayyor', completed: 'Yakunlangan', cancelled: 'Bekor qilingan',
};
const nextStatus: Partial<Record<RequestStatus, RequestStatus>> = { queued: 'in_progress', in_progress: 'ready', ready: 'completed' };
const transitions: Record<RequestStatus, RequestStatus[]> = {
  queued: ['in_progress', 'cancelled'], in_progress: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'], completed: [], cancelled: [],
};
const acceptedTypes = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function fileType(file: File) {
  if (acceptedTypes.has(file.type.toLowerCase())) return file.type.toLowerCase();
  const extension = file.name.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return types[extension || ''] || '';
}
function formatDate(value: string, withTime = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('uz-UZ', withTime
    ? { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' }).format(date);
}
function urgency(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  return delta < 0 ? 'overdue' : delta < 86_400_000 ? 'soon' : '';
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'MP';
}
function localDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function Brand() {
  return <div className="brand"><div className="brand-mark">mp</div><div><div className="brand-name">maktab print</div><div className="brand-sub">Maktab uchun, har kuni</div></div></div>;
}
function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props}>{children}</button>;
}
function Status({ status }: { status: RequestStatus }) {
  return <span className={`status ${status}`} data-testid={`status-request-${status}`}>{statusNames[status]}</span>;
}
function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return <div className="panel" aria-label="Yuklanmoqda">{Array.from({ length: rows }, (_, i) =>
    <div className="skeleton-row" key={i}><div className="skeleton" style={{ width: `${44 + (i % 3) * 15}%` }} /><div className="skeleton" style={{ width: `${24 + (i % 2) * 12}%` }} /></div>)}</div>;
}
function ErrorPanel({ retry }: { retry: () => void }) {
  return <div className="panel error-state"><div className="state-icon"><CircleAlert /></div><h3>Ma’lumot yuklanmadi</h3><p>Ulanishda muammo yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.</p><Button className="secondary" onClick={retry}>Qayta yuklash</Button></div>;
}
function EmptyState({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="state-icon"><Files /></div><h3>{title}</h3><p>{copy}</p>{action}</div>;
}
function useNotice() {
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return { notice, showNotice: (text: string, error = false) => setNotice({ text, error }) };
}
function Toast({ notice }: { notice: { text: string; error?: boolean } | null }) {
  return notice ? <div className={`toast ${notice.error ? 'error' : ''}`} role="status">{notice.text}</div> : null;
}

function Home() {
  return <main className="public-page home-page">
    <nav className="home-actions" aria-label="Asosiy amallar">
      <Link href="/request" className="button">
        <span className="home-action-icon"><FileText aria-hidden="true" /></span>
        <span className="home-action-label">Bosma so'rovini yuborish</span>
        <ArrowRight className="home-action-arrow" aria-hidden="true" />
      </Link>
      <Link href="/sign-in" className="button secondary">
        <span className="home-action-icon"><Printer aria-hidden="true" /></span>
        <span className="home-action-label">Printer xodimi</span>
        <ArrowRight className="home-action-arrow" aria-hidden="true" />
      </Link>
    </nav>
  </main>;
}

function PublicRequest() {
  const branches = useListPublicBranches();
  const uploadUrl = useRequestUploadUrl();
  const createRequest = useCreatePrintRequest();
  const [requesterName, setRequesterName] = useState('');
  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState('');
  const [copies, setCopies] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ phase: 'uploading' | 'saving'; current: number; total: number } | null>(null);

  function addFiles(incoming: File[]) {
    if (busy) return;
    const combined = [...files, ...incoming];
    if (combined.length > 8) { setError('Ko‘pi bilan 8 ta fayl biriktirish mumkin.'); return; }
    if (combined.some((file) => !fileType(file) || file.size > 15 * 1024 * 1024)) {
      setError('PDF, JPG, PNG, WEBP yoki Word fayllari qabul qilinadi. Har biri 15 MB gacha.');
      return;
    }
    setFiles(combined);
    setError('');
  }
  function onPick(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!files.length) { setError('Kamida bitta material faylini biriktiring.'); return; }
    if (!branchId) { setError('Iltimos, so‘rov uchun filialni tanlang.'); return; }
    setBusy(true);
    try {
      const attachments: AttachmentInput[] = [];
      setUploadProgress({ phase: 'uploading', current: 0, total: files.length });
      for (const [index, file] of files.entries()) {
        const metadata = { name: file.name, size: file.size, contentType: fileType(file) };
        const upload = await uploadUrl.mutateAsync({ data: metadata });
        const response = await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': metadata.contentType }, body: file });
        if (!response.ok) throw new Error(`${file.name} faylini yuklab bo‘lmadi.`);
        attachments.push({ ...metadata, objectPath: upload.objectPath, ownerToken: upload.ownerToken });
        setUploadProgress({ phase: 'uploading', current: index + 1, total: files.length });
      }
      setUploadProgress({ phase: 'saving', current: files.length, total: files.length });
      const result = await createRequest.mutateAsync({ data: {
        requesterName: requesterName.trim(), title: title.trim(), branchId: Number(branchId),
        copies: Number(copies), dueAt: new Date(dueAt).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}), attachments,
      } });
      setDoneId(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'So‘rov yuborilmadi. Qayta urinib ko‘ring.');
    } finally { setBusy(false); setUploadProgress(null); }
  }
  const minDate = localDateTimeValue(new Date(Math.ceil((Date.now() + 60_000) / 60_000) * 60_000));
  return <main className="request-page">
    <header className="request-top"><Link href="/" aria-label="Maktab Print bosh sahifa"><Brand /></Link><Link href="/" className="button ghost"><ArrowLeft /> Bosh sahifa</Link></header>
    <div className="request-shell">
      {doneId !== null ? <section className="panel success-page"><div className="state-icon"><Check /></div><div className="eyebrow">So‘rov qabul qilindi</div><h2>Materialingiz navbatda.</h2><p>Tanlangan filial bosmaxonasi so‘rovingizni ko‘rib chiqadi. Yuborilgan ma’lumotlarni saqlab qo‘ying.</p><div className="reference-box">SO‘ROV RAQAMI <strong>#{doneId}</strong></div><br /><Link href="/" className="button">Bosh sahifaga qaytish <ArrowRight /></Link></section> : <>
        <div className="request-intro"><div className="eyebrow">O‘qituvchilar uchun · kirish talab qilinmaydi</div><h1>Bosma so‘rovi</h1><p>Qayerga, qachon va nechta nusxa kerakligini belgilang. Qolganini filial bosmaxonasi bajaradi.</p></div>
        <div className="request-layout"><form className="panel form-panel" onSubmit={submit}>
          <h2 className="form-section-title">So‘rov ma’lumotlari</h2><p className="form-section-copy">Yulduzcha bilan belgilangan maydonlar majburiy.</p>
          <fieldset className="request-fields" disabled={busy}><div className="form-grid">
            <div className="field"><label htmlFor="teacher-name">O‘qituvchi ismi *</label><input id="teacher-name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Ism va familiya" minLength={2} maxLength={120} required data-testid="input-requester-name" /></div>
            <div className="field"><label htmlFor="branch">Filial *</label>{branches.isLoading ? <div className="skeleton" style={{ height: 42 }} /> : branches.isError ? <div><div className="inline-error">Filiallar yuklanmadi.</div><Button type="button" className="secondary" onClick={() => branches.refetch()}>Qayta yuklash</Button></div> : <select id="branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} required data-testid="select-request-branch"><option value="" disabled>Filialni tanlang</option>{(branches.data ?? []).map((branch: Branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}</div>
            <div className="field full"><label htmlFor="material-title">Material sarlavhasi *</label><input id="material-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: 7-sinf matematika — kasrlar" minLength={2} maxLength={160} required data-testid="input-request-title" /></div>
            <div className="field"><label htmlFor="request-copies">Nusxalar soni *</label><input id="request-copies" type="number" min="1" max="5000" value={copies} onChange={(e) => setCopies(e.target.value)} required data-testid="input-request-copies" /></div>
            <div className="field"><label htmlFor="request-due">Kerak bo‘ladigan sana va vaqt *</label><input id="request-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} min={minDate} required data-testid="input-request-deadline" /></div>
            <div className="field full"><label>Material fayli * <span className="field-hint">— 1–8 ta fayl</span></label><label className={`drop-zone ${busy ? 'disabled' : ''}`} htmlFor="request-files" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}><Upload /><strong>Faylni tanlang yoki shu yerga olib keling</strong><span className="field-hint">PDF, JPG, PNG, WEBP yoki Word · 15 MB gacha</span><input id="request-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={onPick} hidden data-testid="input-request-files" /></label>{files.length > 0 && <div className="file-list">{files.map((file, index) => <div className="file-line" key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" aria-label={`${file.name} faylini olib tashlash`} onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={15} /></button></div>)}</div>}</div>
            <div className="field full"><label htmlFor="request-note">Bosmaxona uchun izoh <span className="field-hint">— ixtiyoriy</span></label><textarea id="request-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Qog‘oz turi, rangli bosma yoki boshqa ko‘rsatmalar..." data-testid="input-request-note" /></div>
          </div></fieldset>
          {error && <p role="alert" className="inline-error">{error}</p>}
          {uploadProgress && <div className="upload-progress" role="status" aria-live="polite"><div>{uploadProgress.phase === 'saving' ? 'So‘rov saqlanmoqda…' : `Fayllar yuklanmoqda · ${uploadProgress.current} / ${uploadProgress.total}`}</div><div className="progress-track" role="progressbar" aria-label="Yuborish jarayoni" aria-valuemin={0} aria-valuemax={uploadProgress.total} aria-valuenow={uploadProgress.phase === 'saving' ? uploadProgress.total : uploadProgress.current}><span style={{ width: `${uploadProgress.phase === 'saving' ? 100 : uploadProgress.current / uploadProgress.total * 100}%` }} /></div></div>}
          <div className="form-submit"><Button type="submit" disabled={busy || branches.isLoading || branches.isError || uploadUrl.isPending || createRequest.isPending} data-testid="button-submit-request">{busy ? uploadProgress?.phase === 'saving' ? 'Saqlanmoqda…' : `Yuklanmoqda ${uploadProgress?.current ?? 0}/${uploadProgress?.total ?? files.length}` : 'So‘rovni yuborish'} {busy ? <Upload /> : <ArrowRight />}</Button></div>
        </form>
        <aside className="form-side"><h3>Yuborishdan oldin</h3><p>So‘rovingiz faqat tanlangan filialning bosmaxona navbatiga qo‘shiladi.</p><div className="side-rule" /><div className="form-note"><ShieldCheck /><span>Hisob ochish shart emas. Ismingiz so‘rov ma’lumotlari uchun kerak.</span></div><div className="form-note"><Files /><span>Fayllar xususiy saqlanadi va faqat ruxsatli xodimlarga ochiladi.</span></div><div className="form-note"><Clock3 /><span>Kerakli vaqtni bosmaxona ishni rejalashtirishi uchun aniq belgilang.</span></div></aside></div>
      </>}
    </div>
  </main>;
}

function SignInPage() {
  const login = usePrinterLogin();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ data: { username: username.trim(), password } });
      await client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      navigate('/app');
    } catch {
      setError('Kirish amalga oshmadi. Foydalanuvchi nomi va parolni tekshirib, qayta urinib ko‘ring.');
    }
  }
  return <main className="auth-page"><Link href="/" className="auth-brand"><Brand /></Link><section className="auth-card"><div className="auth-ornament">Faqat bosmaxona xodimlari</div><h1>Ish maydoniga kirish</h1><p>Filialingizdagi bosma navbatga kirish uchun xodim hisobingizdan foydalaning.</p><form className="auth-form" onSubmit={submit}>
    <div className="field"><label htmlFor="username">Foydalanuvchi nomi</label><input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={80} placeholder="Xodim nomi" data-testid="input-login-username" /></div>
    <div className="field"><label htmlFor="password">Parol</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={200} placeholder="Parolingiz" data-testid="input-login-password" /></div>
    {error && <div className="auth-error" role="alert">{error}</div>}
    <Button type="submit" disabled={login.isPending} data-testid="button-login">{login.isPending ? 'Tekshirilmoqda…' : 'Kirish'} <ArrowRight /></Button>
  </form><div className="auth-foot">O‘qituvchilar bosma so‘rovini tizimga kirmasdan yuborishi mumkin.</div></section></main>;
}

function ProtectedPortal() {
  const profileQuery = useGetCurrentUser();
  if (profileQuery.isLoading) return <div className="auth-page"><div className="auth-card"><div className="skeleton" style={{ height: 20, marginBottom: 18 }} /><div className="skeleton" style={{ height: 42 }} /></div></div>;
  if (profileQuery.isError || !profileQuery.data) return <Redirect to="/sign-in" />;
  if (!profileQuery.data.isActive || profileQuery.data.role !== 'printer') return <AccessDenied />;
  return <Portal profile={profileQuery.data} />;
}
function AccessDenied() {
  const logout = usePrinterLogout();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  async function leave() {
    try { await logout.mutateAsync(); } finally { client.clear(); navigate('/'); }
  }
  return <div className="auth-page"><section className="auth-card"><div className="state-icon"><ShieldCheck /></div><h1>Ruxsat yo‘q</h1><p>Bu ish maydoni faqat faol bosmaxona xodimlari uchun.</p><Button onClick={leave} disabled={logout.isPending}>Bosh sahifaga qaytish</Button></section></div>;
}

function Portal({ profile }: { profile: UserProfile }) {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const logout = usePrinterLogout();
  const client = useQueryClient();
  const title = location === '/app' ? 'Umumiy ko‘rinish' : location === '/app/requests' ? 'Filial navbati' : 'So‘rov tafsilotlari';
  async function signOut() {
    try { await logout.mutateAsync(); } finally { client.clear(); navigate('/sign-in'); }
  }
  return <div className="app-frame"><aside className="sidebar"><Link href="/app" aria-label="Maktab Print bosh sahifa"><Brand /></Link><div className="side-label">Bosmaxona</div><nav><Link href="/app" className={`nav-link ${location === '/app' ? 'active' : ''}`}><LayoutDashboard /><span>Umumiy ko‘rinish</span></Link><Link href="/app/requests" className={`nav-link ${location.startsWith('/app/requests') ? 'active' : ''}`}><Files /><span>So‘rovlar</span></Link></nav><div className="side-spacer" /><div className="branch-chip">Sizning filialingiz<strong>{profile.branchName || 'Filial belgilanmagan'}</strong></div><div className="profile-mini"><div className="avatar">{initials(profile.fullName)}</div><div className="profile-text"><strong>{profile.fullName}</strong><span>Bosmaxona xodimi</span></div><button className="icon-button" aria-label="Tizimdan chiqish" onClick={signOut} disabled={logout.isPending} data-testid="button-logout"><LogOut size={15} /></button></div></aside>
    <main className="main"><header className="topbar"><div className="crumb"><span>Maktab Print</span><ChevronRight size={13} /><b>{title}</b></div><div className="topbar-right"><span className="date-label">{new Intl.DateTimeFormat('uz-UZ', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date())}</span><div className="avatar">{initials(profile.fullName)}</div></div></header><Switch><Route path="/app"><Dashboard profile={profile} /></Route><Route path="/app/requests"><RequestsPage /></Route><Route path="/app/requests/:id"><RequestDetail /></Route><Route><NotFoundPortal /></Route></Switch></main>
  </div>;
}

function Dashboard({ profile }: { profile: UserProfile }) {
  const dashboard = useGetDashboard();
  const requestsQuery = useListPrintRequests();
  const statusMutation = useUpdatePrintRequestStatus();
  const client = useQueryClient();
  const { notice, showNotice } = useNotice();
  const requests = useMemo(() => [...(requestsQuery.data ?? [])].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [requestsQuery.data]);
  function setStatus(request: PrintRequest, status: RequestStatus) {
    statusMutation.mutate({ id: request.id, data: { status } }, {
      onSuccess: () => {
        client.invalidateQueries({ queryKey: getListPrintRequestsQueryKey() });
        client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        client.invalidateQueries({ queryKey: getGetPrintRequestQueryKey(request.id) });
        showNotice('So‘rov holati yangilandi.');
      }, onError: () => showNotice('Holatni yangilab bo‘lmadi.', true),
    });
  }
  const stats = dashboard.data ? [
    ['Ochiq so‘rovlar', dashboard.data.openCount, 'Bajarilishi kutilmoqda'],
    ['Shoshilinch', dashboard.data.urgentCount, `${dashboard.data.overdueCount} muddati o‘tgan`],
    ['Jarayonda', dashboard.data.inProgressCount, 'Hozir bosilmoqda'],
    ['Tayyor', dashboard.data.readyCount, `${dashboard.data.completedToday} bugun yakunlandi`],
  ] : [];
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">{profile.branchName || 'Filial navbati'}</div><h1 className="page-title">Xayrli kun, {profile.fullName.split(' ')[0]}.</h1><p className="page-sub">Muddat yaqin so‘rovlar navbat boshida turadi.</p></div><Link href="/app/requests" className="button">Navbatni ko‘rish <ArrowRight /></Link></div>
    {dashboard.isLoading ? <div className="stats-grid">{Array.from({ length: 4 }, (_, i) => <div className="stat-card" key={i}><div className="skeleton" /><div className="skeleton" style={{ marginTop: 16, width: '50%', height: 27 }} /></div>)}</div> : dashboard.isError ? <ErrorPanel retry={() => dashboard.refetch()} /> : <div className="stats-grid">{stats.map(([label, value, foot]) => <div className="stat-card" key={label as string}><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>)}</div>}
    <section className="panel"><div className="panel-head"><div><div className="panel-title">Filial navbati</div><div className="panel-kicker">Avval eng yaqin muddatlar</div></div><Link href="/app/requests" className="button ghost">Barcha so‘rovlar <ArrowRight /></Link></div>
      {requestsQuery.isLoading ? <LoadingPanel rows={4} /> : requestsQuery.isError ? <ErrorPanel retry={() => requestsQuery.refetch()} /> : requests.length === 0 ? <EmptyState title="Navbat bo‘sh" copy="Filialingizga yangi bosma so‘rovi kelganda shu yerda ko‘rinadi." /> : <div className="queue-list">{requests.slice(0, 7).map((request) => <div className="request-row" key={request.id} data-testid={`row-request-${request.id}`}><div className={`urgency-bar ${urgency(request.dueAt)}`} /><div><Link className="req-title" href={`/app/requests/${request.id}`}>{request.title}</Link><div className="req-meta"><span>#{request.id}</span><span>{request.requesterName}</span></div></div><div className="request-col"><div className="req-col-label">Kerakli vaqt</div><div className="req-col-value">{formatDate(request.dueAt, true)}</div></div><div className="request-col"><div className="req-col-label">Nusxa</div><div className="req-col-value">{request.copies} dona</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Status status={request.status} />{nextStatus[request.status] && <select aria-label={`${request.title} holati`} className="select-small" value={request.status} onChange={(e) => setStatus(request, e.target.value as RequestStatus)} disabled={statusMutation.isPending}>{[request.status, ...transitions[request.status]].map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select>}<Link href={`/app/requests/${request.id}`} className="row-action" aria-label="So‘rovni ochish"><ArrowRight /></Link></div></div>)}</div>}
    </section><Toast notice={notice} />
  </div>;
}

function RequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const params = status ? { status: status as RequestStatus } : undefined;
  const query = useListPrintRequests(params);
  const filtered = useMemo(() => (query.data ?? []).filter((request) => `${request.title} ${request.requesterName}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [query.data, search]);
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Faqat sizning filialingiz</div><h1 className="page-title">Bosma so‘rovlari</h1><p className="page-sub">Filial navbati, muddat va ish holati.</p></div></div>
    <div className="toolbar"><label className="searchbox"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="So‘rov yoki o‘qituvchini qidirish" aria-label="So‘rovni qidirish" data-testid="input-search-requests" /></label><select className="filter-select" aria-label="Holat bo‘yicha filtrlash" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-request-status"><option value="">Barcha holatlar</option>{Object.entries(statusNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select><span className="request-count">{filtered.length} ta so‘rov</span></div>
    {query.isLoading ? <LoadingPanel rows={5} /> : query.isError ? <ErrorPanel retry={() => query.refetch()} /> : filtered.length === 0 ? <div className="panel"><EmptyState title={search || status ? 'Mos so‘rov topilmadi' : 'Navbat bo‘sh'} copy={search || status ? 'Qidiruv yoki holat filtrini o‘zgartirib ko‘ring.' : 'Filialingizga yuborilgan so‘rovlar shu yerda ko‘rinadi.'} /></div> : <div className="request-card-list">{filtered.map((request) => <RequestCard key={request.id} request={request} />)}</div>}
  </div>;
}
function RequestCard({ request }: { request: PrintRequest }) {
  return <Link href={`/app/requests/${request.id}`} className="request-card" data-testid={`card-request-${request.id}`}><div className={`urgency-bar ${urgency(request.dueAt)}`} /><div className="request-card-body"><div className="request-card-top"><h3>{request.title}</h3><Status status={request.status} /></div><div className="request-card-bottom"><span>#{request.id}</span><span>{request.requesterName}</span><span><Clock3 size={12} style={{ verticalAlign: 'middle' }} /> {formatDate(request.dueAt, true)}</span><span>{request.copies} nusxa</span></div></div><span className="row-action"><ArrowRight /></span></Link>;
}

function RequestDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetPrintRequest(id, { query: { enabled: Number.isFinite(id) && id > 0, queryKey: getGetPrintRequestQueryKey(id) } });
  const mutation = useUpdatePrintRequestStatus();
  const client = useQueryClient();
  const { notice, showNotice } = useNotice();
  if (!Number.isFinite(id) || id < 1) return <div className="content"><ErrorPanel retry={() => window.location.reload()} /></div>;
  if (query.isLoading) return <div className="content"><LoadingPanel rows={4} /></div>;
  if (query.isError || !query.data) return <div className="content"><ErrorPanel retry={() => query.refetch()} /></div>;
  const request = query.data;
  function changeStatus(status: RequestStatus) {
    mutation.mutate({ id: request.id, data: { status } }, {
      onSuccess: () => {
        client.invalidateQueries({ queryKey: getGetPrintRequestQueryKey(request.id) });
        client.invalidateQueries({ queryKey: getListPrintRequestsQueryKey() });
        client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        showNotice('Holat yangilandi.');
      }, onError: () => showNotice('Holatni o‘zgartirib bo‘lmadi.', true),
    });
  }
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">So‘rov №{request.id} · {request.branchName}</div><h1 className="page-title">So‘rov tafsilotlari</h1></div><Link href="/app/requests" className="button ghost"><ArrowLeft /> Navbatga qaytish</Link></div>
    <div className="detail-grid"><section className="panel detail-main"><Status status={request.status} /><h2 className="detail-title">{request.title}</h2><div className="detail-facts"><div className="detail-fact"><span>Kerakli vaqt</span><strong>{formatDate(request.dueAt, true)}</strong></div><div className="detail-fact"><span>Nusxalar</span><strong>{request.copies} dona</strong></div><div className="detail-fact"><span>O‘qituvchi</span><strong>{request.requesterName}</strong></div></div><div className="detail-note">{request.note || 'Qo‘shimcha izoh berilmagan.'}</div><div className="panel-head" style={{ padding: '16px 0 10px', borderTop: '1px solid #edf0e8' }}><div><div className="panel-title">Biriktirilgan materiallar</div><div className="panel-kicker">{request.attachments.length} ta fayl · xususiy yuklab olish</div></div></div>{request.attachments.length ? request.attachments.map((file) => <div className="attachment" key={file.fileIndex}><div className="file-icon"><FileText /></div><div className="attachment-main"><strong>{file.name}</strong><span>{file.contentType} · {(file.size / 1024 / 1024).toFixed(2)} MB</span></div><a className="row-action" href={`/api/storage/requests/${request.id}/files/${file.fileIndex}`} download aria-label={`${file.name} faylini yuklab olish`} data-testid={`link-download-${file.fileIndex}`}><ArrowDownToLine /></a></div>) : <p className="page-sub">Biriktirilgan fayl yo‘q.</p>}</section>
      <aside className="panel detail-side"><h3>So‘rov jarayoni</h3><div className="timeline-item"><b>Yuborildi</b><br />{formatDate(request.createdAt, true)}</div><div className="timeline-item"><b>{statusNames[request.status]}</b><br />Joriy holat</div>{transitions[request.status].length > 0 && <><div className="side-rule" /><label className="field"><span className="form-section-title" style={{ fontSize: 12 }}>Keyingi holat</span><select className="field-control" value={request.status} onChange={(e) => changeStatus(e.target.value as RequestStatus)} disabled={mutation.isPending} data-testid="select-status-detail">{[request.status, ...transitions[request.status]].map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select></label></>}<div className="side-rule" /><div className="req-col-label">Filial navbati</div><div className="req-col-value">{request.branchName}</div></aside></div><Toast notice={notice} />
  </div>;
}
function NotFoundPortal() {
  return <div className="content"><div className="panel empty-state"><div className="state-icon"><CircleAlert /></div><h3>Sahifa topilmadi</h3><p>Bu manzil mavjud emas yoki ko‘chirilgan.</p><Link href="/app" className="button">Navbatga qaytish</Link></div></div>;
}
function NotFound() {
  return <main className="auth-page"><section className="auth-card"><div className="state-icon"><CircleAlert /></div><h1>Sahifa topilmadi</h1><p>Kiritilgan manzilni tekshirib ko‘ring.</p><Link href="/" className="button">Bosh sahifaga qaytish</Link></section></main>;
}
function AppRoutes() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/request" component={PublicRequest} />
    <Route path="/sign-in" component={SignInPage} />
    <Route path="/app" component={ProtectedPortal} />
    <Route path="/app/requests" component={ProtectedPortal} />
    <Route path="/app/requests/:id" component={ProtectedPortal} />
    <Route component={NotFound} />
  </Switch>;
}
function App() {
  return <WouterRouter base={basePath}><QueryClientProvider client={queryClient}><AppRoutes /></QueryClientProvider></WouterRouter>;
}

export default App;