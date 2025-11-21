"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
};

export default function Home() {
  // --- State Management ---
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // --- Initialization & Data Fetching ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (data) setMaterials(data);
  };

  // --- Actions ---
  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("Please select a title and a file.");
    setLoading(true);
    try {
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(fileName, uploadFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("materials").insert([{ title: materialTitle, file_url: publicUrl, subject: "general" }]);
      if (dbError) throw dbError;
      alert("Upload successful!");
      setMaterialTitle("");
      setUploadFile(null);
      fetchMaterials();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!inputText) return;
    await supabase.from("posts").insert([{ content: inputText, type: selectedType }]);
    setInputText("");
    fetchPosts();
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration successful! Please check your email if confirmation is enabled.");
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Design Parts: Badges (English) ---
  const getTypeBadge = (type: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm";
    switch (type) {
      case "question": return <span className={`${baseClasses} bg-gradient-to-r from-green-400 to-teal-500`}>Q&A</span>;
      case "news": return <span className={`${baseClasses} bg-gradient-to-r from-red-400 to-pink-500`}>News</span>;
      case "tip": return <span className={`${baseClasses} bg-gradient-to-r from-orange-400 to-yellow-500`}>Tips</span>;
      default: return <span className={`${baseClasses} bg-gray-400`}>Other</span>;
    }
  };

  // ==========================================
  // ▼▼▼ JSX (View) ▼▼▼
  // ==========================================

  // 1. Login Screen (English)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-sky-200 via-violet-200 to-orange-100 p-4">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Global Campus
            </h1>
            <p className="text-gray-600 font-medium">Community for International Students</p>
          </div>
          <div className="space-y-4">
            <input className="w-full p-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition text-black placeholder-gray-400 font-medium" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full p-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition text-black placeholder-gray-400 font-medium" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] active:scale-[0.98]">Log In</button>
            <button onClick={handleSignUp} className="w-full bg-white/70 text-gray-600 py-4 rounded-xl font-bold border border-gray-200 hover:bg-white transition transform hover:scale-[1.02] active:scale-[0.98]">Sign Up</button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Screen (English)
  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent cursor-pointer">
            Global Campus
          </h1>
          <button onClick={handleLogout} className="text-sm font-bold text-gray-400 hover:text-red-500 transition bg-gray-100 px-3 py-1 rounded-full hover:bg-red-50">
            Log Out
          </button>
        </div>
        {/* Tab Menu */}
        <div className="max-w-2xl mx-auto flex overflow-x-auto no-scrollbar px-2">
          {["all", "question", "news", "materials"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-4 text-sm font-bold transition-all capitalize ${
                activeTab === tab
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "all" ? "All" : tab === "materials" ? "📚 Files" : tab === "news" ? "📢 News" : "💬 Q&A"}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"></span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-8 pt-[130px]">
        
        {/* --- Material Mode --- */}
        {activeTab === "materials" ? (
          <div className="space-y-8">
            {/* Upload Area */}
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-yellow-100/50 border border-yellow-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 text-yellow-50 text-9xl opacity-50">📂</div>
              <h3 className="font-bold text-xl text-gray-800 mb-6 relative z-10">
                Share Materials
              </h3>
              <div className="space-y-4 relative z-10">
                <input
                  type="text"
                  className="w-full p-4 bg-yellow-50/50 rounded-2xl border-none focus:ring-2 focus:ring-yellow-400 text-black font-medium placeholder-yellow-300"
                  placeholder="Title (e.g., N2 Grammar Notes)"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                />
                <label className="block w-full p-4 bg-yellow-50/50 rounded-2xl text-center text-yellow-600 font-bold cursor-pointer hover:bg-yellow-100 transition border-2 border-dashed border-yellow-300/50 group">
                  <span className="group-hover:scale-110 transition-transform inline-block">📁</span> {uploadFile ? uploadFile.name : "Select File"}
                  <input type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
                </label>
                <button onClick={handleUpload} disabled={loading} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-2xl font-bold hover:from-yellow-600 hover:to-orange-600 transition shadow-lg shadow-yellow-500/30 transform hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>

            {/* Material List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <div key={mat.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-square bg-gray-100 relative">
                     {mat.file_url ? (
                       <img src={mat.file_url} alt={mat.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">📄</div>
                     )}
                     <a href={mat.file_url} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="text-white font-bold bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">Open</span>
                     </a>
                  </div>
                  <div className="p-4 bg-white relative z-10">
                    <p className="font-bold text-sm text-gray-800 truncate">{mat.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* --- Board Mode --- */
          <div className="space-y-8">
            {/* Post Form */}
            <div className="bg-white p-5 rounded-3xl shadow-lg shadow-blue-100/50 border border-blue-50 relative z-10 transform hover:scale-[1.01] transition-all">
              <div className="flex gap-4 mb-4 items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex-shrink-0 flex items-center justify-center text-white text-2xl shadow-md">🐸</div>
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none text-lg placeholder-gray-400 text-black font-medium py-2"
                  placeholder="What's on your mind?"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <select
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full text-gray-700 outline-none cursor-pointer transition font-bold"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="question">❓ Q&A</option>
                  <option value="tip">💡 Tips</option>
                  <option value="news">📢 News</option>
                </select>
                <button onClick={handlePost} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-2.5 rounded-full font-bold shadow-md shadow-blue-500/30 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 active:scale-95 transition-all">
                  Post
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-5">
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-[2rem] shadow-md hover:shadow-xl border border-transparent hover:border-gray-100 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold shadow-inner">User</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700">@student</span>
                        <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {getTypeBadge(post.type)}
                  </div>
                  <p className="text-gray-800 text-lg leading-relaxed pl-12 font-medium">{post.content}</p>
                  
                  <div className="flex gap-6 mt-5 pl-12">
                    <button className="group text-gray-400 hover:text-pink-500 text-sm flex items-center gap-2 transition-colors font-bold">
                      <span className="group-hover:scale-125 transition-transform">♥</span> Like
                    </button>
                    <button className="group text-gray-400 hover:text-blue-500 text-sm flex items-center gap-2 transition-colors font-bold">
                      <span className="group-hover:scale-125 transition-transform">💬</span> Comment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Bottom Navigation (Decorative) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 py-4 pb-8 px-8 flex justify-around text-2xl text-gray-400 sm:hidden z-20">
        <button className="text-blue-600 scale-110">🏠</button>
        <button className="hover:text-gray-600 transition">🔍</button>
        <button className="hover:text-gray-600 transition">🔔</button>
        <button className="hover:text-gray-600 transition">👤</button>
      </div>
    </div>
  );
}