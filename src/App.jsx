import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot, collection, 
  addDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  Heart, Star, Camera, ChevronRight, Clock, Calendar, 
  Plus, X, Trash2, Timer, Settings, Upload, Lock, Unlock 
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE (PROJETO PCP ITAMONTE - ATIVO) ---
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

// --- Configurações Fixas ---
const START_DATE = "2025-10-23T22:13:00"; 
const APP_PASSWORD = "23102025"; 

const INITIAL_REASONS = [
  "Pela mulher incrível que você é!",
  "O teu sorriso ilumina meu dia!",
  "Receber uma foto sua alegra meu dia.",
  "Seus olhos me deixam cada dia mais apaixonado."
];

// --- Componentes Visuais ---
const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();
      const newHeart = { id, left: Math.random() * 100 + '%', size: Math.random() * (30 - 10) + 10 + 'px', duration: Math.random() * (10 - 5) + 5 + 's' };
      setHearts((prev) => [...prev, newHeart]);
      setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 10000);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {hearts.map((heart) => (
        <div key={heart.id} className="absolute bottom-[-50px] text-rose-400 opacity-40 animate-bounce"
          style={{ left: heart.left, fontSize: heart.size, animation: `floatUp ${heart.duration} linear forwards` }}>
          ❤️
        </div>
      ))}
      <style>{`@keyframes floatUp { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [page, setPage] = useState('home');

  // Estados Sincronizados
  const [profileImage, setProfileImage] = useState(null);
  const [reasons, setReasons] = useState(INITIAL_REASONS);
  const [moments, setMoments] = useState([]);
  const [futures, setFutures] = useState([]);
  const [timeData, setTimeData] = useState({ months: 0, days: 0, totalDays: 0, hours: 0, minutes: 0, seconds: 0, progress: 0 });

  // Estados de UI
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
    const unsubReasons = onSnapshot(doc(db, 'settings', 'romance_reasons'), (d) => d.exists() && setReasons(d.data().list));
    const unsubMoments = onSnapshot(collection(db, 'romance_moments'), (s) => setMoments(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.createdAt - a.createdAt)));
    const unsubFuture = onSnapshot(collection(db, 'romance_future'), (s) => setFutures(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(a.targetDate) - new Date(b.targetDate))));
    return () => { unsubProfile(); unsubReasons(); unsubMoments(); unsubFuture(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(START_DATE);
      const now = new Date();
      let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      let thisAnn = new Date(start); thisAnn.setMonth(thisAnn.getMonth() + months);
      if (thisAnn > now) { months--; thisAnn = new Date(start); thisAnn.setMonth(thisAnn.getMonth() + months); }
      const nextAnn = new Date(start); nextAnn.setMonth(nextAnn.getMonth() + months + 1);
      const diffMs = now - thisAnn;
      setTimeData({
        months, days: Math.floor(diffMs / 86400000),
        totalDays: Math.floor((now - start) / 86400000),
        hours: Math.floor((diffMs / 3600000) % 24),
        minutes: Math.floor((diffMs / 60000) % 60),
        seconds: Math.floor((diffMs / 1000) % 60),
        progress: Math.min(100, (diffMs / (nextAnn - thisAnn)) * 100)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) setIsUnlocked(true);
    else { setAuthError(true); setPasswordInput(""); setTimeout(() => setAuthError(false), 2000); }
  };

  const uploadPhoto = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (target === 'profile') {
        await setDoc(doc(db, 'settings', 'romance_profile'), { image: reader.result });
        setIsEditingProfile(false);
      } else setMomentForm({ ...momentForm, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  if (!isUnlocked) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <FloatingHearts />
      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="mb-8 bg-white p-6 rounded-full shadow-xl border border-rose-50 inline-block animate-bounce text-rose-500"><Lock size={48} /></div>
        <h1 className="text-3xl font-black text-rose-600 mb-2">Nosso Universo</h1>
        <p className="text-slate-400 text-sm mb-8 font-medium italic">Insira a nossa data especial</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" placeholder="Senha" className={`w-full bg-rose-50/30 px-6 py-4 rounded-3xl text-center font-bold tracking-widest outline-none border transition-all ${authError ? 'border-rose-500' : 'border-rose-100'}`} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
          <button type="submit" className="w-full bg-rose-500 text-white font-black py-4 rounded-3xl shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all">Entrar</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans overflow-x-hidden">
      <FloatingHearts />
      <input type="file" accept="image/*" ref={profileFileRef} className="hidden" onChange={(e) => uploadPhoto(e, 'profile')} />
      <input type="file" accept="image/*" ref={momentFileRef} className="hidden" onChange={(e) => uploadPhoto(e, 'moment')} />

      <button onClick={() => setIsEditingProfile(true)} className="fixed top-6 right-6 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg text-rose-300 border border-rose-50 hover:text-rose-500 active:scale-90 transition-all"><Settings size={20} /></button>

      {isEditingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-rose-50 w-full max-w-xs">
            <div className="flex justify-between items-center mb-4"><span className="text-rose-500 font-black text-xs uppercase tracking-widest">Ajustes</span><X className="cursor-pointer text-slate-300 hover:text-rose-500" onClick={() => setIsEditingProfile(false)} /></div>
            <button onClick={() => profileFileRef.current.click()} className="w-full bg-rose-50 text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase border border-rose-100">Escolher Foto Principal</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-5 py-3 rounded-full shadow-2xl border border-rose-50 flex items-center gap-8 z-50">
        <button onClick={() => setPage('home')} className={`transition-all ${page === 'home' ? 'text-rose-500 scale-125' : 'text-slate-400'}`}><Heart size={22} fill={page === 'home' ? "currentColor" : "none"} /></button>
        <button onClick={() => setPage('reasons')} className={`transition-all ${page === 'reasons' ? 'text-rose-500 scale-125' : 'text-slate-400'}`}><Star size={22} fill={page === 'reasons' ? "currentColor" : "none"} /></button>
        <button onClick={() => setPage('moments')} className={`transition-all ${page === 'moments' ? 'text-rose-500 scale-125' : 'text-slate-400'}`}><Camera size={22} fill={page === 'moments' ? "currentColor" : "none"} /></button>
        <button onClick={() => setPage('future')} className={`transition-all ${page === 'future' ? 'text-rose-500 scale-125' : 'text-slate-400'}`}><Timer size={22} fill={page === 'future' ? "currentColor" : "none"} /></button>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-24 min-h-screen flex flex-col items-center justify-center text-center">
        {page === 'home' && (
          <div className="w-full animate-in fade-in zoom-in duration-700">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-rose-400 blur-3xl opacity-10 animate-pulse rounded-full"></div>
              <div className="relative bg-white p-3 rounded-full shadow-sm border border-rose-50 w-32 h-32 flex items-center justify-center overflow-hidden">
                {profileImage ? <img src={profileImage} className="w-full h-full object-cover rounded-full" /> : <Heart size={64} className="text-rose-500" fill="currentColor" />}
              </div>
            </div>
            <h1 className="text-4xl font-black text-rose-600 mb-2">Nosso tempo juntos</h1>
            <div className="inline-block px-4 py-1.5 bg-rose-50 rounded-full text-rose-500 text-xs font-bold uppercase mb-8 shadow-sm">
               <Calendar size={14} className="inline mr-1" /> <span>{String(timeData.totalDays)} dias de amor</span>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-rose-100 mb-6">
              <div className="grid grid-cols-2 gap-4 divide-x divide-rose-50">
                <div><span className="block text-5xl font-black text-rose-500">{String(timeData.months)}</span><span className="text-xs font-bold text-rose-300 uppercase">meses</span></div>
                <div><span className="block text-5xl font-black text-slate-700">{String(timeData.days)}</span><span className="text-xs font-bold text-slate-400 uppercase">dias</span></div>
              </div>
              <div className="mt-8 w-full h-2 bg-rose-50 rounded-full overflow-hidden border border-rose-50">
                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${timeData.progress}%` }} />
              </div>
            </div>
            {/* SEÇÃO DAS HORAS - AGORA APARECENDO */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-md">
                  <span className="block text-2xl font-black text-rose-500">{String(timeData.hours)}</span>
                  <span className="text-[10px] font-bold text-slate-400">Horas</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-md">
                  <span className="block text-2xl font-black text-rose-500">{String(timeData.minutes)}</span>
                  <span className="text-[10px] font-bold text-slate-400">Mins</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-md">
                  <span className="block text-2xl font-black text-rose-500">{String(timeData.seconds)}</span>
                  <span className="text-[10px] font-bold text-slate-400">Segs</span>
                </div>
            </div>
            <div className="opacity-60 text-rose-400 text-[10px] font-bold uppercase flex items-center justify-center gap-2">
               <Clock size={12} /> <span>Desde 23 Out 2025 • 22:13</span>
            </div>
          </div>
        )}

        {page === 'reasons' && (
          <div className="w-full animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-rose-600">Porque te amo?</h2><button onClick={() => setIsAddingReason(!isAddingReason)} className="p-2 bg-rose-500 text-white rounded-full shadow-lg"><Plus size={18} /></button></div>
            {isAddingReason && (
              <div className="mb-6 bg-rose-50 p-4 rounded-3xl border border-rose-100 text-left">
                <textarea className="w-full p-3 rounded-xl text-sm outline-none mb-3 h-24" placeholder="Novo motivo..." value={newReasonText} onChange={e => setNewReasonText(e.target.value)} />
                <button onClick={async () => {
                   if(!newReasonText.trim()) return;
                   const newList = [...reasons, newReasonText];
                   await setDoc(doc(db, 'settings', 'romance_reasons'), { list: newList });
                   setNewReasonText(""); setIsAddingReason(false); setActiveReason(newList.length-1);
                }} className="w-full bg-rose-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow-md">Salvar</button>
              </div>
            )}
            <div className="bg-white rounded-[3rem] shadow-2xl border border-rose-100 p-10 mb-8 min-h-[220px] flex items-center justify-center italic relative overflow-hidden group">
               <div className="absolute inset-0 bg-rose-50/20 rotate-3 group-hover:rotate-0 transition-transform"></div>
               <p className="text-xl font-bold text-slate-700 relative z-10">"{reasons[activeReason] || "..."}"</p>
            </div>
            <button onClick={() => setActiveReason((activeReason + 1) % reasons.length)} className="bg-rose-500 text-white px-10 py-4 rounded-full font-black shadow-lg flex items-center gap-2 uppercase text-xs mx-auto active:scale-95 transition-all">Próximo <ChevronRight size={18} /></button>
          </div>
        )}

        {page === 'moments' && (
          <div className="w-full flex flex-col max-h-[75vh] animate-in slide-in-from-left duration-500">
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black text-rose-600">Momentos</h2><button onClick={() => setIsAddingMoment(!isAddingMoment)} className="p-2 bg-rose-500 text-white rounded-full shadow-lg"><Plus size={18} /></button></div>
            {isAddingMoment && (
              <div className="mb-6 bg-rose-50 p-4 rounded-3xl border border-rose-100 text-left">
                <div onClick={() => momentFileRef.current.click()} className="aspect-video bg-white rounded-xl border-2 border-dashed border-rose-200 mb-3 flex flex-col items-center justify-center cursor-pointer overflow-hidden text-rose-300">
                  {momentForm.image ? <img src={momentForm.image} className="w-full h-full object-cover" /> : <Camera size={32} />}
                </div>
                <input placeholder="Título" className="w-full p-2 rounded-lg mb-2 text-sm outline-none border border-rose-50" value={momentForm.title} onChange={e => setMomentForm({...momentForm, title: e.target.value})} />
                <textarea placeholder="História" className="w-full p-2 rounded-lg mb-3 text-sm outline-none border border-rose-50 h-20" value={momentForm.desc} onChange={e => setMomentForm({...momentForm, desc: e.target.value})} />
                <button onClick={async () => {
                  if(!momentForm.title.trim()) return;
                  await addDoc(collection(db, 'romance_moments'), { ...momentForm, createdAt: Date.now(), date: new Date().toLocaleDateString('pt-BR') });
                  setMomentForm({title:"", desc:"", image:null}); setIsAddingMoment(false);
                }} className="w-full bg-rose-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow-md">Guardar</button>
              </div>
            )}
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {moments.map(m => (
                <div key={m.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-rose-50 text-left relative group">
                  <div className="aspect-video overflow-hidden bg-rose-50 flex items-center justify-center">
                    {m.image ? <img src={m.image} className="w-full h-full object-cover" /> : <Camera className="text-rose-100" size={40} />}
                    <button onClick={() => deleteDoc(doc(db, 'romance_moments', m.id))} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-1"><h3 className="font-black text-slate-700 uppercase text-xs">{m.title}</h3><span className="text-[9px] font-bold text-rose-300">{m.date}</span></div>
                    <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'future' && (
          <div className="w-full flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black text-rose-600">Futuro</h2><button onClick={() => setIsAddingFuture(!isAddingFuture)} className="p-2 bg-rose-500 text-white rounded-full shadow-lg"><Plus size={18} /></button></div>
            {isAddingFuture && (
              <div className="mb-6 bg-rose-50 p-4 rounded-3xl border border-rose-100 text-left">
                <input placeholder="Sonho..." className="w-full p-2 rounded-lg mb-2 text-sm outline-none border border-rose-50" value={futureForm.title} onChange={e => setFutureForm({...futureForm, title: e.target.value})} />
                <input type="datetime-local" className="w-full p-2 rounded-lg mb-3 text-sm outline-none border border-rose-50" value={futureForm.date} onChange={e => setFutureForm({...futureForm, date: e.target.value})} />
                <button onClick={async () => {
                  if(!futureForm.title.trim() || !futureForm.date) return;
                  await addDoc(collection(db, 'romance_future'), { ...futureForm });
                  setFutureForm({title:"", date:""}); setIsAddingFuture(false);
                }} className="w-full bg-rose-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow-md">Agendar</button>
              </div>
            )}
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {futures.map(f => {
                const diff = new Date(f.date) - new Date();
                const d = Math.max(0, Math.floor(diff / 86400000));
                return (
                  <div key={f.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-rose-50 relative text-left group">
                    <button onClick={() => deleteDoc(doc(db, 'romance_future', f.id))} className="absolute top-4 right-4 text-rose-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    <h3 className="text-rose-600 font-black uppercase text-xs mb-4">{f.title}</h3>
                    <div className="flex gap-4">
                      <div><span className="block text-2xl font-black text-slate-700">{d}</span><span className="text-[8px] uppercase text-slate-400 font-bold">Dias Restantes</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #fecaca; border-radius: 10px; }`}</style>
    </div>
  );
}
