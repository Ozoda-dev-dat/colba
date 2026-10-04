import '../_group.css';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Files,
  ShieldCheck,
  Upload,
} from 'lucide-react';

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">mp</div>
      <div>
        <div className="brand-name">maktab print</div>
        <div className="brand-sub">Maktab uchun, har kuni</div>
      </div>
    </div>
  );
}

export function RequestFormPreview() {
  return (
    <main className="maktab-request">
      <header className="request-top">
        <a href="#" onClick={(event) => event.preventDefault()} aria-label="Maktab Print bosh sahifa">
          <Brand />
        </a>
        <a href="#" className="button ghost" onClick={(event) => event.preventDefault()}>
          <ArrowLeft /> Bosh sahifa
        </a>
      </header>

      <div className="request-shell">
        <div className="request-intro">
          <div className="eyebrow">O‘qituvchilar uchun · kirish talab qilinmaydi</div>
          <h1>Bosma so‘rovi</h1>
          <p>Qayerga, qachon va nechta nusxa kerakligini belgilang. Qolganini filial bosmaxonasi bajaradi.</p>
        </div>

        <div className="request-layout">
          <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
            <h2 className="form-section-title">So‘rov ma’lumotlari</h2>
            <p className="form-section-copy">Yulduzcha bilan belgilangan maydonlar majburiy.</p>

            <fieldset className="request-fields">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="preview-teacher-name">O‘qituvchi ismi *</label>
                <input id="preview-teacher-name" placeholder="Ism va familiya" />
              </div>
              <div className="field">
                <label htmlFor="preview-branch">Filial *</label>
                <select id="preview-branch" defaultValue="">
                  <option value="" disabled>Filialni tanlang</option>
                </select>
              </div>
              <div className="field full">
                <label htmlFor="preview-title">Material sarlavhasi *</label>
                <input id="preview-title" placeholder="Masalan: 7-sinf matematika — kasrlar" />
              </div>
              <div className="field">
                <label htmlFor="preview-copies">Nusxalar soni *</label>
                <input id="preview-copies" type="number" defaultValue="1" />
              </div>
              <div className="field">
                <label htmlFor="preview-deadline">Kerak bo‘ladigan sana va vaqt *</label>
                <input id="preview-deadline" type="datetime-local" />
              </div>
              <div className="field full">
                <label>
                  Material fayli * <span className="field-hint">— 1–8 ta fayl</span>
                </label>
                <label className="drop-zone" htmlFor="preview-files">
                  <Upload />
                  <strong>Faylni tanlang yoki shu yerga olib keling</strong>
                  <span className="field-hint">PDF, JPG, PNG, WEBP yoki Word · 15 MB gacha</span>
                  <input id="preview-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden />
                </label>
              </div>
              <div className="field full">
                <label htmlFor="preview-note">
                  Bosmaxona uchun izoh <span className="field-hint">— ixtiyoriy</span>
                </label>
                <textarea id="preview-note" placeholder="Qog‘oz turi, rangli bosma yoki boshqa ko‘rsatmalar..." />
              </div>
            </div>
            </fieldset>

            <div className="form-submit">
              <button type="button" className="button">
                So‘rovni yuborish <ArrowRight />
              </button>
            </div>
          </form>

          <aside className="form-side">
            <h3>Yuborishdan oldin</h3>
            <p>So‘rovingiz faqat tanlangan filialning bosmaxona navbatiga qo‘shiladi.</p>
            <div className="side-rule" />
            <div className="form-note">
              <ShieldCheck />
              <span>Hisob ochish shart emas. Ismingiz so‘rov ma’lumotlari uchun kerak.</span>
            </div>
            <div className="form-note">
              <Files />
              <span>Fayllar xususiy saqlanadi va faqat ruxsatli xodimlarga ochiladi.</span>
            </div>
            <div className="form-note">
              <Clock3 />
              <span>Kerakli vaqtni bosmaxona ishni rejalashtirishi uchun aniq belgilang.</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}