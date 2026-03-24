import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, 
  addDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  Heart, Star, Camera, ChevronRight, Clock, Calendar, 
  Plus, X, Trash2, Timer, Settings, Upload, Lock, Unlock, Sparkles, CheckCircle2, Trophy
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE REAL (PCP ITAMONTE) ---
const firebaseConfig = {
  apiKey: "AIzaSyCP0KtP6sL0M69wq3FpC5Tmq_IL9AtbnsY",
  authDomain: "pcp-juncao-itamonte.firebaseapp.com",
  projectId: "pcp-juncao-itamonte",
  storageBucket: "pcp-juncao-itamonte.firebasestorage.app",
  messagingSenderId: "827442336306",
  appId: "1:827442336306:web:653270dc35677b6273e22b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appIdFixed = 'nosso-universo-romantico';

// --- Configurações Fixas ---
const START_DATE_STR = "2025-10-23T00:00:00"; 
const APP_PASSWORD = "23102025";
const INITIAL_REASONS = [
  "Pela mulher que você é!",
  "O teu sorriso, ilumina meu dia!",
  "Receber uma foto sua, alegra meu dia.",
  "Seus olhos me deixam cada dias mais apaixonado."
];

// --- Utilitários de Imagem ---
const compressImage = (base64, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();
      const newHeart = { 
        id, left: Math.random() * 100 + '%', size: Math.random() * (25 - 10) + 10 + 'px', 
        duration: Math.random() * (12 - 6) + 6 + 's', opacity: Math.random() * (0.5 - 0.2) + 0.2
      };
      setHearts((prev) => [...prev, newHeart]);
      setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 12000);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {hearts.map((heart) => (
        <div key={heart.id} className="absolute bottom-[-50px] text-rose-400"
          style={{ left: heart.left, fontSize: heart.size, opacity: heart.opacity, animation: `floatUp ${heart.duration} linear forwards` }}>❤️</div>
      ))}
      <style>{`@keyframes floatUp { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 0.5; } 90% { opacity: 0.5; } 100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [page, setPage] = useState('home');
  const [isSaving, setIsSaving] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [reasons, setReasons] = useState(INITIAL_REASONS);
  const [moments, setMoments] = useState([]);
  const [futures, setFutures] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [timeData, setTimeData] = useState({ months: 0, days: 0, totalDays: 0, hours: 0, minutes: 0, seconds: 0, progress: 0 });

  const [activeReason, setActiveReason] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingReason, setIsAddingReason] = useState(false);
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const [isAddingFuture, setIsAddingFuture] = useState(false);
  const [momentForm, setMomentForm] = useState({ title: "", desc: "", image: null });
  const [futureForm, setFutureForm] = useState({ title: "", date: "" });
  const [newReasonText, setNewReasonText] = useState("");

  const profileFileRef = useRef(null);
  const momentFileRef = useRef(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'settings', 'romance_profile'), (d) => d.exists() && setProfileImage(d.data().image));
    const unsubReasons = onSnapshot(doc(db, 'settings', 'romance_reasons'), (d) => d.exists() && setReasons(d.data().list || INITIAL_REASONS));
    const unsubMoments = onSnapshot(collection(db, 'romance_moments'), (s) => setMoments(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))));
    const unsubFuture = onSnapshot(collection(db, 'romance_future'), (s) => setFutures(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.date) - new Date(b.date))));
    const unsubAchievements = onSnapshot(collection(db, 'romance_achievements'), (s) => setAchievements(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0))));
    return () => { unsubProfile(); unsubReasons(); unsubMoments(); unsubFuture(); unsubAchievements(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(START_DATE_STR);
      const now = new Date();
      let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (now.getDate() < start.getDate()) months--;
      let lastAnn = new Date(start); lastAnn.setMonth(lastAnn.getMonth() + months);
      let nextAnn = new Date(start); nextAnn.setMonth(nextAnn.getMonth() + months + 1);
      const diffMs = now - lastAnn;
      setTimeData({
        months: Math.max(0, months), days: Math.floor(diffMs / 86400000),
        totalDays: Math.floor((now - start) / 86400000),
        hours: Math.floor((diffMs / 3600000) % 24), minutes: Math.floor((diffMs / 60000) % 60),
        seconds: Math.floor((diffMs / 1000) % 60),
        progress: Math.min(100, (diffMs / (nextAnn - lastAnn)) * 100)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) setIsUnlocked(true);
    else { setAuthError(true); setPasswordInput(""); setTimeout(() => setAuthError(false), 2000); }
  };

  const uploadPhoto = (e, target) => {
    const file = e.target.files[0]; if (!file || !user) return;
    setIsSaving(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result);
      if (target === 'profile') {
        await setDoc(doc(db, 'settings', 'romance_profile'), { image: compressed });
        setIsEditingProfile(false);
      } else setMomentForm({ ...momentForm, image: compressed });
      setIsSaving(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isUnlocked) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <FloatingHearts />
      <div className="relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="mb-8 bg-white p-8 rounded-full shadow-2xl border border-rose-50 inline-block text-rose-500"><Lock size={40} /></div>
        <h1 className="text-4xl font-black text-rose-600 mb-2">Nosso Universo</h1>
        <form onSubmit={handleLogin} className="mt-10 space-y-4">
          <input type="password" placeholder="Senha" className={`w-full bg-rose-50/20 px-6 py-5 rounded-3xl text-center font-bold tracking-[0.4em] outline-none border transition-all ${authError ? 'border-rose-400 animate-shake' : 'border-white focus:border-rose-200'}`} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
          <button type="submit" className="w-full bg-rose-500 text-white font-black py-5 rounded-3xl shadow-xl uppercase text-xs">Entrar</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32 pt-10 overflow-x-hidden">
      <FloatingHearts />
      <input type="file" accept="image/*" ref={profileFileRef} className="hidden" onChange={(e) => uploadPhoto(e, 'profile')} />
      <input type="file" accept="image/*" ref={momentFileRef} className="hidden" onChange={(e) => uploadPhoto(e, 'moment')} />

      <header className="fixed top-0 inset-x-0 h-16 bg-white/40 backdrop-blur-xl z-40 border-b border-white/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white"><Heart size={16} fill="currentColor" /></div><span className="font-black text-[10px] uppercase tracking-widest">Privado</span></div>
        <button onClick={() => setIsEditingProfile(true)} className="p-2 bg-white/80 rounded-xl shadow-sm text-slate-400 hover:text-rose-500"><Settings size={18} /></button>
      </header>

      {isSaving && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase animate-bounce shadow-xl"><Sparkles size={14} className="inline mr-2" /> Sincronizando...</div>}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[3rem] shadow-2xl border border-white w-full max-w-xs text-center">
            <div className="flex justify-between items-center mb-8"><span className="text-slate-800 font-black text-xs uppercase">Ajustes</span><X className="cursor-pointer" onClick={() => setIsEditingProfile(false)} /></div>
            <button onClick={() => profileFileRef.current.click()} className="w-full bg-white text-rose-500 py-5 rounded-2xl text-[10px] font-black uppercase border border-rose-100 shadow-sm">Alterar Foto Principal</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/60 backdrop-blur-2xl px-3 py-3 rounded-[2.5rem] shadow-2xl flex items-center gap-1.5 z-50">
        {[ { id: 'home', icon: Heart }, { id: 'reasons', icon: Star }, { id: 'moments', icon: Camera }, { id: 'future', icon: Timer }, { id: 'achievements', icon: Trophy } ].map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)} className={`p-4 rounded-full transition-all ${page === item.id ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-rose-400'}`}>
            <item.icon size={22} fill={page === item.id ? "currentColor" : "none"} />
          </button>
        ))}
      </nav>

      <main className="max-w-lg mx-auto px-6 flex flex-col items-center">
        {page === 'home' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 bg-rose-200 blur-[40px] opacity-30 animate-pulse"></div>
              <div className="relative p-1.5 bg-white rounded-full shadow-2xl w-32 h-32 overflow-hidden flex items-center justify-center">
                {profileImage ? <img src={profileImage} className="w-full h-full object-cover rounded-full" /> : <Heart size={50} className="text-rose-400" fill="currentColor" />}
              </div>
            </div>
            <h1 className="text-5xl font-black text-rose-600 mb-2">Nosso tempo</h1>
            <div className="bg-rose-50 px-5 py-2 rounded-full mb-10 inline-flex items-center gap-2 text-rose-500 font-black text-[11px] uppercase tracking-widest"><Calendar size={14} /> {timeData.totalDays} DIAS</div>
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-rose-50 w-full mb-6">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="px-4"><span className="block text-7xl font-black text-rose-500">{timeData.months}</span><span className="text-xs font-black text-slate-300 uppercase">MESES</span></div>
                <div className="px-4"><span className="block text-7xl font-black text-slate-700">{timeData.days}</span><span className="text-xs font-black text-slate-300 uppercase">DIAS</span></div>
              </div>
              <div className="mt-12 w-full h-2 bg-rose-50 rounded-full overflow-hidden"><div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${timeData.progress}%` }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full">
              {[ {l:'Horas', v:timeData.hours}, {l:'Mins', v:timeData.minutes}, {l:'Segs', v:timeData.seconds} ].map(u => (
                <div key={u.l} className="bg-white py-6 rounded-[2rem] shadow-lg border border-rose-50"><span className="block text-4xl font-black text-rose-500 tabular-nums">{String(u.v).padStart(2, '0')}</span><span className="text-[10px] font-bold text-slate-300 uppercase">{u.l}</span></div>
              ))}
            </div>
          </div>
        )}

        {page === 'reasons' && (
          <div className="w-full animate-in slide-in-from-right duration-700 space-y-8">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800">Motivos</h2><button onClick={() => setIsAddingReason(!isAddingReason)} className="w-12 h-12 bg-white rounded-2xl text-rose-500 flex items-center justify-center shadow-sm"><Plus /></button></div>
            {isAddingReason && (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white animate-in zoom-in">
                <textarea className="w-full p-4 rounded-2xl text-sm bg-slate-50 h-32 resize-none outline-none focus:ring-2 ring-rose-100" placeholder="Escreva aqui..." value={newReasonText} onChange={e => setNewReasonText(e.target.value)} />
                <button onClick={async () => { if(!newReasonText.trim()) return; const newList = [...reasons, newReasonText]; await setDoc(doc(db, 'settings', 'romance_reasons'), { list: newList }); setNewReasonText(""); setIsAddingReason(false); setActiveReason(newList.length-1); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl mt-4">Salvar</button>
              </div>
            )}
            <div className="bg-white/60 backdrop-blur-md p-12 rounded-[3.5rem] shadow-2xl border border-white min-h-[300px] flex flex-col items-center justify-center text-center">
              <Sparkles className="text-rose-200 mb-6" size={32} />
              <p className="text-xl font-bold text-slate-700 italic">"{reasons[activeReason] || "..."}"</p>
            </div>
            <button onClick={() => setActiveReason((activeReason + 1) % reasons.length)} className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">Próximo <ChevronRight size={18} /></button>
          </div>
        )}

        {page === 'moments' && (
          <div className="w-full animate-in slide-in-from-left duration-700 space-y-8 pb-10">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800">Memórias</h2><button onClick={() => setIsAddingMoment(!isAddingMoment)} className="w-12 h-12 bg-white rounded-2xl text-rose-50 flex items-center justify-center shadow-sm"><Plus className="text-rose-500" /></button></div>
            {isAddingMoment && (
              <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-white space-y-4 animate-in zoom-in">
                <div onClick={() => momentFileRef.current.click()} className="aspect-video bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
                  {momentForm.image ? <img src={momentForm.image} className="w-full h-full object-cover" /> : <><Camera size={40} className="text-slate-300" /><span className="text-[10px] font-black text-slate-400 uppercase mt-2">Escolher Foto</span></>}
                </div>
                <input placeholder="Título" className="w-full p-4 rounded-2xl text-sm bg-slate-50 outline-none font-bold" value={momentForm.title} onChange={e => setMomentForm({...momentForm, title: e.target.value})} />
                <textarea placeholder="História..." className="w-full p-4 rounded-2xl text-sm bg-slate-50 h-24 resize-none outline-none" value={momentForm.desc} onChange={e => setMomentForm({...momentForm, desc: e.target.value})} />
                <button onClick={async () => { if(!momentForm.title.trim()) return; setIsSaving(true); await addDoc(collection(db, 'romance_moments'), { ...momentForm, createdAt: Date.now(), date: new Date().toLocaleDateString('pt-BR') }); setMomentForm({title:"", desc:"", image:null}); setIsAddingMoment(false); setIsSaving(false); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest">Guardar</button>
              </div>
            )}
            <div className="space-y-6">
              {moments.map(m => (
                <div key={m.id} className="bg-white/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden shadow-xl border border-white group relative">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                    {m.image ? <img src={m.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Camera size={48} /></div>}
                    <button onClick={() => deleteDoc(doc(db, 'romance_moments', m.id))} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                  <div className="p-6 text-left">
                    <div className="flex justify-between items-start mb-2"><h3 className="font-black text-slate-800 uppercase text-xs">{m.title}</h3><span className="text-[9px] font-black text-rose-300 bg-rose-50 px-2 py-1 rounded-lg">{m.date}</span></div>
                    <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'future' && (
          <div className="w-full animate-in slide-in-from-bottom duration-700 space-y-8">
            <div className="flex justify-between items-center px-2"><h2 className="text-3xl font-black text-slate-800">Sonhos</h2><button onClick={() => setIsAddingFuture(!isAddingFuture)} className="w-12 h-12 bg-white rounded-2xl text-rose-500 flex items-center justify-center shadow-sm"><Plus /></button></div>
            {isAddingFuture && (
              <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-white space-y-4">
                <input placeholder="Qual o plano?" className="w-full p-4 rounded-2xl text-sm bg-slate-50 outline-none font-bold" value={futureForm.title} onChange={e => setFutureForm({...futureForm, title: e.target.value})} />
                <input type="datetime-local" className="w-full p-4 rounded-2xl text-sm bg-slate-50 outline-none font-bold" value={futureForm.date} onChange={e => setFutureForm({...futureForm, date: e.target.value})} />
                <button onClick={async () => { if(!futureForm.title.trim() || !futureForm.date) return; setIsSaving(true); await addDoc(collection(db, 'romance_future'), { ...futureForm }); setFutureForm({title:"", date:""}); setIsAddingFuture(false); setIsSaving(false); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest">Agendar</button>
              </div>
            )}
            <div className="space-y-4 w-full">
              {futures.map(f => {
                const d = Math.max(0, Math.floor((new Date(f.date) - new Date()) / 86400000));
                return (
                  <div key={f.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-white flex justify-between items-center w-full group">
                    <div className="text-left"><h3 className="font-black text-slate-800 uppercase text-xs">{f.title}</h3><p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Plano futuro</p></div>
                    <div className="flex gap-4 items-center">
                      <div className="text-center"><span className="block text-2xl font-black text-slate-800">{d}</span><span className="text-[8px] font-bold text-slate-400 uppercase">Dias</span></div>
                      <div className="flex gap-2">
                        <button onClick={async () => { await addDoc(collection(db, 'romance_achievements'), { title: f.title, completedAt: Date.now(), completionDate: new Date().toLocaleDateString('pt-BR') }); await deleteDoc(doc(db, 'romance_future', f.id)); }} className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle2 size={18} /></button>
                        <button onClick={() => deleteDoc(doc(db, 'romance_future', f.id))} className="p-3 bg-slate-50 text-slate-300 rounded-2xl hover:text-rose-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page === 'achievements' && (
          <div className="w-full animate-in slide-in-from-bottom duration-700 space-y-8">
            <div className="text-left px-2"><h2 className="text-3xl font-black text-slate-800">Conquistas</h2><p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">O que já construímos</p></div>
            <div className="grid grid-cols-1 gap-4 w-full pb-10">
              {achievements.length === 0 ? <p className="py-20 text-slate-300 italic text-center">Nenhum sonho realizado ainda...</p> : achievements.map(a => (
                <div key={a.id} className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500"><Trophy size={22} /></div>
                    <div className="text-left"><h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">{a.title}</h3><p className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Realizada em {a.completionDate}</p></div>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'romance_achievements', a.id))} className="p-2.5 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #fda4af; border-radius: 10px; } @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } } .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }`}</style>
    </div>
  );
}
