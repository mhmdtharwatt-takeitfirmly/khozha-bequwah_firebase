import { useState, useEffect, useCallback } from "react";
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query } from "firebase/firestore";

const ADMIN_EMAILS = ["mhmd.thar@gmail.com"];

const GALLUP_34 = [
  { name: "Achiever - المنجز", domain: "التنفيذ" },
  { name: "Activator - المحفّز", domain: "التأثير" },
  { name: "Adaptability - المتأقلم", domain: "بناء العلاقات" },
  { name: "Analytical - التحليلى", domain: "التفكير الاستراتيجى" },
  { name: "Arranger - المنظّم", domain: "التنفيذ" },
  { name: "Belief - المبادئى", domain: "التنفيذ" },
  { name: "Command - القيادى", domain: "التأثير" },
  { name: "Communication - التواصل", domain: "التأثير" },
  { name: "Competition - التنافسى", domain: "التأثير" },
  { name: "Connectedness - الترابطى", domain: "بناء العلاقات" },
  { name: "Consistency - المستمر", domain: "التنفيذ" },
  { name: "Context - السياقى", domain: "التفكير الاستراتيجى" },
  { name: "Deliberative - المتأنى", domain: "التنفيذ" },
  { name: "Developer - المطوّر", domain: "بناء العلاقات" },
  { name: "Discipline - المنضبط", domain: "التنفيذ" },
  { name: "Empathy - المتعاطف", domain: "بناء العلاقات" },
  { name: "Focus - المركّز", domain: "التنفيذ" },
  { name: "Futuristic - المستقبلى", domain: "التفكير الاستراتيجى" },
  { name: "Harmony - المتناغم", domain: "بناء العلاقات" },
  { name: "Ideation - المبتكر", domain: "التفكير الاستراتيجى" },
  { name: "Includer - المحتوى", domain: "بناء العلاقات" },
  { name: "Individualization - التفريدى", domain: "بناء العلاقات" },
  { name: "Input - الجامع", domain: "التفكير الاستراتيجى" },
  { name: "Intellection - المفكّر", domain: "التفكير الاستراتيجى" },
  { name: "Learner - المتعلّم", domain: "التفكير الاستراتيجى" },
  { name: "Maximizer - المعظّم", domain: "التأثير" },
  { name: "Positivity - الإيجابى", domain: "بناء العلاقات" },
  { name: "Relator - العلاقاتى", domain: "بناء العلاقات" },
  { name: "Responsibility - المسؤولية", domain: "التنفيذ" },
  { name: "Restorative - المرمّم", domain: "التنفيذ" },
  { name: "Self-Assurance - الواثق", domain: "التأثير" },
  { name: "Significance - البارز", domain: "التأثير" },
  { name: "Strategic - الاستراتيجى", domain: "التفكير الاستراتيجى" },
  { name: "Woo - المحبّب", domain: "التأثير" },
];

const DOMAIN_COLORS = {
  "التنفيذ": "#7B2D8E",
  "التأثير": "#E8963E",
  "بناء العلاقات": "#2E75B6",
  "التفكير الاستراتيجى": "#0F6E56",
};

const TALENT_OPTIONS = ["طريقة تفكير", "ذكاء عاطفى", "تحليل", "حل مشاكل", "سرعة الفهم"];
const INVEST_OPTIONS = ["وقت", "مادى / مال", "تعليم", "تدريب", "اهتمامات"];

const STEPS = [
  { id: "_phase1_intro", phase: 1, label: "", type: "phase_intro", phaseTitle: "المرحلة الأولى", phaseDesc: "التعرف على نقطة القوة", phaseDetail: "هنتعرف على نقطة القوة من كل الزوايا: المفهوم، طريقة التقديم، فك الشفرة، وتحليل SWOT" },
  { id: "strength_idx", phase: 1, label: "اختر نقطة القوة", type: "strength_select" },
  { id: "rank", phase: 1, label: "ترتيب نقطة القوة", subtitle: "ترتيبها من 1 إلى 34 حسب آخر اختبار جالوب", type: "rank" },
  { id: "concept", phase: 1, label: "المفهوم العام", subtitle: "إيه فهمك لنقطة القوة دى؟ بتظهر إزاى فى حياتك اليومية؟", type: "textarea" },
  { id: "present", phase: 1, label: "التقديم للآخرين", subtitle: "لما حد يتعامل معاك، إيه اللى بيلاحظه عليك بسبب النقطة دى؟", type: "textarea" },
  { id: "interact", phase: 1, label: "التعامل مع شخصية تمتلكها", subtitle: "لما بتقابل شخص عنده نفس النقطة، إزاى بتتعامل معاه؟", type: "textarea" },
  { id: "talent", phase: 1, label: "الموهبة (المهارة)", subtitle: "إيه الموهبة الطبيعية اللى بتغذى النقطة دى؟", type: "combo_select", options: TALENT_OPTIONS },
  { id: "investment", phase: 1, label: "الاستثمار", subtitle: "إيه اللى استثمرته عشان النقطة دى بقت قوة؟", type: "combo_select", options: INVEST_OPTIONS },
  { id: "s", phase: 1, label: "S — أقوى جانب", subtitle: "إيه أقوى حاجة داخلية جواك خلتها نقطة قوة؟", type: "textarea" },
  { id: "w", phase: 1, label: "W — خطر داخلى", subtitle: "إيه الخطر الداخلى اللى ممكن يأذيها ويضعفها؟", type: "textarea" },
  { id: "o", phase: 1, label: "O — فرصة", subtitle: "إيه الفرصة حواليك اللى لازم تستغلها لتعزيز النقطة دى؟", type: "textarea" },
  { id: "t_swot", phase: 1, label: "T — تهديد خارجى", subtitle: "إيه العامل الخارجى اللى ممكن يضعف النقطة دى؟", type: "textarea" },
  { id: "_phase2_intro", phase: 2, label: "", type: "phase_intro", phaseTitle: "المرحلة الثانية", phaseDesc: "الفهم وتحليل المراجع #بإحسان", phaseDetail: "قبل تحديد الهدف هنربط نقطة القوة بأسماء الله الحسنى وطريقة النبى ﷺ والقرآن والقدوة من السيرة" },
  { id: "allah_name", phase: 2, label: "الربط بأسماء الله الحسنى", subtitle: "إيه اسم الله اللى بيدعم النقطة دى؟", type: "text" },
  { id: "prophet", phase: 2, label: "طريقة النبى ﷺ", subtitle: "إيه الموقف من حياة النبى ﷺ اللى بيعكس النقطة دى؟", type: "textarea" },
  { id: "rolemodel", phase: 2, label: "القدوة من السيرة", subtitle: "مين الشخصية اللى تعتبرها نموذج للنقطة دى؟ وليه؟", type: "textarea" },
  { id: "quran", phase: 2, label: "القرآن الكريم", subtitle: "إيه الآية المرتبطة بنقطة القوة دى؟", type: "textarea" },
  { id: "warning", phase: 2, label: "نحذر من؟", subtitle: "إيه السلوك اللى لو مشيت فيه هتنحرف للجانب المظلم؟", type: "textarea" },
  { id: "_phase3_intro", phase: 3, label: "", type: "phase_intro", phaseTitle: "المرحلة الثالثة", phaseDesc: "التحديد واختيار الهدف", phaseDetail: "هنختار جانب من عجلة الحياة ونحدد معايير القياس ونصيغ هدف SMART" },
  { id: "wheel", phase: 3, label: "جانب عجلة الحياة", subtitle: "اختار الجانب اللى عايز تحدد فيه الهدف", type: "select", options: ["الصحى","المالى","البيزنس / الشغل","العلاقات","الأسرة","الحياة الاجتماعية","تطوير الذات","الترفيهى"] },
  { id: "kpi1", phase: 3, label: "KPI #1 — قياس الحفاظ", subtitle: "إيه المعيار اللى يثبت إنك محافظ على النقطة دى؟", type: "textarea" },
  { id: "kpi2", phase: 3, label: "KPI #2 — قياس النمو", subtitle: "إيه المعيار اللى يثبت إنك بتتقدم فى استخدام النقطة دى؟", type: "textarea" },
  { id: "goal", phase: 3, label: "الهدف SMART", subtitle: "صيغ هدف محدد وقابل للقياس ومحدد زمنياً", type: "textarea" },
];

const PHASE_NAMES = { 1: "التعرف على نقطة القوة", 2: "الفهم وتحليل المراجع #بإحسان", 3: "التحديد واختيار الهدف" };
const PC = { 1: "#1B3A5C", 2: "#D4A853", 3: "#D85A30" };
const BRAND = { navy: "#1B3A5C", gold: "#D4A853", cream: "#F7F3ED" };

const st = {
  async load(key, uid) {
    if (!uid) return null;
    try { const snap = await getDoc(doc(db, "users", uid, "data", key)); return snap.exists() ? snap.data().value : null; } catch { return null; }
  },
  async save(key, data, uid) {
    if (!uid) return;
    try { await setDoc(doc(db, "users", uid, "data", key), { value: data, updatedAt: new Date().toISOString() }); } catch(e) { console.error(e); }
  }
};

export default function App() {
  const [authState, setAuthState] = useState("loading");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("splash");
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dailyLog, setDailyLog] = useState({});
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthState(u ? "authed" : "login");
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    async function init() {
      const uid = user.uid;
      const [p, e, t, d, w] = await Promise.all([
        st.load("profile", uid), st.load("entries", uid), st.load("tasks", uid), st.load("daily", uid), st.load("weekly", uid)
      ]);
      setProfile(p); setEntries(e || []); setTasks(t || []); setDailyLog(d || {}); setWeeklyReviews(w || []);
      setLoading(false);
      setView(p ? "home" : "splash");
    }
    init();
  }, [user]);

  const uid = user?.uid;

  const saveProfile = async (p) => {
    setProfile(p); await st.save("profile", p, uid);
    await setDoc(doc(db, "users", uid, "meta", "profile"), { ...p, email: user.email, uid, updatedAt: new Date().toISOString() });
    setView("home");
  };

  const saveEntry = useCallback(async (answers) => {
    const ts = new Date().toISOString();
    const strengthInfo = GALLUP_34[answers.strength_idx];
    const entry = { ...answers, name: strengthInfo.name, domain: strengthInfo.domain, updatedAt: ts, createdAt: editIdx !== null ? entries[editIdx].createdAt : ts };
    let next;
    if (editIdx !== null) { next = [...entries]; next[editIdx] = entry; setEditIdx(null); }
    else next = [...entries, entry];
    setEntries(next); await st.save("entries", next, uid); setView("home");
  }, [entries, editIdx, uid]);

  const deleteEntry = useCallback(async (idx) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next); await st.save("entries", next, uid);
  }, [entries, uid]);

  const saveTasks = async (t) => { setTasks(t); await st.save("tasks", t, uid); };
  const saveDaily = async (d) => { setDailyLog(d); await st.save("daily", d, uid); };
  const saveWeekly = async (w) => { setWeeklyReviews(w); await st.save("weekly", w, uid); };

  const usedIdxs = entries.map(e => e.strength_idx);

  if (authState === "loading") return <Wrap><p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 40 }}>جارى التحميل...</p></Wrap>;
  if (authState === "login") return <AuthView onAuth={() => setAuthState("authed")} />;
  if (loading) return <Wrap><p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: 40 }}>جارى تحميل البيانات...</p></Wrap>;

  if (view === "splash") return <SplashView onStart={() => setView("onboard")} />;
  if (view === "onboard") return <OnboardView existing={profile} onSave={saveProfile} />;
  if (view === "form") return <FormView initial={editIdx !== null ? entries[editIdx] : {}} usedIdxs={editIdx !== null ? usedIdxs.filter(i => i !== entries[editIdx].strength_idx) : usedIdxs} onSave={saveEntry} onCancel={() => { setEditIdx(null); setView("home"); }} />;
  if (view === "detail" && editIdx !== null) return <DetailView entry={entries[editIdx]} tasks={tasks} onBack={() => { setEditIdx(null); setView("home"); }} onEdit={() => setView("form")} />;
  if (view === "tasks") return <TaskBreakdownView entries={entries} tasks={tasks} onSave={(t) => { saveTasks(t); setView("tracker"); }} onBack={() => setView("home")} />;
  if (view === "tracker") return <DailyTrackerView tasks={tasks} dailyLog={dailyLog} onSave={saveDaily} onReview={() => setView("review")} onBack={() => setView("home")} />;
  if (view === "review") return <WeeklyReviewView entries={entries} tasks={tasks} dailyLog={dailyLog} reviews={weeklyReviews} onSave={(r) => { saveWeekly([...weeklyReviews, r]); setView("tracker"); }} onBack={() => setView("tracker")} />;
  if (view === "admin") return <AdminDashboard onBack={() => setView("home")} />;

  return <HomeView profile={profile} entries={entries} tasks={tasks} dailyLog={dailyLog} userEmail={user?.email}
    onNew={() => { setEditIdx(null); setView("form"); }} onSelect={(i) => { setEditIdx(i); setView("detail"); }}
    onDelete={deleteEntry} onExport={() => exportData(profile, entries)} onEditProfile={() => setView("onboard")}
    onTasks={() => setView("tasks")} onTracker={() => setView("tracker")} onAdmin={() => setView("admin")}
    onLogout={() => { signOut(auth); setAuthState("login"); setProfile(null); setEntries([]); setView("splash"); }} />;
}

function AuthView({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
      onAuth();
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("الإيميل ده مسجل قبل كده. سجّل دخول.");
      else if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") setError("الإيميل أو كلمة السر غلط.");
      else if (e.code === "auth/weak-password") setError("كلمة السر لازم تكون 6 حروف على الأقل.");
      else if (e.code === "auth/invalid-email") setError("الإيميل مش صحيح.");
      else setError("حصل خطأ. حاول تانى.");
    }
    setLoading(false);
  };

  return (
    <Wrap>
      <div style={{ textAlign: "center", padding: "30px 0 16px" }}>
        <Logo size="lg" />
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 10 }}>تحديد الأهداف بناءً على نقاط القوة</div>
      </div>
      <FBox>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: mode === "login" ? BRAND.navy : "var(--color-background-primary)", color: mode === "login" ? BRAND.gold : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>تسجيل دخول</button>
          <button onClick={() => { setMode("signup"); setError(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: mode === "signup" ? BRAND.navy : "var(--color-background-primary)", color: mode === "signup" ? BRAND.gold : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>حساب جديد</button>
        </div>
        <FLabel>البريد الإلكترونى</FLabel>
        <FInput value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" type="email" style={{ direction: "ltr", textAlign: "left" }} />
        <FLabel style={{ marginTop: 12 }}>كلمة السر</FLabel>
        <FInput value={pass} onChange={e => setPass(e.target.value)} placeholder="6 حروف على الأقل" type="password" style={{ direction: "ltr", textAlign: "left" }}
          onKeyDown={e => e.key === "Enter" && handle()} />
        {error && <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#FCEBEB", color: "#A32D2D", fontSize: 12 }}>{error}</div>}
      </FBox>
      <BtnPrimary disabled={!email.trim() || pass.length < 6 || loading} onClick={handle}>
        {loading ? "جارى..." : mode === "login" ? "دخول" : "إنشاء حساب"}
      </BtnPrimary>
    </Wrap>
  );
}

function SplashView({ onStart }) {
  return (
    <Wrap>
      <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
        <Logo size="lg" />
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 10, marginBottom: 6 }}>تحديد الأهداف بناءً على نقاط القوة</div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 24 }}>أكاديمية الإحسان — فريق بصمة</div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "16px 14px", textAlign: "right", marginBottom: 20, border: `1px solid ${BRAND.gold}30` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>إزاى بتشتغل؟</div>
          {["اكتشف نقاط قوتك الـ34 من تقييم جالوب", "حلّل كل نقطة قوة بالإطار الإحسانى", "حدد 34 هدف SMART فى جوانب عجلة الحياة الـ8", "تابع تقدمك بمعايير قياس واضحة"].map((t, i) =>
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <span style={{ background: BRAND.navy, color: BRAND.gold, borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{t}</span>
            </div>
          )}
        </div>
        <button onClick={onStart} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: BRAND.navy, color: BRAND.gold, fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5 }}>يلا نبدأ</button>
      </div>
    </Wrap>
  );
}

function OnboardView({ existing, onSave }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [countryCode, setCountryCode] = useState(existing?.countryCode || "+20");
  const [isAlumni, setIsAlumni] = useState(existing?.isAlumni ?? null);
  const [inRabita, setInRabita] = useState(existing?.inRabita ?? null);
  const [groupNum, setGroupNum] = useState(existing?.groupNum || "");
  const [batchNum, setBatchNum] = useState(existing?.batchNum || "");
  const [hasGallup, setHasGallup] = useState(existing?.hasGallup ?? null);
  const [scope, setScope] = useState(existing?.scope ?? null);

  if (step === 1) return (
    <Wrap>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Logo size="md" />
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 8 }}>عرّفنا بنفسك عشان نبدأ</div>
      </div>
      <FBox>
        <FLabel>الاسم الكامل</FLabel>
        <FInput value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك هنا..." />
        <FLabel style={{ marginTop: 12 }}>رقم التواصل (اختيارى)</FLabel>
        <div style={{ display: "flex", gap: 6 }}>
          <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ width: 90, borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 6px", fontSize: 13, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)", direction: "ltr" }}>
            {["+20","+966","+971","+974","+973","+968","+965","+962","+961","+212","+216","+218","+249","+1","+44","+49","+33"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <FInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الموبايل" style={{ direction: "ltr", textAlign: "left" }} />
        </div>
      </FBox>
      <BtnPrimary disabled={!name.trim()} onClick={() => setStep(2)}>التالى ←</BtnPrimary>
      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#FAEEDA", border: "1px solid #FAC775", textAlign: "right" }}>
        <span style={{ fontSize: 11, color: "#854F0B", lineHeight: 1.7 }}>بياناتك هتستخدم لعرض أهدافك بشكل أفضل وقد تتم مراجعتها من فريق بصمة لدعمك. باستمرارك أنت موافق على ذلك.</span>
      </div>
    </Wrap>
  );

  if (step === 2) return (
    <Wrap>
      <StepHeader n="2" title="أكاديمية الإحسان" onBack={() => setStep(1)} />
      <FBox>
        <FLabel>هل أنت من خريجى أكاديمية الإحسان؟</FLabel>
        <BtnGroup options={[{ v: true, l: "نعم" }, { v: false, l: "لا" }]} value={isAlumni} onChange={v => { setIsAlumni(v); if (!v) { setInRabita(null); setGroupNum(""); setBatchNum(""); } }} />
        {isAlumni === true && (
          <>
            <FLabel style={{ marginTop: 14 }}>هل أنت مشترك فى رابطة الخريجين؟</FLabel>
            <BtnGroup options={[{ v: true, l: "نعم" }, { v: false, l: "لا" }]} value={inRabita} onChange={setInRabita} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <FLabel>رقم الدفعة</FLabel>
                <FInput value={batchNum} onChange={e => setBatchNum(e.target.value)} placeholder="مثال: 2" />
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>رقم الجروب</FLabel>
                <FInput value={groupNum} onChange={e => setGroupNum(e.target.value)} placeholder="مثال: G10" />
              </div>
            </div>
          </>
        )}
      </FBox>
      <BtnPrimary disabled={isAlumni === null || (isAlumni && !batchNum.trim())} onClick={() => {
        if (isAlumni) setStep(4);
        else setStep(3);
      }}>التالى ←</BtnPrimary>
    </Wrap>
  );

  if (step === 3) return (
    <Wrap>
      <StepHeader n="3" title="اختبار جالوب" onBack={() => setStep(2)} />
      <FBox>
        <FLabel>هل عملت اختبار جالوب CliftonStrengths وتعرف نقاط قوتك؟</FLabel>
        <BtnGroup options={[{ v: true, l: "نعم، معايا النتيجة" }, { v: false, l: "لا، لسه ما عملتش" }]} value={hasGallup} onChange={setHasGallup} />
      </FBox>
      {hasGallup === false && (
        <div style={{ background: "#FAEEDA", borderRadius: 12, padding: "18px 16px", marginBottom: 14, border: "1px solid #FAC775", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📞</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#854F0B", marginBottom: 6 }}>محتاج تعمل اختبار جالوب الأول</div>
          <div style={{ fontSize: 12, color: "#854F0B", lineHeight: 1.7, marginBottom: 12 }}>عشان تقدر تستخدم التطبيق محتاج تكون عارف نقاط قوتك من اختبار CliftonStrengths. تواصل معانا وهنساعدك تبدأ.</div>
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fff", border: "1px solid #FAC775" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#854F0B" }}>رقم الدعم والتواصل</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: PC[1], direction: "ltr", marginTop: 4 }}>+20 100 XXX XXXX</div>
            <div style={{ fontSize: 11, color: "#854F0B", marginTop: 4 }}>واتساب أو اتصال — من 10 ص لـ 8 م</div>
          </div>
        </div>
      )}
      {hasGallup === true && <BtnPrimary onClick={() => setStep(4)}>التالى ←</BtnPrimary>}
    </Wrap>
  );

  if (step === 4) return (
    <Wrap>
      <StepHeader n={isAlumni ? "3" : "4"} title="نطاق العمل" onBack={() => setStep(isAlumni ? 2 : 3)} />
      <FBox>
        <FLabel>عايز تشتغل على كام نقطة قوة؟</FLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          <ScopeCard selected={scope === 34} onClick={() => setScope(34)} title="الـ34 نقطة كاملة" subtitle="التحليل الشامل — الأفضل لخريجى الأكاديمية" icon="🎯" />
          <ScopeCard selected={scope === 5} onClick={() => setScope(5)} title="أول 5 نقاط (مؤقتاً)" subtitle="ابدأ بالأهم وكمّل الباقى لاحقاً" icon="⚡" />
        </div>
      </FBox>
      <BtnPrimary disabled={!scope} onClick={() => onSave({ name: name.trim(), phone: phone.trim(), countryCode, isAlumni, inRabita, groupNum: groupNum.trim(), batchNum: batchNum.trim(), hasGallup: isAlumni ? true : hasGallup, scope, topN: scope })}>
        حفظ والبدء ✓
      </BtnPrimary>
    </Wrap>
  );
}

function ScopeCard({ selected, onClick, title, subtitle, icon }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, border: selected ? `2px solid ${PC[1]}` : "1.5px solid var(--color-border-tertiary)", background: selected ? `${PC[1]}10` : "var(--color-background-primary)", cursor: "pointer", transition: "all 0.15s" }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{subtitle}</div>
      </div>
      {selected && <span style={{ marginRight: "auto", fontSize: 18, color: PC[1] }}>●</span>}
    </div>
  );
}

function StepHeader({ n, title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</span>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>خطوة {n}</span>
    </div>
  );
}

function FBox({ children }) {
  return <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "18px 16px", marginBottom: 14, border: "1px solid var(--color-border-tertiary)" }}>{children}</div>;
}
function FLabel({ children, style: s }) {
  return <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 6, ...s }}>{children}</label>;
}
function FInput(props) {
  return <input {...props} style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)", ...props.style }} />;
}
function BtnGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(o => (
        <button key={String(o.v)} onClick={() => onChange(o.v)}
          style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: value === o.v ? `2px solid ${PC[1]}` : "1.5px solid var(--color-border-tertiary)", background: value === o.v ? `${PC[1]}15` : "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, fontWeight: value === o.v ? 700 : 400, fontFamily: "inherit", cursor: "pointer" }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function BtnPrimary({ children, disabled, onClick }) {
  return <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: disabled ? "var(--color-border-tertiary)" : BRAND.navy, color: BRAND.gold, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: disabled ? "default" : "pointer", transition: "background 0.2s" }}>{children}</button>;
}

function HomeView({ profile, entries, tasks, dailyLog, userEmail, onNew, onSelect, onDelete, onExport, onEditProfile, onTasks, onTracker, onAdmin, onLogout }) {
  const done = entries.length;
  const total = profile.scope || 34;
  const pct = Math.round((done / total) * 100);
  const domains = {};
  entries.forEach(e => { domains[e.domain] = (domains[e.domain] || 0) + 1; });

  return (
    <Wrap>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: `1px solid ${BRAND.gold}30` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>أهلاً {profile.name}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>خُذها بقوة — مشروع الـ{total}</div>
          </div>
          <button onClick={onEditProfile} style={{ background: "none", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "var(--color-text-secondary)", fontFamily: "inherit", cursor: "pointer" }}>تعديل</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {userEmail && <ProfileTag label={userEmail} color="#888" />}
          {profile.isAlumni && <ProfileTag label="خريج أكاديمية الإحسان" color="#0F6E56" />}
          {profile.inRabita && <ProfileTag label="رابطة الخريجين" color="#534AB7" />}
          {profile.batchNum && <ProfileTag label={`الدفعة ${profile.batchNum}`} color="#2E75B6" />}
          {profile.groupNum && <ProfileTag label={profile.groupNum} color="#2E75B6" />}
          {!profile.isAlumni && profile.hasGallup && <ProfileTag label="اختبار جالوب ✓" color="#0F6E56" />}
          <ProfileTag label={`الهدف: ${total} نقطة`} color="#D85A30" />
          {profile.phone && <ProfileTag label={profile.phone} color="#888" />}
        </div>
      </div>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
          <Stat n={done} label="مكتملة" color={PC[1]} />
          <Stat n={total - done} label="متبقية" color="#888" />
          <Stat n={pct + "%"} label="اكتمال" color={PC[3]} />
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${BRAND.navy}, ${BRAND.gold})`, borderRadius: 4, transition: "width 0.4s" }} />
        </div>
        {Object.keys(domains).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {Object.entries(domains).map(([d, c]) => (
              <span key={d} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${DOMAIN_COLORS[d]}18`, color: DOMAIN_COLORS[d], fontWeight: 600 }}>{d}: {c}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>نقاط القوة ({done}/{total})</div>

      {entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>لسه مفيش نقاط قوة مسجلة. ابدأ بأول واحدة!</div>
      )}

      {[...entries].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((e) => {
        const origIdx = entries.indexOf(e);
        const hasTasks = tasks.some(t => t.entryName === e.name && t.subtasks.length > 0);
        return (
        <div key={origIdx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", cursor: "pointer" }} onClick={() => onSelect(origIdx)}>
          <span style={{ background: DOMAIN_COLORS[e.domain] || PC[1], color: "#fff", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{e.rank || "—"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.goal?.slice(0, 50)}...</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 14, color: PC[1] }}>✓</span>
            {hasTasks ? (
              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: `${BRAND.gold}20`, color: BRAND.gold, fontWeight: 600 }}>مُقسّم</span>
            ) : (
              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-tertiary)", fontWeight: 600 }}>بدون مهام</span>
            )}
          </div>
          <button onClick={(ev) => { ev.stopPropagation(); if(confirm("حذف نقطة القوة دى؟")) onDelete(origIdx); }} style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
        </div>
        );
      })}

      {done < total && (
        <button onClick={onNew} style={{ width: "100%", marginTop: 8, padding: "14px 0", borderRadius: 10, border: "2px dashed var(--color-border-secondary)", background: "var(--color-background-primary)", color: PC[1], fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
          + إضافة نقطة قوة جديدة ({done + 1}/{total})
        </button>
      )}

      {done > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 18, marginBottom: 8 }}>الأهداف حسب عجلة الحياة</div>
          {(() => {
            const byWheel = {};
            entries.forEach(e => {
              if (!e.wheel) return;
              if (!byWheel[e.wheel]) byWheel[e.wheel] = [];
              byWheel[e.wheel].push(e);
            });
            const wheelColors = { "الصحى": "#E8963E", "المالى": "#0F6E56", "البيزنس / الشغل": "#D85A30", "العلاقات": "#2E75B6", "الأسرة": "#7B2D8E", "الحياة الاجتماعية": "#534AB7", "تطوير الذات": "#0F6E56", "الترفيهى": "#E8963E" };
            return Object.entries(byWheel).map(([wheel, items]) => (
              <div key={wheel} style={{ marginBottom: 10, background: "var(--color-background-secondary)", borderRadius: 10, border: "1px solid var(--color-border-tertiary)", overflow: "hidden" }}>
                <div style={{ padding: "6px 12px", background: `${wheelColors[wheel] || PC[1]}12`, borderBottom: "1px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: wheelColors[wheel] || PC[1] }}>{wheel}</span>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{items.length} هدف</span>
                </div>
                {items.map((e, j) => (
                  <div key={j} style={{ padding: "8px 12px", borderBottom: j < items.length - 1 ? "1px solid var(--color-border-tertiary)" : "none", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: DOMAIN_COLORS[e.domain], marginTop: 2, flexShrink: 0 }}>#{e.rank || "—"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{e.goal}</div>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}

          <button onClick={onExport} style={{ width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 10, border: "none", background: BRAND.navy, color: BRAND.gold, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
            تحميل جميع البيانات ({done} نقطة)
          </button>

          {entries.length >= 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={onTasks} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1.5px solid ${BRAND.gold}`, background: "var(--color-background-primary)", color: BRAND.navy, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
                {tasks.length > 0 ? "تعديل المهام" : "تقسيم الأهداف لمهام"}
              </button>
              {tasks.length > 0 && (
                <button onClick={onTracker} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: PC[3], color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
                  المتابعة اليومية
                </button>
              )}
            </div>
          )}

          <button onClick={onAdmin} style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 10, border: "1px dashed var(--color-border-secondary)", background: "transparent", color: "var(--color-text-tertiary)", fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>
            لوحة تحكم الأدمن
          </button>

          <button onClick={onLogout} style={{ width: "100%", marginTop: 6, padding: "8px 0", borderRadius: 10, border: "none", background: "transparent", color: "var(--color-text-tertiary)", fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>
            تسجيل خروج
          </button>
        </>
      )}
    </Wrap>
  );
}

function FormView({ initial, usedIdxs, onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initial);
  const [customTalents, setCustomTalents] = useState([]);
  const [customInvest, setCustomInvest] = useState([]);
  const [addingCustom, setAddingCustom] = useState("");
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  let canNext = false;
  if (current.type === "phase_intro") canNext = true;
  else if (current.type === "strength_select") canNext = answers.strength_idx !== undefined && answers.strength_idx !== null;
  else if (current.type === "rank") canNext = answers.rank > 0;
  else if (current.type === "combo_select") canNext = answers[current.id]?.trim?.()?.length > 0;
  else canNext = answers[current.id]?.trim?.()?.length > 0;

  const phaseLabel = () => {
    if (current.phase === 1 && step >= 9) return "SWOT";
    if (current.phase === 1 && step >= 7 && step <= 8) return "فك الشفرة";
    return `م${current.phase}`;
  };

  if (current.type === "phase_intro") {
    return (
      <Wrap>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{step + 1} / {STEPS.length}</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>إلغاء</button>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", marginBottom: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: PC[current.phase], borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ display: "inline-block", padding: "6px 20px", borderRadius: 20, background: PC[current.phase], color: "#fff", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>{current.phaseTitle}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>{current.phaseDesc}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.8, maxWidth: 400, margin: "0 auto" }}>{current.phaseDetail}</div>
          {answers.strength_idx !== undefined && answers.strength_idx !== null && (
            <div style={{ marginTop: 14, display: "inline-block", padding: "4px 14px", borderRadius: 8, background: `${DOMAIN_COLORS[GALLUP_34[answers.strength_idx].domain]}12` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: DOMAIN_COLORS[GALLUP_34[answers.strength_idx].domain] }}>{GALLUP_34[answers.strength_idx].name}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
            style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: step === 0 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", fontSize: 14, fontFamily: "inherit", cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1 }}>السابق</button>
          <button onClick={() => setStep(step + 1)}
            style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: PC[current.phase], color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
            يلا نبدأ ←
          </button>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>المرحلة {current.phase}: {PHASE_NAMES[current.phase]}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{step + 1} / {STEPS.length}</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>إلغاء</button>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--color-border-tertiary)", marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: PC[current.phase], borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>

      {answers.strength_idx !== undefined && answers.strength_idx !== null && step > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "4px 10px", borderRadius: 8, background: `${DOMAIN_COLORS[GALLUP_34[answers.strength_idx].domain]}12` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: DOMAIN_COLORS[GALLUP_34[answers.strength_idx].domain] }}>{GALLUP_34[answers.strength_idx].name}</span>
          {answers.rank && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>#{answers.rank}</span>}
        </div>
      )}

      <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "18px 14px", marginBottom: 12, border: `1.5px solid ${PC[current.phase]}22` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: current.subtitle ? 6 : 12 }}>
          <span style={{ background: PC[current.phase], color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{phaseLabel()}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{current.label}</span>
        </div>
        {current.subtitle && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.7 }}>{current.subtitle}</p>}

        {current.type === "strength_select" ? (
          <StrengthSelector value={answers.strength_idx} usedIdxs={usedIdxs} onChange={idx => setAnswers({ ...answers, strength_idx: idx })} />
        ) : current.type === "rank" ? (
          <div>
            <input type="number" min="1" max="34" value={answers.rank || ""} onChange={e => setAnswers({ ...answers, rank: Math.min(34, Math.max(1, parseInt(e.target.value) || 0)) })} placeholder="1-34"
              style={{ width: 100, textAlign: "center", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 12px", fontSize: 20, fontWeight: 700, fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginRight: 10 }}>من 34</span>
          </div>
        ) : current.type === "combo_select" ? (
          <ComboSelect
            value={answers[current.id] || ""}
            options={[...(current.options || []), ...(current.id === "talent" ? customTalents : customInvest)]}
            onChange={v => setAnswers({ ...answers, [current.id]: v })}
            onAddCustom={v => { if (current.id === "talent") setCustomTalents(p => [...p, v]); else setCustomInvest(p => [...p, v]); setAnswers({ ...answers, [current.id]: v }); }}
            phase={current.phase}
          />
        ) : current.type === "textarea" ? (
          <textarea value={answers[current.id] || ""} onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })} placeholder="اكتب إجابتك هنا..." rows={4}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", lineHeight: 1.8 }} />
        ) : current.type === "select" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {current.options.map(opt => (
              <button key={opt} onClick={() => setAnswers({ ...answers, [current.id]: opt })}
                style={{ padding: "8px 14px", borderRadius: 8, border: answers[current.id] === opt ? `2px solid ${PC[current.phase]}` : "1.5px solid var(--color-border-tertiary)", background: answers[current.id] === opt ? `${PC[current.phase]}18` : "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: answers[current.id] === opt ? 600 : 400 }}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input type="text" value={answers[current.id] || ""} onChange={e => setAnswers({ ...answers, [current.id]: e.target.value })} placeholder={current.placeholder || "اكتب إجابتك هنا..."}
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
        )}

        {current.phase === 1 && step >= 7 && step <= 8 && (
          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: `${BRAND.gold}10`, border: `1px dashed ${BRAND.gold}40` }}>
            <span style={{ fontSize: 11, color: BRAND.gold, fontWeight: 600 }}>معادلة فك الشفرة = الموهبة × الاستثمار</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
          style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: step === 0 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", fontSize: 14, fontFamily: "inherit", cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1 }}>السابق</button>
        <button onClick={() => { if (step < STEPS.length - 1) setStep(step + 1); else onSave(answers); }} disabled={!canNext}
          style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: canNext ? PC[current.phase] : "var(--color-border-tertiary)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: canNext ? "pointer" : "default" }}>
          {step === STEPS.length - 1 ? "حفظ ✓" : "التالى ←"}
        </button>
      </div>
    </Wrap>
  );
}

function ComboSelect({ value, options, onChange, onAddCustom, phase }) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding: "8px 14px", borderRadius: 8, border: value === opt ? `2px solid ${PC[phase]}` : "1.5px solid var(--color-border-tertiary)", background: value === opt ? `${PC[phase]}18` : "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: value === opt ? 600 : 400 }}>
            {opt}
          </button>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-tertiary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            + أخرى
          </button>
        )}
      </div>
      {adding && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="اكتب الاختيار الجديد..."
            style={{ flex: 1, borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          <button onClick={() => { if (custom.trim()) { onAddCustom(custom.trim()); setCustom(""); setAdding(false); } }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: PC[phase], color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>إضافة</button>
          <button onClick={() => { setAdding(false); setCustom(""); }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-tertiary)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>إلغاء</button>
        </div>
      )}
    </div>
  );
}

function StrengthSelector({ value, usedIdxs, onChange }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const domains = ["الكل", "التنفيذ", "التأثير", "بناء العلاقات", "التفكير الاستراتيجى"];
  const filtered = GALLUP_34.map((g, i) => ({ ...g, idx: i })).filter(g => {
    if (filter !== "الكل" && g.domain !== filter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن نقطة القوة..."
        style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {domains.map(d => (
          <button key={d} onClick={() => setFilter(d)}
            style={{ padding: "3px 10px", borderRadius: 12, border: "none", background: filter === d ? (d === "الكل" ? "#444" : DOMAIN_COLORS[d]) : "var(--color-background-primary)", color: filter === d ? "#fff" : "var(--color-text-secondary)", fontSize: 10, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
            {d}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 8, border: "1px solid var(--color-border-tertiary)" }}>
        {filtered.map(g => {
          const used = usedIdxs.includes(g.idx);
          const selected = value === g.idx;
          return (
            <div key={g.idx} onClick={() => !used && onChange(g.idx)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--color-border-tertiary)", cursor: used ? "default" : "pointer", opacity: used ? 0.35 : 1, background: selected ? `${PC[1]}12` : "transparent" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: DOMAIN_COLORS[g.domain], flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--color-text-primary)", flex: 1, fontWeight: selected ? 700 : 400 }}>{g.name}</span>
              <span style={{ fontSize: 9, color: DOMAIN_COLORS[g.domain], fontWeight: 600 }}>{g.domain}</span>
              {used && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>✓ مكتمل</span>}
              {selected && <span style={{ fontSize: 14, color: PC[1] }}>●</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailView({ entry: e, tasks, onBack, onEdit }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (field, val) => { setEditing(field); setEditVal(val || ""); };
  const saveEdit = () => { if (editing) { e[editing] = editVal; setEditing(null); } };

  const EditableRow = ({ label, field, value }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 1 }}>{label}</div>
        <button onClick={() => startEdit(field, value)} style={{ background: "none", border: "none", color: BRAND.gold, cursor: "pointer", fontSize: 10, fontFamily: "inherit", padding: 0 }}>✎</button>
      </div>
      {editing === field ? (
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <textarea value={editVal} onChange={ev => setEditVal(ev.target.value)} rows={2} style={{ flex: 1, borderRadius: 6, border: `1.5px solid ${BRAND.gold}`, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", lineHeight: 1.6 }} />
          <button onClick={saveEdit} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: BRAND.navy, color: BRAND.gold, fontSize: 10, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", alignSelf: "flex-start" }}>حفظ</button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7 }}>{value}</div>
      )}
    </div>
  );

  const entryTasks = tasks?.find(t => t.entryName === e.name);

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
        <button onClick={onEdit} style={{ background: BRAND.gold, border: "none", color: BRAND.navy, borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>تعديل</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>{e.name}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${DOMAIN_COLORS[e.domain]}18`, color: DOMAIN_COLORS[e.domain], fontWeight: 600 }}>{e.domain}</span>
          {e.rank && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontWeight: 600 }}>الترتيب #{e.rank}</span>}
        </div>
      </div>

      <Sec title="التعرف على نقطة القوة" color={PC[1]}>
        <EditableRow label="المفهوم العام" field="concept" value={e.concept} />
        <EditableRow label="التقديم للآخرين" field="present" value={e.present} />
        <EditableRow label="التعامل مع شخصية تمتلكها" field="interact" value={e.interact} />
        <div style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 8, background: `${BRAND.gold}10`, border: `1px dashed ${BRAND.gold}40` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.gold, marginBottom: 4 }}>معادلة فك الشفرة</div>
          <EditableRow label="الموهبة" field="talent" value={e.talent} />
          <EditableRow label="الاستثمار" field="investment" value={e.investment} />
        </div>
        <EditableRow label="S — أقوى جانب" field="s" value={e.s} />
        <EditableRow label="W — خطر داخلى" field="w" value={e.w} />
        <EditableRow label="O — فرصة" field="o" value={e.o} />
        <EditableRow label="T — تهديد خارجى" field="t_swot" value={e.t_swot} />
      </Sec>

      <Sec title="الفهم وتحليل المراجع #بإحسان" color={BRAND.gold}>
        <EditableRow label="اسم الله" field="allah_name" value={e.allah_name} />
        <EditableRow label="طريقة النبى ﷺ" field="prophet" value={e.prophet} />
        <EditableRow label="القدوة من السيرة" field="rolemodel" value={e.rolemodel} />
        <EditableRow label="القرآن الكريم" field="quran" value={e.quran} />
        <EditableRow label="نحذر من؟" field="warning" value={e.warning} />
      </Sec>

      <Sec title="التحديد واختيار الهدف" color={PC[3]}>
        <EditableRow label="جانب عجلة الحياة" field="wheel" value={e.wheel} />
        <EditableRow label="KPI #1 — قياس الحفاظ" field="kpi1" value={e.kpi1} />
        <EditableRow label="KPI #2 — قياس النمو" field="kpi2" value={e.kpi2} />
        <EditableRow label="الهدف SMART" field="goal" value={e.goal} />
      </Sec>

      {entryTasks && entryTasks.subtasks.length > 0 && (
        <Sec title="المهام المقسمة" color={BRAND.gold}>
          {entryTasks.subtasks.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: i < entryTasks.subtasks.length - 1 ? "1px solid var(--color-border-tertiary)" : "none" }}>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{s.day || "—"}</span>
              <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{s.text}</span>
            </div>
          ))}
        </Sec>
      )}
    </Wrap>
  );
}

function TaskBreakdownView({ entries, tasks: existingTasks, onSave, onBack }) {
  const [tasks, setTasks] = useState(existingTasks.length > 0 ? existingTasks : entries.map(e => ({ entryName: e.name, goal: e.goal, wheel: e.wheel, subtasks: [] })));
  const [activeGoal, setActiveGoal] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [useAI, setUseAI] = useState(false);

  const current = tasks[activeGoal];
  if (!current) return <Wrap><p style={{ textAlign: "center", padding: 40 }}>لا توجد أهداف</p></Wrap>;

  const addTask = (text) => {
    if (!text.trim()) return;
    const updated = [...tasks];
    updated[activeGoal] = { ...current, subtasks: [...current.subtasks, { text: text.trim(), day: "" }] };
    setTasks(updated);
    setNewTask("");
  };

  const removeTask = (idx) => {
    const updated = [...tasks];
    updated[activeGoal] = { ...current, subtasks: current.subtasks.filter((_, i) => i !== idx) };
    setTasks(updated);
  };

  const setDay = (idx, day) => {
    const updated = [...tasks];
    const subs = [...current.subtasks];
    subs[idx] = { ...subs[idx], day };
    updated[activeGoal] = { ...current, subtasks: subs };
    setTasks(updated);
  };

  const DAYS = ["الجمعة", "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const dayCount = (day) => tasks.flatMap(t => t.subtasks).filter(s => s.day === day).length;

  const suggestTasks = () => {
    const suggestions = [
      `مراجعة تقدم هدف: ${current.goal?.slice(0, 30)}`,
      `تخصيص 30 دقيقة للعمل على: ${current.entryName}`,
      `قياس KPI مرتبط بـ ${current.wheel}`,
      `تطبيق عملى لنقطة قوة ${current.entryName}`,
    ];
    const updated = [...tasks];
    updated[activeGoal] = { ...current, subtasks: [...current.subtasks, ...suggestions.map(s => ({ text: s, day: "" }))] };
    setTasks(updated);
  };

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>المرحلة الرابعة: تقسيم الأهداف</span>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
        {tasks.map((t, i) => (
          <button key={i} onClick={() => setActiveGoal(i)} style={{ padding: "6px 12px", borderRadius: 8, border: activeGoal === i ? `2px solid ${BRAND.navy}` : "1px solid var(--color-border-tertiary)", background: activeGoal === i ? `${BRAND.navy}12` : "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 11, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap", fontWeight: activeGoal === i ? 600 : 400 }}>
            {t.entryName?.split(" - ")[1] || t.entryName?.slice(0, 15)} ({t.subtasks.length})
          </button>
        ))}
      </div>

      <FBox>
        <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>{current.entryName}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10, lineHeight: 1.6 }}>{current.goal}</div>

        {current.subtasks.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "6px 8px", borderRadius: 6, background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)" }}>
            <div style={{ flex: 1, fontSize: 12, color: "var(--color-text-primary)" }}>{s.text}</div>
            <select value={s.day} onChange={e => setDay(i, e.target.value)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--color-border-tertiary)", fontFamily: "inherit", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
              <option value="">يوم؟</option>
              {DAYS.map(d => <option key={d} value={d} disabled={dayCount(d) >= 7}>{d}</option>)}
            </select>
            <button onClick={() => removeTask(i)} style={{ background: "none", border: "none", color: "#A32D2D", cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="اكتب مهمة جديدة..." onKeyDown={e => e.key === "Enter" && addTask(newTask)}
            style={{ flex: 1, borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "8px 10px", fontSize: 12, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          <button onClick={() => addTask(newTask)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: BRAND.navy, color: BRAND.gold, fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>إضافة</button>
        </div>
        <button onClick={suggestTasks} style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 8, border: `1px dashed ${BRAND.gold}`, background: "transparent", color: BRAND.gold, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>اقتراح مهام تلقائية</button>
      </FBox>

      <BtnPrimary onClick={() => onSave(tasks)} disabled={tasks.every(t => t.subtasks.length === 0)}>حفظ المهام والبدء بالمتابعة ✓</BtnPrimary>
    </Wrap>
  );
}

function DailyTrackerView({ tasks, dailyLog, onSave, onReview, onBack }) {
  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  const DAYS = ["الجمعة", "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const dayIdx = todayDate.getDay();
  const dayMap = [1, 2, 3, 4, 5, 6, 0];
  const todayName = DAYS[dayMap[dayIdx]];
  const isFriday = dayIdx === 5;
  const [viewMode, setViewMode] = useState("day");
  const [selectedDay, setSelectedDay] = useState(todayName);

  const fridayOffset = ((dayIdx + 2) % 7);
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - fridayOffset + i);
    return d;
  });
  const formatShort = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  const selectedDate = weekDates[DAYS.indexOf(selectedDay)];

  const getTasksForDay = (day) => tasks.flatMap((g, gi) => g.subtasks.filter(s => s.day === day).map((s) => ({ ...s, goalIdx: gi, goalName: g.entryName, subIdx: g.subtasks.indexOf(s) })));

  const dayTasks = getTasksForDay(selectedDay);
  const log = dailyLog[today] || {};
  const doneCount = Object.values(log).filter(Boolean).length;
  const todayTotal = getTasksForDay(todayName).length;
  const pct = todayTotal > 0 ? Math.round((doneCount / todayTotal) * 100) : 0;

  const allDates = Object.keys(dailyLog).sort();
  let streak = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const dl = dailyLog[allDates[i]];
    if (dl && Object.values(dl).some(Boolean)) streak++;
    else break;
  }

  const toggle = (key) => {
    const updated = { ...dailyLog, [today]: { ...log, [key]: !log[key] } };
    onSave(updated);
  };

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>المتابعة</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 0", marginBottom: 10, background: "var(--color-background-secondary)", borderRadius: 12, border: "1px solid var(--color-border-tertiary)" }}>
        <Stat n={pct + "%"} label="إنجاز اليوم" color={pct >= 80 ? "#0F6E56" : pct >= 50 ? BRAND.gold : PC[3]} />
        <Stat n={streak} label="أيام متتالية" color={BRAND.gold} />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button onClick={() => setViewMode("day")} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: viewMode === "day" ? BRAND.navy : "var(--color-background-secondary)", color: viewMode === "day" ? BRAND.gold : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>يومى</button>
        <button onClick={() => setViewMode("week")} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: viewMode === "week" ? BRAND.navy : "var(--color-background-secondary)", color: viewMode === "week" ? BRAND.gold : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>أسبوعى</button>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
        {DAYS.map((day, i) => {
          const wd = weekDates[i];
          const isToday = day === todayName;
          const isSel = day === selectedDay;
          const tasksCount = getTasksForDay(day).length;
          return (
            <div key={day} onClick={() => setSelectedDay(day)}
              style={{ flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: 8, cursor: "pointer",
                border: isSel ? `2px solid ${BRAND.navy}` : isToday ? `1.5px solid ${BRAND.gold}` : "1px solid var(--color-border-tertiary)",
                background: isSel ? `${BRAND.navy}12` : "var(--color-background-primary)" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: isToday ? BRAND.gold : "var(--color-text-tertiary)" }}>{day.slice(0, 5)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isSel ? BRAND.navy : "var(--color-text-primary)", margin: "2px 0" }}>{wd.getDate()}</div>
              <div style={{ fontSize: 8, color: "var(--color-text-tertiary)" }}>{wd.getMonth() + 1}/{wd.getFullYear().toString().slice(2)}</div>
              {tasksCount > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isToday ? BRAND.gold : BRAND.navy, margin: "3px auto 0" }} />}
            </div>
          );
        })}
      </div>

      {viewMode === "week" ? (
        <div style={{ marginBottom: 12 }}>
          {DAYS.map((day, di) => {
            const dt = getTasksForDay(day);
            const isToday = day === todayName;
            const wd = weekDates[di];
            if (dt.length === 0) return null;
            return (
              <div key={day} style={{ marginBottom: 6, borderRadius: 10, border: isToday ? `2px solid ${BRAND.gold}` : "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isToday ? BRAND.gold : "var(--color-text-primary)" }}>{day}</span>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{formatShort(wd)}</span>
                    {isToday && <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 8, background: BRAND.gold, color: BRAND.navy, fontWeight: 600 }}>اليوم</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{dt.length} مهام</span>
                </div>
                <div style={{ padding: "4px 12px 8px" }}>
                  {dt.map((t, i) => {
                    const key = `${t.goalIdx}-${t.subIdx}`;
                    const checked = isToday ? !!log[key] : false;
                    return (
                      <div key={i} onClick={() => { if (isToday) toggle(key); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: i > 0 ? "1px solid var(--color-border-tertiary)" : "none", cursor: isToday ? "pointer" : "default" }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: checked ? "none" : "1.5px solid var(--color-border-secondary)", background: checked ? "#0F6E56" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>{checked ? "✓" : ""}</div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: "var(--color-text-primary)", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>{t.text}</span>
                          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", marginRight: 6 }}>{t.goalName?.split(" - ")[1] || ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{selectedDay} — {selectedDate ? formatShort(selectedDate) : ""}</span>
          </div>

          {dayTasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>مفيش مهام مخصصة ليوم {selectedDay}</div>
          )}

          {dayTasks.map((t, i) => {
            const key = `${t.goalIdx}-${t.subIdx}`;
            const checked = selectedDay === todayName ? !!log[key] : false;
            const isClickable = selectedDay === todayName;
            return (
              <div key={i} onClick={() => isClickable && toggle(key)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: "var(--color-background-secondary)", border: checked ? `1.5px solid #0F6E56` : "1px solid var(--color-border-tertiary)", cursor: isClickable ? "pointer" : "default", opacity: checked ? 0.7 : 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: checked ? "none" : "2px solid var(--color-border-secondary)", background: checked ? "#0F6E56" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0, marginTop: 1 }}>{checked ? "✓" : ""}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)", textDecoration: checked ? "line-through" : "none", lineHeight: 1.6 }}>{t.text}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{t.goalName?.split(" - ")[1] || t.goalName}</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {isFriday && (
        <button onClick={onReview} style={{ width: "100%", marginTop: 14, padding: "14px 0", borderRadius: 10, border: "none", background: BRAND.gold, color: BRAND.navy, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          مراجعة الأسبوع (الجمعة)
        </button>
      )}
    </Wrap>
  );
}

function WeeklyReviewView({ entries, tasks, dailyLog, reviews, onSave, onBack }) {
  const [ratings, setRatings] = useState({});
  const [notes, setNotes] = useState("");
  const weekEnd = new Date().toISOString().slice(0, 10);

  const weekDates = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); weekDates.push(d.toISOString().slice(0, 10)); }

  let totalTasks = 0, doneTasks = 0;
  weekDates.forEach(d => {
    const log = dailyLog[d] || {};
    const keys = Object.keys(log);
    totalTasks += keys.length;
    doneTasks += keys.filter(k => log[k]).length;
  });
  const weekPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>المراجعة الأسبوعية</span>
      </div>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid var(--color-border-tertiary)", textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: weekPct >= 80 ? "#0F6E56" : weekPct >= 50 ? BRAND.gold : PC[3] }}>{weekPct}%</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>نسبة الالتزام بالمهام هذا الأسبوع</div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>{doneTasks} من {totalTasks} مهمة مكتملة</div>
      </div>

      <FBox>
        <FLabel>تقييم الأداء لكل هدف (1-5)</FLabel>
        {entries.slice(0, 10).map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 12, color: "var(--color-text-primary)" }}>{e.name?.split(" - ")[1] || e.name}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRatings({ ...ratings, [i]: n })}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: ratings[i] === n ? BRAND.navy : "var(--color-background-primary)", color: ratings[i] === n ? BRAND.gold : "var(--color-text-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </FBox>

      <FBox>
        <FLabel>ملاحظات وخطة الأسبوع القادم</FLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="إيه اللى اتعلمته الأسبوع ده؟ وإيه خطتك للأسبوع الجاى؟"
          style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", lineHeight: 1.8 }} />
      </FBox>

      <BtnPrimary onClick={() => onSave({ weekEnd, weekPct, doneTasks, totalTasks, ratings, notes, createdAt: new Date().toISOString() })}>
        حفظ المراجعة ✓
      </BtnPrimary>
    </Wrap>
  );
}

function AdminDashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ alumni: null, rabita: null, batch: "", group: "", scope: null });

  useEffect(() => {
    async function load() {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const all = [];
        for (const userDoc of usersSnap.docs) {
          const uid = userDoc.id;
          const [profileSnap, entriesSnap] = await Promise.all([
            getDoc(doc(db, "users", uid, "meta", "profile")),
            getDoc(doc(db, "users", uid, "data", "entries"))
          ]);
          if (profileSnap.exists()) {
            all.push({
              profile: profileSnap.data(),
              entries: entriesSnap.exists() ? entriesSnap.data().value : []
            });
          }
        }
        setUsers(all);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = users.filter(u => {
    const p = u.profile || {};
    if (filters.alumni === true && !p.isAlumni) return false;
    if (filters.alumni === false && p.isAlumni) return false;
    if (filters.rabita === true && !p.inRabita) return false;
    if (filters.batch && p.batchNum !== filters.batch) return false;
    if (filters.group && p.groupNum !== filters.group) return false;
    if (filters.scope && p.scope !== filters.scope) return false;
    return true;
  });

  const exportExcel = () => {
    const rows = [["الاسم", "الإيميل", "الهاتف", "خريج", "رابطة", "الدفعة", "الجروب", "النطاق", "نقاط مكتملة"].join("\t")];
    filtered.forEach(u => {
      const p = u.profile || {};
      rows.push([p.name, p.email, (p.countryCode||"") + (p.phone||""), p.isAlumni ? "نعم" : "لا", p.inRabita ? "نعم" : "لا", p.batchNum, p.groupNum, p.scope, (u.entries || []).length].join("\t"));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "admin_users.xls"; a.click();
  };

  if (selected !== null && filtered[selected]) {
    const u = filtered[selected];
    const p = u.profile || {};
    const e = u.entries || [];
    return (
      <Wrap>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع للقائمة</button>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{selected + 1}/{filtered.length}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button disabled={selected <= 0} onClick={() => setSelected(selected - 1)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12, fontFamily: "inherit", cursor: selected <= 0 ? "default" : "pointer", opacity: selected <= 0 ? 0.4 : 1 }}>السابق</button>
          <button disabled={selected >= filtered.length - 1} onClick={() => setSelected(selected + 1)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 12, fontFamily: "inherit", cursor: selected >= filtered.length - 1 ? "default" : "pointer", opacity: selected >= filtered.length - 1 ? 0.4 : 1 }}>التالى</button>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: `1px solid ${BRAND.gold}30` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>{p.name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.isAlumni && <ProfileTag label="خريج" color="#0F6E56" />}
            {p.inRabita && <ProfileTag label="رابطة" color="#534AB7" />}
            {p.batchNum && <ProfileTag label={`دفعة ${p.batchNum}`} color="#2E75B6" />}
            {p.groupNum && <ProfileTag label={p.groupNum} color="#2E75B6" />}
            <ProfileTag label={`${e.length}/${p.scope || 34} نقطة`} color={PC[3]} />
          </div>
        </div>
        {e.map((entry, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <Sec title={`${entry.name} — #${entry.rank || "—"}`} color={DOMAIN_COLORS[entry.domain] || PC[1]}>
              <Row label="الهدف" value={entry.goal} />
              <Row label="عجلة الحياة" value={entry.wheel} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <MC label="KPI الحفاظ" value={entry.kpi1} /><MC label="KPI النمو" value={entry.kpi2} />
              </div>
            </Sec>
          </div>
        ))}
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>→ رجوع</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>لوحة تحكم الأدمن</span>
      </div>

      {loading ? <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>جارى تحميل بيانات المستخدمين...</p> : (
        <>
          <FBox>
            <FLabel>الفلاتر</FLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button onClick={() => setFilters({ ...filters, alumni: filters.alumni === true ? null : true })} style={{ padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 10, fontFamily: "inherit", cursor: "pointer", background: filters.alumni === true ? BRAND.navy : "var(--color-background-primary)", color: filters.alumni === true ? BRAND.gold : "var(--color-text-secondary)" }}>خريج</button>
              <button onClick={() => setFilters({ ...filters, rabita: filters.rabita === true ? null : true })} style={{ padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 10, fontFamily: "inherit", cursor: "pointer", background: filters.rabita === true ? BRAND.navy : "var(--color-background-primary)", color: filters.rabita === true ? BRAND.gold : "var(--color-text-secondary)" }}>رابطة</button>
              <button onClick={() => setFilters({ ...filters, scope: filters.scope === 5 ? null : 5 })} style={{ padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 10, fontFamily: "inherit", cursor: "pointer", background: filters.scope === 5 ? BRAND.navy : "var(--color-background-primary)", color: filters.scope === 5 ? BRAND.gold : "var(--color-text-secondary)" }}>Top 5</button>
              <button onClick={() => setFilters({ ...filters, scope: filters.scope === 34 ? null : 34 })} style={{ padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 10, fontFamily: "inherit", cursor: "pointer", background: filters.scope === 34 ? BRAND.navy : "var(--color-background-primary)", color: filters.scope === 34 ? BRAND.gold : "var(--color-text-secondary)" }}>34 كاملة</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={filters.batch} onChange={e => setFilters({ ...filters, batch: e.target.value })} placeholder="رقم الدفعة" style={{ flex: 1, borderRadius: 6, border: "1px solid var(--color-border-tertiary)", padding: "6px 8px", fontSize: 11, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
              <input value={filters.group} onChange={e => setFilters({ ...filters, group: e.target.value })} placeholder="رقم الجروب" style={{ flex: 1, borderRadius: 6, border: "1px solid var(--color-border-tertiary)", padding: "6px 8px", fontSize: 11, fontFamily: "inherit", direction: "rtl", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            </div>
          </FBox>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{filtered.length} مستخدم</span>
            <button onClick={exportExcel} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: BRAND.navy, color: BRAND.gold, fontSize: 10, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>تصدير Excel</button>
          </div>

          {filtered.map((u, i) => {
            const p = u.profile || {};
            return (
              <div key={i} onClick={() => setSelected(i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", cursor: "pointer" }}>
                <span style={{ background: BRAND.navy, color: BRAND.gold, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{(u.entries || []).length}/{p.scope || 34} نقطة — {p.batchNum ? `دفعة ${p.batchNum}` : "غير خريج"}</div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>لا يوجد مستخدمين مطابقين للفلاتر</div>}
        </>
      )}
    </Wrap>
  );
}

function exportData(profile, entries) {
  const lines = [`خذها بقوة — ${profile.name}\nTop ${profile.topN}\nالتاريخ: ${new Date().toLocaleDateString("ar-EG")}\n${"=".repeat(50)}\n`];
  entries.forEach((e, i) => {
    lines.push(`\n${"=".repeat(50)}\n${i + 1}. ${e.name} | ${e.domain} | الترتيب #${e.rank}\n${"=".repeat(50)}\n`);
    lines.push(`--- تحليل نقطة القوة ---\nالمفهوم: ${e.concept}\nالتقديم للآخرين: ${e.present}\nالتعامل مع شخصية تمتلكها: ${e.interact}\n\nمعادلة فك الشفرة:\nالموهبة: ${e.talent} × الاستثمار: ${e.investment}\n\nSWOT:\nS: ${e.s}\nW: ${e.w}\nO: ${e.o}\nT: ${e.t_swot}\n`);
    lines.push(`\n--- الفهم الإحسانى ---\nاسم الله: ${e.allah_name}\nالنبى ﷺ: ${e.prophet}\nالقدوة: ${e.rolemodel}\nالقرآن: ${e.quran}\nنحذر من: ${e.warning}\n`);
    lines.push(`\n--- الهدف ---\nجانب عجلة الحياة: ${e.wheel}\nKPI الحفاظ: ${e.kpi1}\nKPI النمو: ${e.kpi2}\nالهدف SMART: ${e.goal}\n`);
  });
  const blob = new Blob([lines.join("")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `خذها_بقوة_${profile.name}_${entries.length}_نقطة.txt`;
  a.click();
}

function Wrap({ children }) {
  return (
    <div style={{ fontFamily: "'Tajawal','Noto Sans Arabic','Segoe UI',sans-serif", direction: "rtl", maxWidth: 540, margin: "0 auto", padding: "6px 16px" }}>{children}</div>
  );
}
function Logo({ size = "md" }) {
  const s = size === "lg" ? { font: 36, eng: 12, bar: 80, barH: 3, diamond: 5 } : { font: 22, eng: 9, bar: 60, barH: 2, diamond: 4 };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: s.bar, height: s.barH, borderRadius: s.barH, background: BRAND.gold, margin: "0 auto 6px" }} />
      <div style={{ fontSize: s.font, fontWeight: 800, color: BRAND.navy, letterSpacing: -0.5, lineHeight: 1.2 }}>خُذها بقوة</div>
      <div style={{ fontSize: s.eng, fontWeight: 700, color: BRAND.navy, letterSpacing: 4, fontFamily: "Calibri,'Gill Sans',sans-serif", marginTop: 2 }}>TAKE IT FIRMLY</div>
      <div style={{ width: s.diamond, height: s.diamond, background: BRAND.gold, transform: "rotate(45deg)", margin: "6px auto 0" }} />
    </div>
  );
}
function ProfileTag({ label, color }) {
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${color}15`, color, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
}
function Stat({ n, label, color }) {
  return <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color }}>{n}</div><div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{label}</div></div>;
}
function Sec({ title, color, children }) {
  return <div style={{ marginBottom: 12 }}><div style={{ padding: "5px 12px", borderRadius: "8px 8px 0 0", background: color, color: "#fff", fontSize: 12, fontWeight: 600 }}>{title}</div><div style={{ padding: "12px 12px 8px", borderRadius: "0 0 8px 8px", border: `1px solid ${color}33`, borderTop: "none", background: "var(--color-background-secondary)" }}>{children}</div></div>;
}
function Row({ label, value }) {
  return <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 1 }}>{label}</div><div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7 }}>{value}</div></div>;
}
function Tag({ label, value, bg, color }) {
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 16, background: bg, fontSize: 12, fontWeight: 500, color }}>{label}: {value}</span>;
}
function SBox({ l, v, bg, c }) {
  return <div style={{ padding: "6px 8px", borderRadius: 6, background: bg }}><span style={{ fontWeight: 700, fontSize: 13, color: c, marginLeft: 4 }}>{l}</span><span style={{ fontSize: 11, color: c, lineHeight: 1.5 }}>{v}</span></div>;
}
function MC({ label, value }) {
  return <div style={{ padding: "6px 8px", borderRadius: 6, background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)" }}><div style={{ fontSize: 10, fontWeight: 600, color: BRAND.gold, marginBottom: 1 }}>{label}</div><div style={{ fontSize: 11, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{value}</div></div>;
}
