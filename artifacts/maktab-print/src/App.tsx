import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type ButtonHTMLAttributes, type ChangeEvent } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useUser, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Building2, ChevronRight,
  CircleAlert, Clock3, FileText, Files, LayoutDashboard, LogOut, Plus,
  Search, ShieldCheck, Upload, Users, X,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  getGetCurrentUserQueryKey, getGetDashboardQueryKey, getGetPrintRequestQueryKey,
  getListBranchesQueryKey, getListPrintRequestsQueryKey, getListUsersQueryKey,
  useCreateBranch, useCreatePrintRequest, useGetCurrentUser, useGetDashboard,
  useGetPrintRequest, useListBranches, useListPrintRequests, useListUsers,
  useRequestUploadUrl, useUpdatePrintRequestStatus, useUpdateUserAssignment,
} from '@workspace/api-client-react';
import type { AttachmentInput, Branch, PrintRequest, RequestStatus, SchoolUser, UserProfile, UserRole } from '@workspace/api-client-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkPath = (path: string) => `${basePath}${path}` || path;
const translations = {
  formFieldLabel__emailAddress: 'Elektron pochta',
  formFieldLabel__password: 'Parol',
  formFieldInputPlaceholder__emailAddress: 'maktab@example.uz',
  formFieldInputPlaceholder__password: 'Parolingizni kiriting',
  formFieldInputPlaceholder__signUpPassword: 'Yangi parolingizni kiriting',
  formButtonPrimary: 'Davom etish',
  socialButtonsBlockButton: 'Google orqali davom etish',
  dividerText: 'yoki',
  signIn: {
    start: {
      title: 'Hisobingizga kiring',
      subtitle: 'Davom etish uchun tizimga kiring',
      actionText: 'Hisobingiz yo‘qmi?',
      actionLink: 'Ro‘yxatdan o‘ting',
    },
  },
  signUp: {
    start: {
      title: 'Hisob yarating',
      subtitle: 'Maktab Print xizmatidan foydalanishni boshlang',
      actionText: 'Hisobingiz bormi?',
      actionLink: 'Kirish',
    },
  },
} as any;
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const statusNames: Record<RequestStatus, string> = { queued: 'Navbatda', in_progress: 'Jarayonda', ready: 'Tayyor', completed: 'Yakunlangan', cancelled: 'Bekor qilingan' };
const roleNames: Record<UserRole, string> = { admin: 'Administrator', teacher: 'O‘qituvchi', printer: 'Bosmaxona xodimi' };
const transitions: Record<RequestStatus, RequestStatus[]> = {
  queued: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
const allowedUploadTypes = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
function uploadContentType(file: File) {
  const type = file.type.toLowerCase();
  if (allowedUploadTypes.has(type)) return type;
  const extension = file.name.toLowerCase().split('.').pop();
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return byExtension[extension ?? ''] ?? '';
}
function statusOptions(status: RequestStatus, role: UserRole) {
  return role === 'admin'
    ? Object.keys(statusNames) as RequestStatus[]
    : [status, ...transitions[status]];
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className="brand"><div className="brand-mark">mp</div><div><div className="brand-name">maktab print</div><div className="brand-sub" style={inverse ? {} : undefined}>Maktab uchun, har kuni</div></div></div>;
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'MP'; }
function formatDate(value: string, withTime = false) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('uz-UZ', withTime ? { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }).format(d);
}
function dueTone(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  if (delta < 0) return 'overdue';
  if (delta < 1000 * 60 * 60 * 24) return 'soon';
  return '';
}
function Status({ status }: { status: RequestStatus }) { return <span className={`status ${status}`}>{statusNames[status]}</span>; }
function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props}>{children}</button>;
}
function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return <div className="panel" aria-label="Yuklanmoqda">{Array.from({ length: rows }, (_, i) => <div className="skeleton-row" key={i}><div className="skeleton" style={{ width: `${44 + (i % 3) * 15}%` }} /><div className="skeleton" style={{ width: `${24 + (i % 2) * 12}%` }} /></div>)}</div>;
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
    const timer = window.setTimeout(() => setNotice(null), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return { notice, showNotice: (text: string, error = false) => setNotice({ text, error }) };
}
function Toast({ notice }: { notice: { text: string; error?: boolean } | null }) {
  return notice ? <div className={`toast ${notice.error ? 'error' : ''}`} role="status">{notice.text}</div> : null;
}

function Home() {
  return <main className="public-page">
      <header className="public-nav"><Link href="/" aria-label="Maktab Print bosh sahifa"><Brand /></Link><div className="public-links"><a href="#qanday-ishlaydi">Qanday ishlaydi</a><a href="#ishonch">Ish tartibi</a><Link href="/sign-in" className="button ghost">Kirish <ArrowRight /></Link></div></header>
      <section className="public-hero">
        <div><div className="hero-tag"><i /> O‘quv materiallari, o‘z vaqtida</div><h1 className="hero-title">Darsga kerakli.<br /><em>Vaqtida tayyor.</em></h1><p className="hero-copy">O‘qituvchi topshiriqni yuboradi. Bosmaxona jarayonni ko‘radi. Har bir nusxa, muddat va holat — bitta ravshan joyda.</p><div className="hero-actions"><Link href="/sign-up" className="button">So‘rov yuborish <ArrowRight /></Link><Link href="/sign-in" className="button ghost">Tizimga kirish</Link></div></div>
        <div className="hero-visual" aria-label="Bosmaga tayyor o‘quv varaqasi tasviri"><div className="visual-orbit" /><div className="print-sheet"><div className="sheet-top"><span>ISH VARAQASI · 04</span><span>7-SINF</span></div><div className="sheet-title">Kasrlar bilan<br />ishlaymiz</div><div className="sheet-line" /><div className="sheet-line" /><div className="sheet-line short" /><div className="worksheet">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div><div className="sheet-stamp">BOSMAGA<br />TAYYOR</div></div><div className="hero-caption">MATERIALDAN SINFXONAGACHA — ANIQLIK BILAN</div></div>
      </section>
      <section className="public-band" id="ishonch"><div className="band-item"><div className="band-number">01</div><div className="band-label">Bitta aniq<br />so‘rov</div></div><div className="band-item"><div className="band-number">02</div><div className="band-label">Muddatga qarab<br />navbat</div></div><div className="band-item"><div className="band-number">03</div><div className="band-label">Har bosqichda<br />aniq holat</div></div><div className="band-item"><div className="band-number">04</div><div className="band-label">Filial bo‘yicha<br />tartibli ish</div></div></section>
      <section className="section" id="qanday-ishlaydi"><div className="section-intro"><div className="eyebrow">Sodda ish tartibi</div><h2>So‘rovdan tayyor nusxagacha — bir izda.</h2><p>Ortiqcha qo‘ng‘iroq va noaniq xabarlar o‘rniga, har kim o‘z vazifasini va keyingi qadamni ko‘radi.</p></div><div className="steps-grid"><article className="step-card"><div className="step-no">01 / O‘QITUVCHI</div><h3>Materialni yuboring</h3><p>Faylni yuklang, nusxalar soni va sizga kerak bo‘lgan vaqtni belgilang. Filialingiz avtomatik aniqlanadi.</p></article><article className="step-card"><div className="step-no">02 / BOSMAXONA</div><h3>Navbatni boshqaring</h3><p>Eng yaqin muddatlar navbat boshida. Ish jarayonining holati so‘rovga darhol qayd etiladi.</p></article><article className="step-card"><div className="step-no">03 / HAMMA UCHUN</div><h3>Tayyorligini biling</h3><p>So‘rov holati yangilanib boradi. Kerakli fayllarni ruxsat doirasida qayta yuklab olish mumkin.</p></article></div></section>
      <section className="public-cta"><div className="cta-panel"><div><h2>Dars tayyorgarligini yengillashtiring.</h2><p>Maktab hisobingiz bilan kiring va birinchi so‘rovni yuboring.</p></div><Link href="/sign-in" className="button">Kirish va davom etish <ArrowRight /></Link></div></section>
      <footer className="public-footer"><span>Maktab Print · Maktablar uchun ish vositasi</span><span>Oddiy. Hisobdor. Vaqtida.</span></footer>
    </main>;
}

function AuthPage({ signUp = false }: { signUp?: boolean }) {
  return <div className="auth-page"><Link href="/" className="auth-brand"><Brand /></Link><div className="auth-card">{signUp ? <SignUp routing="path" path={clerkPath('/sign-up')} signInUrl={clerkPath('/sign-in')} /> : <SignIn routing="path" path={clerkPath('/sign-in')} signUpUrl={clerkPath('/sign-up')} />}</div></div>;
}

function PortalGate() {
  const { isLoaded } = useUser();
  if (!isLoaded) return <div className="auth-page"><div className="auth-card"><div className="skeleton" style={{ height: 22, marginBottom: 18 }} /><div className="skeleton" style={{ height: 44 }} /></div></div>;
  return <><Show when="signed-in"><Portal /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function Portal() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const profileQuery = useGetCurrentUser();
  const profile = profileQuery.data;
  const paths = [
    { href: '/app', label: 'Umumiy ko‘rinish', icon: LayoutDashboard, show: true },
    { href: '/app/requests', label: 'So‘rovlar', icon: Files, show: true },
    { href: '/app/requests/new', label: 'Yangi so‘rov', icon: Plus, show: profile?.role === 'teacher' },
    { href: '/app/users', label: 'Foydalanuvchilar', icon: Users, show: profile?.role === 'admin' },
    { href: '/app/branches', label: 'Filiallar', icon: Building2, show: profile?.role === 'admin' },
  ].filter((item) => item.show);
  const title = location === '/app' ? 'Umumiy ko‘rinish' : location.includes('/new') ? 'Yangi so‘rov' : location.includes('/users') ? 'Foydalanuvchilar' : location.includes('/branches') ? 'Filiallar' : location.includes('/requests/') && location !== '/app/requests' ? 'So‘rov tafsilotlari' : 'So‘rovlar';
  if (profileQuery.isLoading) return <div className="app-frame"><aside className="sidebar"><Brand inverse /></aside><main className="main"><div className="content"><LoadingPanel rows={5} /></div></main></div>;
  if (profileQuery.isError || !profile) return <div className="auth-page"><div className="auth-card"><div className="state-icon"><ShieldCheck /></div><h2>Profil ma’lumoti topilmadi</h2><p className="page-sub">Hisobingiz maktab profiliga ulanmagan bo‘lishi mumkin. Administrator bilan bog‘laning.</p><Button onClick={() => signOut()}>Hisobdan chiqish</Button></div></div>;
  if (!profile.isActive) return <div className="auth-page"><div className="auth-card"><div className="state-icon"><Clock3 /></div><h2>Hisob faollashtirilmagan</h2><p className="page-sub">Maktab administratori profilingizni faollashtirishi bilan tizimdan foydalanishingiz mumkin.</p><Button className="secondary" onClick={() => signOut()}>Hisobdan chiqish</Button></div></div>;
  return <div className="app-frame">
    <aside className="sidebar"><Link href="/app" aria-label="Maktab Print bosh sahifa"><Brand inverse /></Link><div className="side-label">Ish maydoni</div><nav>{paths.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${location === href || (href === '/app/requests' && location.startsWith('/app/requests/') && location !== '/app/requests/new') ? 'active' : ''}`} data-testid={`link-nav-${href.replaceAll('/', '-')}`}><Icon /><span>{label}</span></Link>)}</nav><div className="side-spacer" /><div className="branch-chip">Sizning filialingiz<strong>{profile.branchName || 'Filial belgilanmagan'}</strong></div><div className="profile-mini"><div className="avatar">{initials(profile.fullName)}</div><div className="profile-text"><strong>{profile.fullName}</strong><span>{roleNames[profile.role]}</span></div><button className="icon-button" aria-label="Hisobdan chiqish" data-testid="button-sign-out" onClick={() => signOut()}><LogOut size={15} /></button></div></aside>
    <main className="main"><header className="topbar"><div className="crumb"><span>Maktab Print</span><ChevronRight size={13} /><b>{title}</b></div><div className="topbar-right"><span className="date-label">{new Intl.DateTimeFormat('uz-UZ', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date())}</span><div className="avatar">{initials(profile.fullName)}</div></div></header><Switch>
      <Route path="/app"><Dashboard profile={profile} /></Route>
      <Route path="/app/requests/new"><NewRequest profile={profile} /></Route>
      <Route path="/app/requests"><RequestsPage profile={profile} /></Route>
      <Route path="/app/requests/:id"><RequestDetail profile={profile} /></Route>
      <Route path="/app/users"><UsersPage /></Route>
      <Route path="/app/branches"><BranchesPage /></Route>
      <Route><NotFoundPortal /></Route>
    </Switch></main>
  </div>;
}

function Dashboard({ profile }: { profile: UserProfile }) {
  const dashboard = useGetDashboard();
  const requestsQuery = useListPrintRequests();
  const statusMutation = useUpdatePrintRequestStatus();
  const client = useQueryClient();
  const { notice, showNotice } = useNotice();
  const requests = useMemo(() => [...(requestsQuery.data ?? [])].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [requestsQuery.data]);
  const canManage = profile.role === 'printer' || profile.role === 'admin';
  async function setStatus(request: PrintRequest, status: RequestStatus) {
    statusMutation.mutate({ id: request.id, data: { status } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListPrintRequestsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetPrintRequestQueryKey(request.id) }); showNotice('So‘rov holati yangilandi.'); }, onError: () => showNotice('Holatni yangilab bo‘lmadi.', true) });
  }
  const stats = dashboard.data ? [
    ['Ochiq so‘rovlar', dashboard.data.openCount, 'Bajarilishi kutilmoqda'],
    ['Shoshilinch', dashboard.data.urgentCount, `${dashboard.data.overdueCount} muddati o‘tgan`],
    ['Jarayonda', dashboard.data.inProgressCount, 'Hozir bosilmoqda'],
    ['Tayyor', dashboard.data.readyCount, `${dashboard.data.completedToday} bugun yakunlandi`],
  ] : [];
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">{profile.branchName || 'Maktab Print'}</div><h1 className="page-title">Xayrli kun, {profile.fullName.split(' ')[0]}.</h1><p className="page-sub">{profile.role === 'printer' ? 'Muddat yaqin so‘rovlar navbat boshida turadi.' : 'O‘quv materiallaringiz va so‘rovlar holatini shu yerdan kuzating.'}</p></div>{profile.role === 'teacher' && <Link href="/app/requests/new" className="button"><Plus /> Yangi so‘rov</Link>}</div>
    {dashboard.isLoading ? <div className="stats-grid">{Array.from({ length: 4 }, (_, i) => <div className="stat-card" key={i}><div className="skeleton" /><div className="skeleton" style={{ marginTop: 16, width: '50%', height: 27 }} /></div>)}</div> : dashboard.isError ? <ErrorPanel retry={() => dashboard.refetch()} /> : <div className="stats-grid">{stats.map(([label, value, foot]) => <div className="stat-card" key={label as string}><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>)}</div>}
    <section className="panel"><div className="panel-head"><div><div className="panel-title">{canManage ? 'Muddat bo‘yicha navbat' : 'So‘nggi so‘rovlar'}</div><div className="panel-kicker">{canManage ? 'Avval eng yaqin muddatlar' : 'So‘rovlaringiz holati va keyingi qadam'}</div></div><Link href="/app/requests" className="button ghost">Barchasi <ArrowRight /></Link></div>
      {requestsQuery.isLoading ? <LoadingPanel rows={4} /> : requestsQuery.isError ? <ErrorPanel retry={() => requestsQuery.refetch()} /> : requests.length === 0 ? <EmptyState title="Hozircha so‘rov yo‘q" copy="Yangi so‘rov yuborilganda, u shu yerda ko‘rinadi." action={profile.role === 'teacher' ? <Link className="button" href="/app/requests/new">So‘rov yuborish <ArrowRight /></Link> : undefined} /> : <div className="queue-list">{requests.slice(0, 7).map((request) => <div className="request-row" key={request.id} data-testid={`row-request-${request.id}`}><div className={`urgency-bar ${dueTone(request.dueAt)}`} /><div><Link className="req-title" href={`/app/requests/${request.id}`}>{request.title}</Link><div className="req-meta"><span>#{request.id}</span><span>{request.requesterName}</span><span>{request.branchName}</span></div></div><div className="request-col"><div className="req-col-label">Muddat</div><div className="req-col-value">{formatDate(request.dueAt, true)}</div></div><div className="request-col"><div className="req-col-label">Nusxa</div><div className="req-col-value">{request.copies} dona</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Status status={request.status} />{canManage && request.status !== 'completed' && request.status !== 'cancelled' && <select aria-label={`${request.title} holati`} className="select-small" value={request.status} onChange={(e) => setStatus(request, e.target.value as RequestStatus)} disabled={statusMutation.isPending}>{statusOptions(request.status, profile.role).map((s) => <option key={s} value={s}>{statusNames[s]}</option>)}</select>}<Link href={`/app/requests/${request.id}`} className="row-action" aria-label="So‘rovni ochish"><ArrowRight /></Link></div></div>)}</div>}
    </section><Toast notice={notice} />
  </div>;
}

function RequestsPage({ profile }: { profile: UserProfile }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const params = status ? { status: status as RequestStatus } : undefined;
  const query = useListPrintRequests(params);
  const filtered = useMemo(() => (query.data ?? []).filter((req) => `${req.title} ${req.requesterName} ${req.branchName}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [query.data, search]);
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">{profile.role === 'printer' ? 'Filial navbati' : 'Mening materiallarim'}</div><h1 className="page-title">So‘rovlar</h1><p className="page-sub">{profile.role === 'printer' ? 'Filialingizga tegishli bosma ishlar.' : 'Barcha yuborgan so‘rovlaringiz va ularning holati.'}</p></div>{profile.role === 'teacher' && <Link href="/app/requests/new" className="button"><Plus /> Yangi so‘rov</Link>}</div>
    <div className="toolbar"><label className="searchbox"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="So‘rovni qidirish..." aria-label="So‘rovni qidirish" data-testid="input-search-requests" /></label><select className="filter-select" aria-label="Holat bo‘yicha filtrlash" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-request-status"><option value="">Barcha holatlar</option>{Object.entries(statusNames).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><span className="req-meta">{filtered.length} ta so‘rov</span></div>
    {query.isLoading ? <LoadingPanel rows={5} /> : query.isError ? <ErrorPanel retry={() => query.refetch()} /> : filtered.length === 0 ? <div className="panel"><EmptyState title={search || status ? 'Mos so‘rov topilmadi' : 'Hozircha so‘rov yo‘q'} copy={search || status ? 'Qidiruv yoki filtrni o‘zgartirib ko‘ring.' : 'Birinchi so‘rovingizni yuborganingizda u shu yerda ko‘rinadi.'} action={profile.role === 'teacher' && !search && !status ? <Link className="button" href="/app/requests/new">Yangi so‘rov <ArrowRight /></Link> : undefined} /></div> : <div className="request-card-list">{filtered.map((r) => <RequestCard key={r.id} request={r} />)}</div>}
  </div>;
}
function RequestCard({ request }: { request: PrintRequest }) {
  return <Link href={`/app/requests/${request.id}`} className="request-card" data-testid={`card-request-${request.id}`}><div className={`urgency-bar ${dueTone(request.dueAt)}`} /><div className="request-card-body"><div className="request-card-top"><h3>{request.title}</h3><Status status={request.status} /></div><div className="request-card-bottom"><span>#{request.id}</span><span>{request.requesterName}</span><span>{request.branchName}</span><span><Clock3 size={12} style={{ verticalAlign: 'middle' }} /> {formatDate(request.dueAt, true)}</span><span>{request.copies} nusxa</span></div></div><span className="row-action"><ArrowRight /></span></Link>;
}

function NewRequest({ profile }: { profile: UserProfile }) {
  const [title, setTitle] = useState('');
  const [copies, setCopies] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [, navigate] = useLocation();
  const requestUpload = useRequestUploadUrl();
  const create = useCreatePrintRequest();
  const client = useQueryClient();
  const filePicker = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = [...(e.target.files ?? [])];
    const next = [...files, ...selected];
    const acceptable = next.filter((f) => allowedUploadTypes.has(uploadContentType(f)) && f.size <= 15 * 1024 * 1024);
    if (next.length > 8) setError('Ko‘pi bilan 8 ta fayl tanlash mumkin.');
    else if (acceptable.length !== next.length) setError('PDF, JPG, PNG, WEBP yoki Word fayllari qabul qilinadi. Har biri 15 MB dan kichik bo‘lsin.');
    else { setError(''); setFiles(next); }
    e.target.value = '';
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (files.length < 1 || files.length > 8) { setError('Kamida 1 ta, ko‘pi bilan 8 ta fayl biriktiring.'); return; }
    if (!profile.branchId) { setError('Profilingizga filial biriktirilmagan. Administrator bilan bog‘laning.'); return; }
    setBusy(true);
    try {
      const attachments: AttachmentInput[] = [];
      for (const file of files) {
        const meta = { name: file.name, size: file.size, contentType: uploadContentType(file) };
        const upload = await requestUpload.mutateAsync({ data: meta });
        const result = await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': meta.contentType }, body: file });
        if (!result.ok) throw new Error(`${file.name} faylini yuklab bo‘lmadi.`);
        attachments.push({ ...meta, objectPath: upload.objectPath });
      }
      const created = await create.mutateAsync({ data: { title: title.trim(), copies: Number(copies), dueAt: new Date(dueAt).toISOString(), note: note.trim() || null, attachments } });
      await Promise.all([client.invalidateQueries({ queryKey: getListPrintRequestsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]);
      navigate(`/app/requests/${created.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'So‘rov yuborilmadi. Qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  }
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Bosma ishini rejalash</div><h1 className="page-title">Yangi so‘rov</h1><p className="page-sub">Kerakli ma’lumotlarni kiriting. Filialingiz profil bo‘yicha avtomatik biriktiriladi.</p></div><Link href="/app/requests" className="button ghost"><ArrowLeft /> So‘rovlarga qaytish</Link></div>
    <form className="form-layout" onSubmit={submit}><div className="panel form-panel"><h2 className="form-section-title">So‘rov tafsilotlari</h2><p className="form-section-copy">Bosmaxona ishni aniq rejalashi uchun ma’lumotlarni tekshirib kiriting.</p><div className="form-grid">
      <div className="field full"><label htmlFor="req-title">Material nomi</label><input id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: 7-sinf matematika, 4-mavzu" required minLength={2} maxLength={160} data-testid="input-request-title" /></div>
      <div className="field"><label htmlFor="req-copies">Nusxalar soni</label><input id="req-copies" type="number" min="1" max="5000" value={copies} onChange={(e) => setCopies(e.target.value)} required data-testid="input-request-copies" /></div>
      <div className="field"><label htmlFor="req-due">Kerak bo‘ladigan vaqt</label><input id="req-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required min={new Date(Date.now() - 60000).toISOString().slice(0, 16)} data-testid="input-request-deadline" /></div>
      <div className="field full"><label>Fayllar <span style={{ color: '#92a092', fontWeight: 400 }}>— 1 dan 8 tagacha</span></label><label className="drop-zone" htmlFor="req-files"><Upload /><strong>Fayl tanlang yoki shu yerga tashlang</strong><span className="field-hint">PDF, JPG, PNG, WEBP yoki Word · har biri 15 MB gacha</span><input id="req-files" type="file" multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx" onChange={filePicker} hidden data-testid="input-request-files" /></label>{files.length > 0 && <div className="file-list">{files.map((f, i) => <div className="file-line" key={`${f.name}-${i}`}><FileText size={15} /><span>{f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" aria-label={`${f.name} faylini olib tashlash`} onClick={() => setFiles(files.filter((_, index) => i !== index))}><X size={15} /></button></div>)}</div>}</div>
      <div className="field full"><label htmlFor="req-note">Izoh <span style={{ color: '#92a092', fontWeight: 400 }}>— ixtiyoriy</span></label><textarea id="req-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Qog‘oz turi, rangli bosma yoki alohida ko‘rsatmalar..." data-testid="input-request-note" /></div>
      </div>{error && <p role="alert" style={{ color: '#a7433d', fontSize: 11, marginTop: 15 }}>{error}</p>}<div className="form-submit"><Button type="submit" disabled={busy || create.isPending || requestUpload.isPending}>{busy ? 'Yuklanmoqda...' : 'So‘rovni yuborish'} <ArrowRight /></Button></div></div>
      <aside className="form-side"><h3>Yuborishdan oldin</h3><p>So‘rov yuborilgach, filial bosmaxonasi uni navbatda ko‘radi. Eng yaqin muddatli ishlar ustuvor ko‘rib chiqiladi.</p><div className="side-rule" /><div className="form-note"><ShieldCheck /><span>Filialingiz profil ma’lumotidan olinadi — tanlash shart emas.</span></div><div className="form-note"><Files /><span>Yuklangan fayllar xususiy saqlanadi va faqat ruxsatli foydalanuvchilarga ochiladi.</span></div><div className="form-note"><Clock3 /><span>Kerakli vaqtni bosmaxona ishni rejalashi uchun imkon qadar oldin belgilang.</span></div><div className="side-rule" /><h3>Tanlangan filial</h3><p>{profile.branchName || 'Filial profilingizga biriktirilmagan'}</p></aside>
    </form>
  </div>;
}

function RequestDetail({ profile }: { profile: UserProfile }) {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetPrintRequest(id, { query: { enabled: Number.isFinite(id) && id > 0, queryKey: getGetPrintRequestQueryKey(id) } });
  const mutation = useUpdatePrintRequestStatus();
  const client = useQueryClient();
  const { notice, showNotice } = useNotice();
  if (query.isLoading) return <div className="content"><LoadingPanel rows={4} /></div>;
  if (query.isError || !query.data) return <div className="content"><ErrorPanel retry={() => query.refetch()} /></div>;
  const request = query.data;
  const canEdit = (profile.role === 'printer' || profile.role === 'admin') && request.status !== 'completed' && request.status !== 'cancelled';
  function changeStatus(status: RequestStatus) {
    mutation.mutate({ id: request.id, data: { status } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetPrintRequestQueryKey(request.id) }); client.invalidateQueries({ queryKey: getListPrintRequestsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); showNotice('Holat yangilandi.'); }, onError: () => showNotice('Holatni o‘zgartirib bo‘lmadi.', true) });
  }
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">So‘rov №{request.id} · {request.branchName}</div><h1 className="page-title">So‘rov tafsilotlari</h1></div><Link href="/app/requests" className="button ghost"><ArrowLeft /> So‘rovlar</Link></div>
    <div className="detail-grid"><section className="panel detail-main"><Status status={request.status} /><h2 className="detail-title">{request.title}</h2><div className="detail-facts"><div className="detail-fact"><span>Kerakli vaqt</span><strong>{formatDate(request.dueAt, true)}</strong></div><div className="detail-fact"><span>Nusxalar</span><strong>{request.copies} dona</strong></div><div className="detail-fact"><span>So‘rovchi</span><strong>{request.requesterName}</strong></div></div><div className="detail-note">{request.note || 'Qo‘shimcha izoh berilmagan.'}</div><div className="panel-head" style={{ padding: '16px 0 10px', borderTop: '1px solid #edf0e8' }}><div><div className="panel-title">Biriktirilgan fayllar</div><div className="panel-kicker">{request.attachments.length} ta fayl · xususiy yuklab olish</div></div></div>{request.attachments.length ? request.attachments.map((file) => <div className="attachment" key={file.fileIndex}><div className="file-icon"><FileText /></div><div className="attachment-main"><strong>{file.name}</strong><span>{file.contentType} · {(file.size / 1024 / 1024).toFixed(2)} MB</span></div><a className="row-action" href={`/api/storage/requests/${request.id}/files/${file.fileIndex}`} download aria-label={`${file.name} faylini yuklab olish`} data-testid={`link-download-${file.fileIndex}`}><ArrowDownToLine /></a></div>) : <p className="page-sub">Biriktirilgan fayl yo‘q.</p>}</section>
      <aside className="panel detail-side"><h3>So‘rov holati</h3><div className="timeline-item"><b>Yuborildi</b><br />{formatDate(request.createdAt, true)}</div><div className="timeline-item"><b>{statusNames[request.status]}</b><br />Joriy holat</div>{canEdit && <><div className="side-rule" /><label className="field"><span className="form-section-title" style={{ fontSize: 12 }}>Keyingi holat</span><select className="field-control" value={request.status} onChange={(e) => changeStatus(e.target.value as RequestStatus)} disabled={mutation.isPending} data-testid="select-status-detail">{statusOptions(request.status, profile.role).map((s) => <option key={s} value={s}>{statusNames[s]}</option>)}</select></label></>}<div className="side-rule" /><div className="req-col-label">Filial</div><div className="req-col-value">{request.branchName}</div></aside></div><Toast notice={notice} />
  </div>;
}

function UsersPage() {
  const usersQuery = useListUsers();
  const branchesQuery = useListBranches();
  const mutation = useUpdateUserAssignment();
  const client = useQueryClient();
  const { notice, showNotice } = useNotice();
  function update(user: SchoolUser, changes: Partial<{ role: UserRole; branchId: number | null; isActive: boolean }>) {
    mutation.mutate({ clerkId: user.clerkId, data: { role: changes.role ?? user.role, branchId: changes.branchId === undefined ? user.branchId : changes.branchId, isActive: changes.isActive ?? user.isActive } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListUsersQueryKey() }); client.invalidateQueries({ queryKey: getListBranchesQueryKey() }); showNotice('Foydalanuvchi ma’lumoti saqlandi.'); }, onError: () => showNotice('O‘zgarishlarni saqlab bo‘lmadi.', true) });
  }
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Maktab boshqaruvi</div><h1 className="page-title">Foydalanuvchilar</h1><p className="page-sub">Rollar, filial biriktiruvi va hisob faolligini boshqaring.</p></div></div>
    {usersQuery.isLoading || branchesQuery.isLoading ? <LoadingPanel rows={5} /> : usersQuery.isError || branchesQuery.isError ? <ErrorPanel retry={() => { usersQuery.refetch(); branchesQuery.refetch(); }} /> : !usersQuery.data?.length ? <div className="panel"><EmptyState title="Foydalanuvchilar yo‘q" copy="Maktab foydalanuvchilari ro‘yxati hozircha bo‘sh." /></div> : <section className="panel"><div className="panel-head"><div><div className="panel-title">Maktab hisoblari</div><div className="panel-kicker">{usersQuery.data.length} foydalanuvchi</div></div><Users size={18} color="#648065" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Filial</th><th>Holat</th><th>Qo‘shilgan</th></tr></thead><tbody>{usersQuery.data.map((person) => <tr key={person.clerkId} data-testid={`row-user-${person.clerkId}`}><td><div className="user-cell"><div className="avatar">{initials(person.fullName)}</div><div><strong>{person.fullName}</strong><span>{person.email}</span></div></div></td><td><select aria-label={`${person.fullName} roli`} className="select-small" value={person.role} onChange={(e) => update(person, { role: e.target.value as UserRole })}>{Object.entries(roleNames).map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></td><td><select aria-label={`${person.fullName} filiali`} className="select-small" value={person.branchId ?? ''} onChange={(e) => update(person, { branchId: e.target.value ? Number(e.target.value) : null })}><option value="">Filial yo‘q</option>{(branchesQuery.data ?? []).map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></td><td><button className={`active-toggle ${person.isActive ? '' : 'off'}`} disabled={mutation.isPending} onClick={() => update(person, { isActive: !person.isActive })} data-testid={`button-user-active-${person.clerkId}`}>{person.isActive ? 'Faol' : 'Faol emas'}</button></td><td>{formatDate(person.createdAt)}</td></tr>)}</tbody></table></div></section>}
    <Toast notice={notice} />
  </div>;
}

function BranchesPage() {
  const query = useListBranches();
  const create = useCreateBranch();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { notice, showNotice } = useNotice();
  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ data: { name: name.trim() } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListBranchesQueryKey() }); client.invalidateQueries({ queryKey: getListUsersQueryKey() }); setName(''); setError(''); showNotice('Yangi filial yaratildi.'); }, onError: () => setError('Filial yaratilmadi. Nomni tekshirib qayta urinib ko‘ring.') });
  }
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Maktab boshqaruvi</div><h1 className="page-title">Filiallar</h1><p className="page-sub">Maktabdagi bosmaxona va o‘qituvchilar uchun filiallarni boshqaring.</p></div></div>
    <div className="form-layout" style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(270px,.75fr)' }}><section className="panel"><div className="panel-head"><div><div className="panel-title">Mavjud filiallar</div><div className="panel-kicker">Hisoblarga biriktirish mumkin bo‘lgan joylar</div></div><Building2 size={18} color="#648065" /></div>{query.isLoading ? <LoadingPanel rows={3} /> : query.isError ? <ErrorPanel retry={() => query.refetch()} /> : !query.data?.length ? <EmptyState title="Filiallar hali yo‘q" copy="Yangi filial qo‘shing, so‘ng foydalanuvchilarga biriktiring." /> : <div className="branch-grid" style={{ padding: 15 }}>{query.data.map((branch: Branch) => <div className="panel branch-card" key={branch.id} data-testid={`card-branch-${branch.id}`}><div className="branch-symbol"><Building2 /></div><div><h3>{branch.name}</h3><p>Filial №{branch.id}</p></div></div>)}</div>}</section>
      <form className="panel form-panel" onSubmit={submit}><h2 className="form-section-title">Filial qo‘shish</h2><p className="form-section-copy">Filial nomi foydalanuvchi profillari va so‘rovlarda ko‘rinadi.</p><div className="field"><label htmlFor="branch-name">Filial nomi</label><input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="Masalan: Chilonzor filiali" data-testid="input-branch-name" /></div>{error && <p role="alert" style={{ color: '#a7433d', fontSize: 11 }}>{error}</p>}<div className="form-submit"><Button type="submit" disabled={create.isPending || !name.trim()}>{create.isPending ? 'Saqlanmoqda...' : 'Filial yaratish'} <Plus /></Button></div></form></div><Toast notice={notice} />
  </div>;
}
function NotFoundPortal() {
  return <div className="content"><div className="panel empty-state"><div className="state-icon"><CircleAlert /></div><h3>Sahifa topilmadi</h3><p>Bu manzil mavjud emas yoki ko‘chirilgan.</p><Link href="/app" className="button">Umumiy ko‘rinishga qaytish</Link></div></div>;
}
function NotFound() { return <main className="public-page"><div className="auth-page"><div className="auth-card"><div className="state-icon"><CircleAlert /></div><h2>Sahifa topilmadi</h2><p className="page-sub">Kiritilgan manzilni tekshirib ko‘ring.</p><Link href="/" className="button">Bosh sahifaga qaytish</Link></div></div></main>; }
function Router() {
  return <Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={() => <AuthPage />} />
    <Route path="/sign-up/*?" component={() => <AuthPage signUp />} />
    <Route path="/app" component={PortalGate} />
    <Route path="/app/requests" component={PortalGate} /><Route path="/app/requests/new" component={PortalGate} /><Route path="/app/requests/:id" component={PortalGate} />
    <Route path="/app/users" component={PortalGate} /><Route path="/app/branches" component={PortalGate} />
    <Route component={NotFound} />
  </Switch>;
}
function HomeRedirect() {
  const { isLoaded } = useUser();
  if (!isLoaded) return <div className="auth-page"><div className="auth-card"><div className="skeleton" style={{ height: 24 }} /></div></div>;
  return <><Show when="signed-in"><Redirect to="/app" /></Show><Show when="signed-out"><Home /></Show></>;
}
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}
function ClerkApp() {
  const [, navigate] = useLocation();
  const routeFromClerk = (path: string) =>
    basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    localization={translations}
    signInUrl={clerkPath('/sign-in')}
    signUpUrl={clerkPath('/sign-up')}
    routerPush={(to) => navigate(routeFromClerk(to))}
    routerReplace={(to) => navigate(routeFromClerk(to), { replace: true })}
    appearance={{
      theme: shadcn,
      cssLayerName: 'clerk',
      options: {
        logoPlacement: 'inside',
        logoLinkUrl: basePath || '/',
        logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        socialButtonsPlacement: 'top',
        socialButtonsVariant: 'blockButton',
      },
      variables: {
        colorPrimary: '#315b3d',
        colorForeground: '#284631',
        colorMutedForeground: '#6d7e6c',
        colorDanger: '#a7433d',
        colorBackground: '#fffef9',
        colorInput: '#fbfcf7',
        colorInputForeground: '#284631',
        colorNeutral: '#dce3d7',
        borderRadius: '10px',
        fontFamily: 'DM Sans, sans-serif',
      },
      elements: {
        rootBox: 'w-full flex justify-center',
        cardBox: 'bg-[#fffef9] border border-[#e0e5d9] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_16px_40px_rgba(32,57,39,0.08)]',
        card: '!shadow-none !border-0 !bg-transparent !rounded-none',
        footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
        headerTitle: 'font-bold text-[#284631]',
        headerSubtitle: 'text-[#6d7e6c]',
        socialButtonsBlockButtonText: 'font-semibold text-[#284631]',
        formFieldLabel: 'font-semibold text-[#455d49]',
        footerActionLink: 'font-semibold text-[#315b3d]',
        footerActionText: 'text-[#6d7e6c]',
        dividerText: 'text-[#8a978a]',
        identityPreviewEditButton: 'text-[#315b3d]',
        formFieldSuccessText: 'text-[#315b3d]',
        alertText: 'text-[#a7433d]',
        logoBox: 'h-8',
        logoImage: 'object-contain',
        socialButtonsBlockButton: 'border border-[#dce3d7] rounded-lg shadow-none',
        formButtonPrimary: 'font-bold rounded-lg shadow-none text-white',
        formFieldInput: 'rounded-lg border-[#dce3d7] bg-[#fbfcf7] text-[#284631]',
        footerAction: 'border-t border-[#edf0e8]',
        dividerLine: 'bg-[#dce3d7]',
        alert: 'border-[#f0dad5] bg-[#fbf0ee]',
        otpCodeFieldInput: 'border-[#dce3d7] bg-[#fbfcf7] text-[#284631]',
        formFieldRow: 'gap-1',
        main: 'gap-4',
      },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <Router />
    </QueryClientProvider>
  </ClerkProvider>;
}
function App() {
  return <WouterRouter base={basePath}><ClerkApp /></WouterRouter>;
}

export default App;