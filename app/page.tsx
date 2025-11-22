"use client";

import { useEffect, useState, ChangeEvent, SelectHTMLAttributes } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Configuration ---
const GRADE_OPTIONS = ['Year 12', 'Year 11', 'Year 10'];
const SUBJECT_OPTIONS = ['Math', 'English']; 
const LANGUAGE_OPTIONS = ['Japanese', 'Vietnamese', 'English', 'Chinese'];

// ★ TUTORIAL DATA STRUCTURE (USED for STEPPER)
const tutorialContent = [
    { id: "all", label: "Home", icon: "🏠", description: "This is where you see all activity (Q&A, Tips, News) in chronological order. It provides a full overview of the campus feed." },
    { id: "question", label: "Q&A", icon: "❓", description: "Use this tab to ask questions when you encounter academic or lifestyle issues, and get advice from other students." },
    { id: "tip", label: "Tips", icon: "💡", description: "Share and find helpful experiences, study methods, and essential tips that others should know." }, 
    { id: "news", label: "News", icon: "📢", description: "This is for administrators only. Check here for event announcements, school notices, and important updates." },
    { id: "materials", label: "Materials", icon: "📚", description: "You can search for and share study notes, past exams, and reference materials specific to your language." },
];

// --- Type Definitions ---
type Post = {
  id: number;
  content: string;
  type: string;
  user_email?: string;
  created_at: string;
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

// SelectInput Component Props
interface SelectInputProps {
    value: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
    placeholder: string;
}

// ★ NEW COMPONENT: GUIDED TOUR MODAL
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

    // Simulate navigation by setting the active tab to the current step's tab
    useEffect(() => {
        if (currentStep >= 0) {
            onSetTab(stepData.id);
        }
    }, [currentStep, stepData.id, onSetTab]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 transform transition-transform duration-300 border-4 border-blue-500 relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-extrabold text-blue-600">
                        🎓 Tutorial Step {currentStep + 1} of {totalSteps}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600 text-2xl font-bold transition">
                        &times;
                    </button>
                </div>

                <div className="space-y-4">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-gray-800 p-2 bg-blue-100 rounded-lg">
                        <span className="text-3xl">{stepData.icon}</span> {stepData.label}
                    </h3>
                    <p className="text-gray-600 leading-relaxed pl-1">{stepData.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    <button 
                        onClick={onBack}
                        disabled={isFirstStep}
                        className="bg-gray-200 text-gray-700 py-2 px-4 rounded-xl font-bold hover:bg-gray-300 transition disabled:opacity-50"
                    >
                        &larr; Back
                    </button>
                    <button 
                        onClick={isLastStep ? onClose : onNext}
                        className="bg-green-600 text-white py-2 px-4 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200"
                    >
                        {isLastStep ? 'End Tour' : 'Next Step &rarr;'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function Home() {
  
  // --- State Management ---
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
  
  // MATERIAL UPLOAD STATES
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [materialGrade, setMaterialGrade] = useState(GRADE_OPTIONS[0]);
  const [materialSubject, setMaterialSubject] = useState(SUBJECT_OPTIONS[0]);
  const [materialUnit, setMaterialUnit] = useState(''); 
  const [materialDescription, setMaterialDescription] = useState(''); 
  const [uploadLanguage, setUploadLanguage] = useState(LANGUAGE_OPTIONS[0]); 

  // FILTERING STATES
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  
  // ★NEW GUIDED TOUR STATES
  const [currentTourStep, setCurrentTourStep] = useState(-1);
  const totalTourSteps = tutorialContent.length;


  // --- Data Fetching Functions ---
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
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };
  
  const fetchMaterials = async () => {
    let query = supabase.from("materials").select("*").order("created_at", { ascending: false });
    
    // フィルタリングロジックの適用
    if (filterLanguage && filterLanguage !== 'All Languages') {
        query = query.eq('language', filterLanguage);
    }
    if (filterGrade && filterGrade !== 'All Grades') {
        query = query.eq('grade', filterGrade);
    }
    if (filterSubject && filterSubject !== 'All Subjects') {
        query = query.eq('subject', filterSubject);
    }
    
    const { data } = await query;
    if (data) setMaterials(data);
  };
  
  useEffect(() => {
    if (activeTab === 'materials') {
      fetchMaterials();
    }
  }, [filterLanguage, filterGrade, filterSubject, activeTab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
        fetchUserRole(); 
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
        fetchUserRole(); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Actions ---

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://globalcampsstpaul.com',
      },
    });
    if (error) alert(error.message);
  };

  const handleUpload = async () => {
    if (!uploadFile || !materialTitle || !materialSubject || !materialGrade || !uploadLanguage) return alert("Please fill in the Title, File, Subject, Grade, and Language fields.");
    setLoading(true);
    try {
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(fileName, uploadFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from("materials").insert([{ 
        title: materialTitle, 
        file_url: publicUrl, 
        subject: materialSubject, 
        grade: materialGrade,
        unit: materialUnit,
        description: materialDescription,
        language: uploadLanguage, 
      }]);
      
      if (dbError) throw dbError;
      
      alert("Upload successful!");
      setMaterialTitle("");
      setUploadFile(null);
      setMaterialGrade(GRADE_OPTIONS[0]);
      setMaterialSubject(SUBJECT_OPTIONS[0]);
      setMaterialUnit('');
      setMaterialDescription('');
      setUploadLanguage(LANGUAGE_OPTIONS[0]); 
      fetchMaterials();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteMaterial = async (materialId: number, fileUrl: string) => {
    if (!window.confirm("Are you sure you want to delete this material and its file?")) { return; }
    
    setLoading(true);
    
    try {
        const pathSegments = fileUrl.split('materials/');
        const filePath = pathSegments.length > 1 ? pathSegments[1] : null;

        if (filePath) {
            const { error: storageError } = await supabase.storage.from('materials').remove([filePath]);
            if (storageError && storageError.message !== 'File not found') {
                throw new Error(`Storage Deletion Failed: ${storageError.message}`);
            }
        }
        
        const { error: dbError } = await supabase.from("materials").delete().eq("id", materialId); 
        if (dbError) {
             throw new Error(`DB Deletion Failed: ${dbError.message}`);
        }

        alert("Material successfully deleted.");
        fetchMaterials();
        
    } catch (error: any) {
        alert("Deletion Failed: " + error.message);
        console.error("Deletion Error:", error);
    } finally {
        setLoading(false);
    }
  };


  const handlePost = async () => {
    if (!inputText) return;
    if (selectedType === 'news' && userRole !== 'admin') {
        alert("You do not have permission to post News.");
        return;
    }
    await supabase.from("posts").insert([{ content: inputText, type: selectedType }]);
    setInputText("");
    fetchPosts();
  };

  const handleDeletePost = async (postId: number) => {
      if (!window.confirm("Are you sure you want to delete this post?")) { return; }
      setLoading(true);
      const { error } = await supabase.from("posts").delete().eq("id", postId); 
      if (error) { alert("Deletion failed: " + error.message); console.error("Delete Error:", error); } else { fetchPosts(); }
      setLoading(false);
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    if (!error) fetchUserRole(); 
  };
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else { alert("Check your email!"); fetchUserRole(); }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- UI Components ---
  const getTypeBadge = (type: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm";
    switch (type) {
      case "question": return <span className={`${baseClasses} bg-gradient-to-r from-green-400 to-teal-500`}>Q&A</span>;
      case "news": return <span className={`${baseClasses} bg-gradient-to-r from-red-400 to-pink-500`}>News</span>;
      case "tip": return <span className={`${baseClasses} bg-gradient-to-r from-orange-400 to-yellow-500`}>Tips</span>;
      default: return <span className={`${baseClasses} bg-gray-400`}>Other</span>;
    }
  };
  
  // SelectInput コンポーネント (型修正済み)
  const SelectInput: React.FC<SelectInputProps> = ({ value, onChange, options, placeholder }) => (
    <select
        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
        value={value}
        onChange={onChange}
    >
        {/* All/Selectプレースホルダーの処理 */}
        {placeholder.startsWith('All') && <option value="">{placeholder}</option>}
        {!placeholder.startsWith('All') && <option value="" disabled>{placeholder}</option>}
        
        {options.map((opt: string) => ( 
            <option key={opt} value={opt}>{opt}</option>
        ))}
    </select>
  );
  
  // --- Guided Tour Controls ---
  const startTour = () => setCurrentTourStep(0);
  const nextStep = () => setCurrentTourStep(prev => Math.min(prev + 1, totalTourSteps - 1));
  const backStep = () => setCurrentTourStep(prev => Math.max(prev - 1, 0));
  const endTour = () => {
      setCurrentTourStep(-1);
      setActiveTab('all'); // ツアー終了時はHomeに戻す
  }

  // ==========================================
  // ▼▼▼ VIEW (JSX) ▼▼▼
  // ==========================================

  // 1. Login Screen (そのまま)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px]">
          {/* Left: Image/Branding Area */}
          <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 items-center justify-center p-12 text-white">
            <div>
              <h1 className="text-5xl font-extrabold mb-6">Global<br/>Campus</h1>
              <p className="text-lg opacity-90">Connect with students worldwide.<br/>Share knowledge, ask questions.</p>
            </div>
          </div>
          {/* Right: Login Form */}
          <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Log In</h2>
            <div className="space-y-5">
              
              {/* Google Button */}
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-gray-400 text-sm font-medium">or</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black" type="email" placeholder="Email Address" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
              <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black" type="password" placeholder="Password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">Log In</button>
              <button onClick={handleSignUp} className="w-full text-gray-500 py-4 hover:text-blue-600 transition font-bold">Create an account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard (3-Column Layout for Desktop)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="max-w-7xl mx-auto flex items-start gap-8 px-4 py-8">
        
        {/* === [LEFT COLUMN] Navigation Sidebar === */}
        <nav className="hidden md:block w-64 sticky top-8 shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8 px-2">
              GC
            </h1>
            <ul className="space-y-2">
              {tutorialContent.map((item, index) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-3 ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50"
                    }
                    ${currentTourStep === index ? 'border-2 border-red-500 ring-2 ring-red-300 shadow-lg' : ''} // ★ツアー中のハイライト
                    `}
                  >
                    <span className="text-xl">{item.icon}</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-gray-400 hover:text-red-500 font-bold text-sm transition">
                Log Out
              </button>
            </div>
          </div>
        </nav>

        {/* === [CENTER COLUMN] Main Feed === */}
        <main className="flex-1 min-w-0">
          
          {/* Mode: Material Sharing (修正ポイント) */}
          {activeTab === "materials" ? (
            <div className="space-y-6">
              
              {/* ★★★ FILTERING UI ★★★ */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Filter Materials</h3>
                  <div className="grid grid-cols-3 gap-3">
                      {/* 言語フィルター */}
                      <SelectInput 
                          value={filterLanguage} 
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterLanguage(e.target.value)} 
                          options={['All Languages', ...LANGUAGE_OPTIONS]}
                          placeholder="All Languages"
                      />
                      {/* 学年フィルター */}
                      <SelectInput 
                          value={filterGrade} 
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterGrade(e.target.value)} 
                          options={['All Grades', ...GRADE_OPTIONS]}
                          placeholder="All Grades"
                      />
                      {/* 教科フィルター */}
                      <SelectInput 
                          value={filterSubject} 
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterSubject(e.target.value)} 
                          options={['All Subjects', ...SUBJECT_OPTIONS]}
                          placeholder="All Subjects"
                      />
                  </div>
              </div>
              
              {/* Upload Card (アップロードフォーム) */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Shared Materials</h2>
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">File Storage</span>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-3">
                    {/* ★タイトル */}
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                      placeholder="Title of Document (e.g., N2 Grammar Notes)"
                      value={materialTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMaterialTitle(e.target.value)}
                    />
                    
                    {/* ★言語と学年のドロップダウン */}
                    <div className="grid grid-cols-2 gap-3">
                         <SelectInput 
                            value={uploadLanguage} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setUploadLanguage(e.target.value)} 
                            options={LANGUAGE_OPTIONS}
                            placeholder="Select Language"
                        />
                        <SelectInput 
                            value={materialGrade} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMaterialGrade(e.target.value)} 
                            options={GRADE_OPTIONS}
                            placeholder="Select Grade"
                        />
                    </div>

                    {/* ★教科と単元 */}
                    <div className="grid grid-cols-2 gap-3">
                         <SelectInput 
                            value={materialSubject} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMaterialSubject(e.target.value)} 
                            options={SUBJECT_OPTIONS}
                            placeholder="Select Subject"
                        />
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                            placeholder="Unit/Topic (e.g., Adjectives)"
                            value={materialUnit}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setMaterialUnit(e.target.value)}
                        />
                    </div>

                    {/* ★説明欄 */}
                    <textarea
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-20"
                        placeholder="Description (Optional)"
                        value={materialDescription}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMaterialDescription(e.target.value)}
                    />

                    {/* ファイル選択 */}
                    <div className="relative pt-2">
                        <input type="file" className="hidden" id="fileUpload" onChange={(e: ChangeEvent<HTMLInputElement>) => setUploadFile(e.target.files ? e.target.files[0] : null)} /> 
                        <label htmlFor="fileUpload" className="block w-full p-3 bg-gray-50 rounded-xl text-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-dashed border-gray-300 transition">
                          {uploadFile ? "📄 " + uploadFile.name : "📁 Select File (PDF, DOCX, etc.)"}
                        </label>
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={loading} className="h-24 w-32 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition shadow-md shadow-yellow-200">
                    {loading ? "..." : "Upload"}
                  </button>
                </div>
              </div>

              {/* Grid View for Files (表示内容を修正) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((mat) => (
                  <div key={mat.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                    <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center text-center p-3">
                         <span className="text-5xl text-gray-300 mb-2">📄</span>
                         {mat.language && <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{mat.language}</span>}
                         {(mat.grade || mat.subject) && <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-full mt-1">{mat.grade} / {mat.subject}</span>}
                      </div>
                      <a href={mat.file_url} target="_blank" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-sm">
                        <span className="text-white font-bold bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Open File</span>
                      </a>
                    </div>
                    <div className="p-4 bg-white relative z-10">
                      <h3 className="font-bold text-gray-800 truncate" title={mat.title}>{mat.title}</h3>
                      {mat.unit && <p className="text-xs text-gray-600 mt-1 truncate" title={`Unit: ${mat.unit}`}>Unit: {mat.unit}</p>}
                      {mat.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{mat.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Shared by user</p>
                      
                      {/* ★管理者のみに削除ボタンを追加 */}
                      {userRole === 'admin' && (
                          <button 
                              onClick={() => handleDeleteMaterial(mat.id, mat.file_url)}
                              className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition mt-2 border-t pt-2 w-full justify-center"
                              disabled={loading}
                          >
                              <span>🗑️</span> Delete Material
                          </button>
                      )}
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mode: Feed Timeline (そのまま) */
            <div className="space-y-6">
              {/* Post Input */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0"></div>
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-transparent text-lg outline-none placeholder-gray-400 resize-none h-20"
                      placeholder="What's happening on campus?"
                      value={inputText}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                          <select
                            className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-bold text-gray-600 outline-none cursor-pointer hover:bg-gray-100 transition"
                            value={selectedType}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
                          >
                            <option value="question">❓ Q&A</option>
                            {userRole === 'admin' ? (
                                <option value="news">📢 News</option>
                            ) : (
                                <option value="news" disabled={selectedType !== 'news'}>📢 News (Admin Only)</option>
                            )}
                            <option value="tip">💡 Tips</option>
                          </select>
                      </div>
                      <button onClick={handlePost} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition shadow-md shadow-blue-200">
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed List (削除ボタン表示の権限チェックあり) */}
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                        <div>
                          <p className="font-bold text-gray-900">Student User</p>
                          <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {getTypeBadge(post.type)}
                    </div>
                    <p className="text-gray-800 text-lg leading-relaxed pl-13">{post.content}</p>
                    <div className="flex gap-6 mt-6 pl-13 border-t border-gray-50 pt-4">
                      <button className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition">
                        <span>❤️</span> Like
                      </button>
                      <button className="text-gray-400 hover:text-blue-500 font-bold text-sm flex items-center gap-2 transition">
                        <span>💬</span> Comment
                      </button>
                      
                      {/* ★管理者のみに削除ボタンを表示 */}
                      {userRole === 'admin' && (
                          <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="text-gray-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 transition ml-auto"
                              disabled={loading}
                          >
                              <span>🗑️</span> Delete
                          </button>
                      )}
                    </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* === [RIGHT COLUMN] Widgets Sidebar === */}
        <aside className="hidden xl:block w-80 sticky top-8 shrink-0">
          {/* Profile Widget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-400 text-xs uppercase mb-4">Your Profile</h3>
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-400 to-blue-500"></div>
               <div>
                  <p className="font-bold text-lg">You ({userRole})</p> 
                  <p className="text-xs text-gray-500">{session?.user.email || email}</p>
               </div>
            </div>
            <div className="flex justify-between text-center bg-gray-50 p-3 rounded-xl">
               <div><p className="font-bold text-lg">12</p><p className="text-xs text-gray-400">Posts</p></div>
               <div><p className="font-bold text-lg">45</p><p className="text-xs text-gray-400">Likes</p></div>
               <div><p className="font-bold text-lg">3</p><p className="text-xs text-gray-400">Files</p></div>
            </div>
          </div>

          {/* Trending/Info Widget */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2">✨ Welcome!</h3>
            <p className="text-sm opacity-90 leading-relaxed mb-4">
              This is the desktop version of Global Campus. Use the left menu to navigate.
            </p>
            {/* ★修正ポイント: Learn More ボタンの挙動を変更 */}
            <button 
                onClick={startTour} 
                className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition"
            >
                Learn More (Tutorial)
            </button>
          </div>
        </aside>

      </div>
      
      {/* ★NEW COMPONENT: チュートリアルモーダル */}
      <GuidedTourModal 
          currentStep={currentTourStep} 
          onNext={nextStep} 
          onBack={backStep}
          onClose={endTour}
          onSetTab={setActiveTab}
          totalSteps={totalTourSteps}
      />
    </div>
  );
}