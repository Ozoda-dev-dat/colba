import './_group.css';
import type { ReactNode } from 'react';

function ArrowRight() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function MockLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <a href={href} className={className} onClick={(event) => event.preventDefault()}>{children}</a>;
}

function Home() {
  return (
    <main className="maktab-fonts public-page">
      <header className="public-nav">
        <div className="home-audience">O‘qituvchilar uchun</div>
        <div className="public-links">
          <MockLink href="/sign-in" className="button ghost">
            Printer xodimlari <ArrowRight />
          </MockLink>
        </div>
      </header>
      <section className="public-hero">
        <div>
          <div className="hero-tag"><i /> Bosma so‘rovi</div>
          <h1 className="hero-title">Darsga kerakli.<br /><em>Vaqtida tayyor.</em></h1>
          <p className="hero-copy">Faylni yuboring, filialni tanlang. Bosmaxona navbatni davom ettiradi.</p>
          <div className="hero-actions">
            <MockLink href="/request" className="button">
              Bosma so‘rovini yuborish <ArrowRight />
            </MockLink>
          </div>
          <div className="home-steps">
            <span><b>01</b> Fayl</span><i /><span><b>02</b> Filial</span><i /><span><b>03</b> Navbat</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Bosmaga tayyor o‘quv varaqasi tasviri">
          <div className="visual-orbit" />
          <div className="print-sheet">
            <div className="sheet-top"><span>ISH VARAQASI · 04</span><span>7-SINF</span></div>
            <div className="sheet-title">Kasrlar bilan<br />ishlaymiz</div>
            <div className="sheet-line" />
            <div className="sheet-line" />
            <div className="sheet-line short" />
            <div className="worksheet">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
            <div className="sheet-stamp">BOSMAGA<br />TAYYOR</div>
          </div>
          <div className="hero-caption">DARS UCHUN ISH VARAQASI</div>
        </div>
      </section>
      <footer className="public-footer"><span>Hisob ochish shart emas.</span></footer>
    </main>
  );
}

export function Current() {
  return <Home />;
}