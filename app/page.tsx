"use client";

import { useEffect, useState, ChangeEvent, SelectHTMLAttributes } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Configuration ---
const GRADE_OPTIONS = ['Year 12', 'Year 11', 'Year 10'];
const SUBJECT_OPTIONS = ['Math', 'English']; 
const LANGUAGE_OPTIONS = ['Japanese', 'Vietnamese', 'English', 'Chinese'];

// チュートリアルコンテンツ
const tutorialContent = [
    { id: "all", label: "Home", icon: "🏠", description: "全てのアクティビティ（Q&A、Tips、News）を時系列で確認できます。" },
    { id: "question", label: "Q&A", icon: "❓", description: "学業や生活の質問を投稿し、他の学生からアドバイスをもらえます。" },
    { id: "tip", label: "Tips", icon: "💡", description: "役立つ経験や学習方法などの情報を共有・発見できます。" }, 
    { id: "news", label: "News", icon: "📢", description: "管理者専用のセクションです。イベントや重要なお知らせを確認できます。" },
    { id: "materials", label: "Materials", icon: "📚", description: "語学別、科目別のノートや過去問などの資料を検索・共有できます。" },
];

// --- Type Definitions ---
type Comment = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

type Post = {
  id: number;
  content: string;
  type: string;
  user_email?: string;
  created_at: string;
  likes_count: number;
  has_liked: boolean;
  comments: Comment[];
};

type Material = {
  id: number;
  title: string;
  file_url: string;
  subject?: string;
  grade?: string;
  unit?: string;
  description?: string;
  language?: string; 
};

// SelectInput Props
interface SelectInputProps {
    value: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
    placeholder: string;
}

// GuidedTourModal
const GuidedTourModal: React.FC<{ 
    currentStep: number; 
    onNext: () => void; 
    onBack: () => void;
    onClose: () => void; 
    onSetTab: (tabId: string) => void;
    totalSteps: number; 
}> = ({ currentStep, onNext, onBack, onClose, onSetTab, totalSteps }) => {
    if (currentStep < 0) return null;
    const stepData = tutorialContent[currentStep];
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;
    useEffect(() => { if (currentStep >= 0) onSetTab(stepData.id); }, [currentStep, stepData.id, onSetTab]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 transition-opacity duration-300">
            <div className="bg-dark-card/80 backdrop-blur-sm text-gray-200 rounded-3xl w-full max-w-xl shadow-neon p-6 relative border-4 border-accent mx-4"> {/* ★Glassmorphism適用 */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-extrabold text-accent">🎓 Tutorial Step {currentStep + 1}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-accent text-2xl font-bold">&times;</button>
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-white p-2 bg-gray-800 rounded-lg border border-gray-700">
                        <span className="text-3xl">{stepData.icon}</span> {stepData.label}
                    </h3>
                    <p className="text-gray-300 leading-relaxed pl-1">{stepData.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
                    <button onClick={onBack} disabled={isFirstStep} className="bg-gray-700 text-gray-300 py-2 px-4 rounded-xl font-bold hover:bg-gray-600 transition disabled:opacity-50">&larr; 戻る</button>
                    <button onClick={isLastStep ? onClose : onNext} className="bg-accent text-gray-900 py-2 px-4 rounded-xl font-bold hover:bg-cyan-400 transition shadow-neon-sm">{isLastStep ? 'ツアーを終了' : '次へ'}</button>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student'); 
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [materialGrade, setMaterialGrade] = useState(GRADE_OPTIONS[0]);
  const [materialSubject, setMaterialSubject] = useState(SUBJECT_OPTIONS[0]);
  const [materialUnit, setMaterialUnit] = useState(''); 
  const [materialDescription, setMaterialDescription] = useState(''); 
  const [uploadLanguage, setUploadLanguage] = useState(LANGUAGE_OPTIONS[0]); 

  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  const [currentTourStep, setCurrentTourStep] = useState(-1);
  const totalTourSteps = tutorialContent.length;
  
  const [showCommentInput, setShowCommentInput] = useState<{[key: number]: boolean}>({}); 
  const [commentInputs, setCommentInputs] = useState<{[key: number]: string}>({}); 

  const fetchUserRole = async () => {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) { setUserRole('student'); return; }
    const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (error && error.code !== 'PGRST116') { console.error("Error fetching user role:", error); }
    if (data?.role) { setUserRole(data.role as 'student' | 'admin'); } else {
      const { error: insertError } = await supabase.from("users").insert({ id: user.id, role: 'student' });
      if (!insertError) { setUserRole('student'); }
    }
  };
  
  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : '00000000-0000-0000-0000-000000000000'; 

    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            likes_count:likes(count),
            user_has_liked:likes(count).eq('user_id', '${currentUserId}'),
            comments (
                id, content, created_at, user_id
            )
        `)
        .order('created_at', { ascending: false });
        
    if (error) { console.error("Error fetching posts:", error); return; }
    
    const formattedPosts = posts?.map((post: any) => ({
        ...post,
        likes_count: post.likes_count?.[0]?.count || 0,
        has_liked: post.user_has_liked?.[0]?.count > 0,
        comments: post.comments?.sort((a: Comment, b: Comment) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
    } as Post)); 

    if (formattedPosts) setPosts(formattedPosts);
  };
  
  const fetchMaterials = async () => {
    let query = supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (filterLanguage && filterLanguage !== 'All Languages') query = query.eq('language', filterLanguage);
    if (filterGrade && filterGrade !== 'All Grades') query = query.eq('grade', filterGrade);
    if (filterSubject && filterSubject !== 'All Subjects') query = query.eq('subject', filterSubject);
    const { data } = await query;
    if (data) setMaterials(data);
  };
  
  useEffect(() => { if (activeTab === 'materials') fetchMaterials(); }, [filterLanguage, filterGrade, filterSubject, activeTab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { fetchPosts(); fetchMaterials(); fetchUserRole(); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { fetchPosts(); fetchMaterials(); fetchUserRole(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://globalcampsstpaul.com' },
    });
    if (error) alert(error.message);
  };

  const handleLikeToggle = async (postId: number) => { 
      if (loading || !session?.user.id) { return alert("ログインが必要です。"); }
      setLoading(true);
      try {
          const { error } = await supabase.rpc('toggle_like', { post_id_input: postId, user_id_input: session.user.id });
          if (error) throw error; else fetchPosts(); 
      } catch (error: any) { alert("いいね処理に失敗しました: " + error.message); } finally { setLoading(false); }
  };
  
  const handleCommentSubmit = async (postId: number) => {
      const commentContent = commentInputs[postId];
      if (!commentContent || loading) return;
      setLoading(true);
      try {
          const { error } = await supabase.from("comments").insert([{ post_id: postId, user_id: session.user.id, content: commentContent }]);
          if (error) throw error;
          setCommentInputs(prev => ({ ...prev, [postId]: '' }));
          fetchPosts();
      } catch (error: any) { alert("コメントの送信に失敗しました: " + error.message); } finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("全てのフィールドを入力してください");
    setLoading(true);
    try {
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(fileName, uploadFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
      await supabase.from("materials").insert([{ 
        title: materialTitle, file_url: publicUrl, subject: materialSubject, grade: materialGrade, unit: materialUnit, description: materialDescription, language: uploadLanguage, 
      }]);
      alert("アップロード成功しました！");
      setMaterialTitle(""); setUploadFile(null); fetchMaterials();
    } catch (error: any) { alert("エラー: " + error.message); } finally { setLoading(false); }
  };
  
  const handleDeleteMaterial = async (materialId: number, fileUrl: string) => {
    if (!window.confirm("本当に削除しますか？")) return; 
    setLoading(true);
    try {
        const pathSegments = fileUrl.split('materials/');
        if (pathSegments.length > 1) await supabase.storage.from('materials').remove([pathSegments[1]]);
        await supabase.from("materials").delete().eq("id", materialId); 
        alert("削除しました。"); fetchMaterials();
    } catch (error: any) { alert("失敗しました: " + error.message); } finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!inputText || !session?.user) return;
    if (selectedType === 'news' && userRole !== 'admin') return alert("管理人のみ投稿できます。");
    await supabase.from("posts").insert([{ content: inputText, type: selectedType, user_email: session.user.email }]);
    setInputText("");
    fetchPosts();
  };

  const handleDeletePost = async (postId: number) => {
      if (!window.confirm("本当に投稿を削除しますか？")) return;
      const { error } = await supabase.from("posts").delete().eq("id", postId); 
      if (error) alert("削除に失敗しました"); else fetchPosts();
  };

  const handleLogin = async () => { await supabase.auth.signInWithPassword({ email, password }); fetchUserRole(); };
  const handleSignUp = async () => { await supabase.auth.signUp({ email, password }); fetchUserRole(); };
  const handleLogout = async () => { await supabase.auth.signOut(); };

  const getTypeBadge = (type: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm";
    switch (type) {
      case "question": return <span className={`${baseClasses} bg-gradient-to-r from-green-400 to-teal-500`}>Q&A</span>;
      case "news": return <span className={`${baseClasses} bg-gradient-to-r from-red-400 to-pink-500`}>News</span>;
      case "tip": return <span className={`${baseClasses} bg-gradient-to-r from-orange-400 to-yellow-500`}>Tips</span>;
      default: return <span className={`${baseClasses} bg-gray-400`}>Other</span>;
    }
  };
  
  const SelectInput: React.FC<SelectInputProps> = ({ value, onChange, options, placeholder }) => (
    <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={value} onChange={onChange}>
        {placeholder.startsWith('All') && <option value="">{placeholder}</option>}
        {!placeholder.startsWith('All') && <option value="" disabled>{placeholder}</option>}
        {options.map((opt: string) => ( <option key={opt} value={opt}>{opt}</option> ))}
    </select>
  );
  
  const startTour = () => setCurrentTourStep(0);
  const nextStep = () => setCurrentTourStep(prev => Math.min(prev + 1, totalTourSteps - 1));
  const backStep = () => setCurrentTourStep(prev => Math.max(prev - 1, 0));
  const endTour = () => { setCurrentTourStep(-1); setActiveTab('all'); }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px]">
          <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 items-center justify-center p-12 text-white">
            <div><h1 className="text-5xl font-extrabold mb-6">Global<br/>Campus</h1><p className="text-lg opacity-90">Connect with students worldwide.</p></div>
          </div>
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Log In</h2>
            <div className="space-y-5">
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm">Sign in with Google</button>
              <div className="flex items-center gap-4 my-2"><div className="h-px bg-gray-200 flex-1"></div><span className="text-gray-400 text-sm font-medium">or</span><div className="h-px bg-gray-200 flex-1"></div></div>
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Log In</button>
              <button onClick={handleSignUp} className="w-full text-gray-500 py-4 font-bold">Create an account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // ★ ダークテーマ適用: bg-gray-50 -> bg-deep-dark
    <div className="min-h-screen bg-deep-dark text-gray-200 font-mono"> 
      
      {/* ★NEW: Mobile Header (Sticky) */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-dark-card/90 backdrop-blur-md border-b border-gray-700 z-20 h-16 flex items-center justify-between px-4 shadow-lg">
          <h1 className="text-xl font-extrabold text-accent">GC</h1>
          <button onClick={startTour} className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold border border-accent/50 shadow-neon-sm">
              🎓 Tutorial
          </button>
      </div>

      {/* ★NEW: Mobile Bottom Navigation (Sticky) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-md border-t border-gray-700 z-20 flex justify-around items-center h-16 pb-2 shadow-[0_0_10px_rgba(0,255,255,0.3)]">
          {tutorialContent.map((item) => (
              <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-full h-full ${activeTab === item.id ? 'text-accent' : 'text-gray-500'}`}
              >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] font-bold">{item.label}</span>
              </button>
          ))}
      </div>

      <div className="max-w-7xl mx-auto flex items-start gap-8 px-4 py-8">
        {/* PC Sidebar (Hidden on Mobile) */}
        <nav className="hidden md:block w-64 sticky top-8 shrink-0">
          <div className="bg-dark-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-neon border border-gray-700">
            <h1 className="text-2xl font-extrabold text-accent mb-8 px-2">GC</h1>
            <ul className="space-y-2">
              {tutorialContent.map((item, index) => (
                <li key={item.id}>
                  <button onClick={() => setActiveTab(item.id)} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-3 ${activeTab === item.id ? "bg-accent/20 text-accent shadow-neon-sm" : "text-gray-400 hover:bg-gray-800"} ${currentTourStep === index ? 'border-2 border-red-500 ring-2 ring-red-300 shadow-lg' : ''}`}>
                    <span className="text-xl">{item.icon}</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-gray-700"><button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-400 hover:text-red-500 font-bold text-sm transition">Log Out</button></div>
          </div>
        </nav>

        {/* Main Feed (Padding added for Mobile) */}
        <main className="flex-1 min-w-0 pt-14 pb-20 md:pt-0 md:pb-0">
          {activeTab === "materials" ? (
            <div className="space-y-6">
              <div className="bg-dark-card/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-700 space-y-4">
                  <h3 className="text-lg font-bold text-gray-200">Filter Materials</h3>
                  <div className="grid grid-cols-3 gap-3">
                      <SelectInput value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} options={['All Languages', ...LANGUAGE_OPTIONS]} placeholder="All Languages"/>
                      <SelectInput value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} options={['All Grades', ...GRADE_OPTIONS]} placeholder="All Grades"/>
                      <SelectInput value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} options={['All Subjects', ...SUBJECT_OPTIONS]} placeholder="All Subjects"/>
                  </div>
              </div>
              <div className="bg-dark-card/80 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-gray-700">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-200">Shared Materials</h2><span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold border border-accent/50">File Storage</span></div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-3">
                    <input type="text" className="w-full p-3 bg-gray-800 text-white rounded-xl border border-gray-700" placeholder="Title" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                         <SelectInput value={uploadLanguage} onChange={(e) => setUploadLanguage(e.target.value)} options={LANGUAGE_OPTIONS} placeholder="Select Language"/>
                         <SelectInput value={materialGrade} onChange={(e) => setMaterialGrade(e.target.value)} options={GRADE_OPTIONS} placeholder="Select Grade"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <SelectInput value={materialSubject} onChange={(e) => setMaterialSubject(e.target.value)} options={SUBJECT_OPTIONS} placeholder="Select Subject"/>
                         <input type="text" className="w-full p-3 bg-gray-800 text-white rounded-xl border border-gray-700" placeholder="Unit/Topic" value={materialUnit} onChange={(e) => setMaterialUnit(e.target.value)} />
                    </div>
                    <textarea className="w-full p-3 bg-gray-800 text-white rounded-xl border border-gray-700 h-20" placeholder="Description" value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} />
                    <div className="relative pt-2">
                        <input type="file" className="hidden" id="fileUpload" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} /> 
                        <label htmlFor="fileUpload" className="block w-full p-3 bg-gray-800 text-accent rounded-xl border border-dashed border-accent/50 cursor-pointer hover:bg-gray-700 transition shadow-neon-sm">{uploadFile ? "📄 " + uploadFile.name : "📁 Select File (PDF, DOCX, etc.)"}</label>
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={loading} className="h-24 w-32 bg-accent text-gray-900 font-bold rounded-xl shadow-neon hover:bg-cyan-400">{loading ? "..." : "Upload"}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((mat) => (
                  <div key={mat.id} className="group relative bg-dark-card/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg border border-gray-700 hover:shadow-neon-sm transition-all duration-300 hover:-translate-y-1">
                    <div className="h-48 bg-gray-800 relative overflow-hidden flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center text-center p-3">
                         <span className="text-5xl text-accent/50 mb-2">📄</span>
                         {mat.language && <span className="bg-blue-500/30 text-accent text-xs font-bold px-2 py-1 rounded-full">{mat.language}</span>}
                         {(mat.grade || mat.subject) && <span className="bg-green-500/30 text-green-400 text-xs font-bold px-2 py-1 rounded-full mt-1">{mat.grade} / {mat.subject}</span>}
                      </div>
                      <a href={mat.file_url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm"><span className="text-white font-bold bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Open</span></a>
                    </div>
                    <div className="p-4 bg-dark-card/80 relative z-10">
                      <h3 className="font-bold text-gray-100 truncate" title={mat.title}>{mat.title}</h3>
                      {mat.unit && <p className="text-xs text-gray-400 mt-1 truncate font-mono" title={`Unit: ${mat.unit}`}>Unit: {mat.unit}</p>}
                      {mat.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mat.description}</p>}
                      <p className="text-xs text-gray-500 mt-1">Shared by user</p>
                      {userRole === 'admin' && <button onClick={() => handleDeleteMaterial(mat.id, mat.file_url)} className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition mt-2 border-t border-gray-700 pt-2 w-full justify-center"><span>🗑️</span> Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-dark-card/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-700">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-purple-600 flex-shrink-0 shadow-neon-sm"></div>
                  <div className="flex-1">
                    <textarea className="w-full bg-gray-800 text-white p-3 rounded-lg outline-none placeholder-gray-500 resize-none h-20" placeholder="What's happening?" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                      <select className="bg-gray-800 text-gray-400 px-3 py-2 rounded-lg text-sm font-bold border border-gray-700 outline-none cursor-pointer hover:bg-gray-700" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        <option value="question">❓ Q&A</option>
                        {userRole === 'admin' ? <option value="news">📢 News</option> : <option value="news" disabled>📢 News (Admin Only)</option>}
                        <option value="tip">💡 Tips</option>
                      </select>
                      <button onClick={handlePost} className="bg-accent text-gray-900 px-6 py-2 rounded-full font-bold shadow-neon-sm hover:bg-cyan-400">Post</button>
                    </div>
                  </div>
                </div>
              </div>
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="bg-dark-card/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-700 hover:shadow-neon-sm transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700"></div>
                        <div><p className="font-bold text-gray-200">Student User</p><p className="text-xs text-gray-500 font-mono">{post.user_email || 'anonymous'}</p></div>
                      </div>
                      {getTypeBadge(post.type)}
                    </div>
                    <p className="text-gray-100 text-lg leading-relaxed pl-13">{post.content}</p>
                    <div className="flex gap-6 mt-6 pl-13 border-t border-gray-700 pt-4">
                      <button onClick={() => handleLikeToggle(post.id)} className={`font-bold text-sm flex items-center gap-2 transition ${post.has_liked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}><span>{post.has_liked ? '❤️' : '🤍'}</span> Like ({post.likes_count || 0})</button>
                      <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="text-gray-400 hover:text-accent font-bold text-sm flex items-center gap-2 transition"><span>💬</span> Comment ({post.comments.length || 0})</button>
                      {userRole === 'admin' && <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition ml-auto"><span>🗑️</span> Delete</button>}
                    </div>
                    {showCommentInput[post.id] && (
                        <div className="mt-4 pl-13 pt-4 border-t border-gray-700">
                            <div className="space-y-3 mb-4">
                                {post.comments.length > 0 ? (
                                    post.comments.map(comment => (
                                        <div key={comment.id} className="bg-gray-800 p-3 rounded-lg text-sm border border-gray-700">
                                            <p className="text-gray-100">{comment.content}</p>
                                            <p className="text-xs text-gray-500 mt-1 font-mono">{new Date(comment.created_at).toLocaleString()}</p>
                                        </div>
                                    ))
                                ) : (<p className="text-xs text-gray-500 italic">コメントはまだありません。</p>)}
                            </div>
                            <textarea className="w-full bg-gray-800 text-white p-3 rounded-lg text-sm outline-none resize-none" placeholder="コメントを入力..." value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} rows={2} />
                            <button onClick={() => handleCommentSubmit(post.id)} disabled={loading || !commentInputs[post.id]} className="mt-2 bg-accent text-gray-900 px-4 py-1 rounded-full text-sm font-bold shadow-neon-sm float-right">送信</button>
                            <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: false }))} className="mt-2 mr-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-1 rounded-full text-sm font-bold float-right">閉じる</button>
                            <div className="clear-both"></div>
                        </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </main>
        <aside className="hidden xl:block w-80 sticky top-8 shrink-0">
          <div className="bg-dark-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700">
            <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">YOUR PROFILE</h3>
            <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-accent/50 border border-accent"></div><div><p className="font-bold text-lg text-white">You ({userRole})</p><p className="text-xs text-accent font-mono">{session?.user.email || 'N/A'}</p></div></div>
            <div className="flex justify-between text-center bg-gray-800 p-3 rounded-xl border border-gray-700">
              <div className="font-mono"><div><p className="font-bold text-lg">12</p><p className="text-xs text-gray-500">Posts</p></div></div>
              <div className="font-mono"><div><p className="font-bold text-lg">45</p><p className="text-xs text-gray-500">Likes</p></div></div>
              <div className="font-mono"><div><p className="font-bold text-lg">3</p><p className="text-xs text-gray-500">Files</p></div></div>
            </div>
          </div>
          <div className="bg-dark-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700">
            <h3 className="font-bold text-lg mb-2 text-white">✨ WELCOME!</h3>
            <p className="text-sm opacity-90 leading-relaxed text-gray-400 mb-4">This is the state-of-the-art version of Global Campus. Use the navigation to explore.</p>
            <button onClick={startTour} className="w-full bg-accent text-gray-900 py-2 rounded-lg font-bold text-sm shadow-neon hover:bg-cyan-400">TUTORIAL START</button>
          </div>
        </aside>
      </div>
      <GuidedTourModal currentStep={currentTourStep} onNext={nextStep} onBack={backStep} onClose={endTour} onSetTab={setActiveTab} totalSteps={totalTourSteps} />
    </div>
  );
}