// @ts-nocheck
// このファイルは、Tailwindの設定エラーを避けるため、標準CSSクラスを使用しています。

"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- Configuration ---
const GRADE_OPTIONS = ['Year 12', 'Year 11', 'Year 10'];
const SUBJECT_OPTIONS = ['Math', 'English']; 
const LANGUAGE_OPTIONS = ['Japanese', 'Vietnamese', 'English', 'Chinese'];

// チュートリアルコンテンツ
const tutorialContent = [
    { id: "all", label: "Home", icon: "🏠", description: "View all activities." },
    { id: "question", label: "Q&A", icon: "❓", description: "Ask questions." },
    { id: "tip", label: "Tips", icon: "💡", description: "Share helpful tips." }, 
    { id: "news", label: "News", icon: "📢", description: "Admin announcements." },
    { id: "materials", label: "Materials", icon: "📚", description: "Share notes." },
];

// --- Type Definitions ---
type Comment = { id: string; content: string; user_id: string; created_at: string; };
type Post = { id: number; content: string; type: string; user_email?: string; created_at: string; likes_count: number; has_liked: boolean; comments: Comment[]; };
type Material = { id: number; title: string; file_url: string; subject?: string; grade?: string; unit?: string; description?: string; language?: string; };

// SelectInput Props
interface SelectInputProps { value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; placeholder: string; }


// GuidedTourModal
const GuidedTourModal: React.FC<{ 
    currentStep: number; onNext: () => void; onBack: () => void;
    onClose: () => void; onSetTab: (tabId: string) => void; totalSteps: number; 
}> = ({ currentStep, onNext, onBack, onClose, onSetTab, totalSteps }) => {
    if (currentStep < 0) return null;
    const stepData = tutorialContent[currentStep];
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;
    useEffect(() => { if (currentStep >= 0) onSetTab(stepData.id); }, [currentStep, stepData.id, onSetTab]);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>🎓 Tutorial Step {currentStep + 1}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
                </div>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#1f2937' }}>
                        <span style={{ fontSize: '1.5rem' }}>{stepData.icon}</span> {stepData.label}
                    </h3>
                    <p style={{ color: '#4b5563', marginTop: '8px', lineHeight: '1.5' }}>{stepData.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={onBack} disabled={isFirstStep} style={{ padding: '8px 16px', borderRadius: '8px', background: '#e5e7eb', border: 'none', cursor: isFirstStep ? 'default' : 'pointer', opacity: isFirstStep ? 0.5 : 1 }}>Back</button>
                    <button onClick={isLastStep ? onClose : onNext} style={{ padding: '8px 16px', borderRadius: '8px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{isLastStep ? 'Finish' : 'Next'}</button>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [userRole, setUserRole] = useState('student'); 
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
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

  const [showCommentInput, setShowCommentInput] = useState({}); 
  const [commentInputs, setCommentInputs] = useState({}); 

  const fetchUserRole = async () => {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (data?.role) setUserRole(data.role);
    else await supabase.from("users").insert({ id: user.id, role: 'student' });
  };
  
  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user ? user.id : '00000000-0000-0000-0000-000000000000'; 
    const { data: posts, error } = await supabase.from('posts').select(`*, likes_count:likes(count), user_has_liked:likes(count).eq('user_id', '${currentUserId}'), comments (id, content, created_at, user_id)`).order('created_at', { ascending: false });
    if (error) { console.error("Error:", error); return; }
    const formattedPosts = posts?.map((post) => ({ ...post, likes_count: post.likes_count?.[0]?.count || 0, has_liked: post.user_has_liked?.[0]?.count > 0, comments: post.comments || [] })); 
    if (formattedPosts) setPosts(formattedPosts);
  };
  
  const fetchMaterials = async () => {
    let query = supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (filterLanguage) query = query.eq('language', filterLanguage);
    if (filterGrade) query = query.eq('grade', filterGrade);
    if (filterSubject) query = query.eq('subject', filterSubject);
    const { data } = await query;
    if (data) setMaterials(data);
  };
  
  useEffect(() => { if (activeTab === 'materials') fetchMaterials(); }, [filterLanguage, filterGrade, filterSubject, activeTab]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) { fetchPosts(); fetchMaterials(); fetchUserRole(); } });
  }, []);

  const handleGoogleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://globalcampsstpaul.com' } }); };
  const handleLikeToggle = async (postId) => { 
      if (loading || !session?.user.id) { return alert("Login required"); } setLoading(true);
      try { await supabase.rpc('toggle_like', { post_id_input: postId, user_id_input: session.user.id }); fetchPosts(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleCommentSubmit = async (postId) => {
      if (!commentInputs[postId] || loading) return; setLoading(true);
      await supabase.from("comments").insert([{ post_id: postId, user_id: session.user.id, content: commentInputs[postId] }]);
      setCommentInputs(prev => ({ ...prev, [postId]: '' })); fetchPosts(); setLoading(false);
  };
  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("Fill fields"); setLoading(true);
    const fileName = `${Date.now()}_${uploadFile.name}`;
    await supabase.storage.from("materials").upload(fileName, uploadFile);
    const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(fileName);
    await supabase.from("materials").insert([{ title: materialTitle, file_url: publicUrl, subject: materialSubject, grade: materialGrade, unit: materialUnit, description: materialDescription, language: uploadLanguage }]);
    alert("Uploaded!"); setMaterialTitle(""); setUploadFile(null); fetchMaterials(); setLoading(false);
  };
  const handleDeleteMaterial = async (id, url) => { if(confirm("Delete?")) { await supabase.from("materials").delete().eq("id", id); fetchMaterials(); }};
  const handlePost = async () => { if (!inputText) return; await supabase.from("posts").insert([{ content: inputText, type: selectedType, user_email: session.user.email }]); setInputText(""); fetchPosts(); };
  const handleDeletePost = async (id) => { if(confirm("Delete?")) { await supabase.from("posts").delete().eq("id", id); fetchPosts(); }};
  const handleLogin = async () => { await supabase.auth.signInWithPassword({ email, password }); };
  const handleSignUp = async () => { await supabase.auth.signUp({ email, password }); };
  const handleLogout = async () => { await supabase.auth.signOut(); };

  const getTypeBadge = (type) => {
    const baseStyle = { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: 'white' };
    switch (type) {
      case "question": return <span style={{ ...baseStyle, background: '#10b981' }}>Q&A</span>;
      case "news": return <span style={{ ...baseStyle, background: '#ef4444' }}>News</span>;
      case "tip": return <span style={{ ...baseStyle, background: '#f59e0b' }}>Tips</span>;
      default: return <span style={{ ...baseStyle, background: '#9ca3af' }}>Other</span>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', color: '#1f2937' }}>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: 'white', borderBottom: '1px solid #e5e7eb', zIndex: 50, justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#2563eb', fontWeight: 'bold' }}>GC</h1>
          <button onClick={() => setCurrentTourStep(0)} style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', border: 'none' }}>🎓 Tutorial</button>
      </div>

      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', gap: '24px', paddingTop: '20px' }}>
        {/* PC Sidebar */}
        <nav className="sidebar" style={{ width: '250px', position: 'sticky', top: '20px', height: 'fit-content' }}>
          <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', marginBottom: '24px' }}>GC</h1>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tutorialContent.map((item) => (
                <li key={item.id} className="nav-item" style={{ marginBottom: '4px' }}>
                  <button onClick={() => setActiveTab(item.id)} className={activeTab === item.id ? 'active' : ''} style={{ width: '100%', textAlign: 'left', padding: '12px', background: activeTab === item.id ? '#eff6ff' : 'transparent', color: activeTab === item.id ? '#2563eb' : '#4b5563', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.icon} {item.label}
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '12px', marginTop: '16px', background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>Log Out</button>
          </div>
        </nav>

        {/* Main Feed */}
        <main className="main-content" style={{ flex: 1 }}>
          {activeTab === "materials" ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Filter Materials</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <SelectInput value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} options={LANGUAGE_OPTIONS} placeholder="All Languages"/>
                      <SelectInput value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} options={GRADE_OPTIONS} placeholder="All Grades"/>
                      <SelectInput value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} options={SUBJECT_OPTIONS} placeholder="All Subjects"/>
                  </div>
              </div>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Upload Material</h2>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} placeholder="Title" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                         <SelectInput value={uploadLanguage} onChange={(e) => setUploadLanguage(e.target.value)} options={LANGUAGE_OPTIONS} placeholder="Select Language"/>
                         <SelectInput value={materialGrade} onChange={(e) => setMaterialGrade(e.target.value)} options={GRADE_OPTIONS} placeholder="Select Grade"/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                         <SelectInput value={materialSubject} onChange={(e) => setMaterialSubject(e.target.value)} options={SUBJECT_OPTIONS} placeholder="Select Subject"/>
                         <input type="text" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} placeholder="Unit/Topic" value={materialUnit} onChange={(e) => setMaterialUnit(e.target.value)} />
                    </div>
                    <textarea style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', height: '80px', resize: 'none' }} placeholder="Description" value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} />
                    <div style={{ paddingTop: '8px' }}>
                        <input type="file" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={loading} style={{ height: '60px', width: '100px', background: '#eab308', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Upload</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {materials.map((mat) => (
                  <div key={mat.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ height: '120px', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: '40px' }}>📄</span>
                      <a href={mat.file_url} target="_blank" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold', textDecoration: 'none' }} className="hover:opacity-100">Open</a>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mat.title}</h3>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>{mat.grade} / {mat.subject}</p>
                      {userRole === 'admin' && <button onClick={() => handleDeleteMaterial(mat.id, mat.file_url)} style={{ marginTop: '8px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}>Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e5e7eb' }}></div>
                  <div style={{ flex: 1 }}>
                    <textarea style={{ width: '100%', border: 'none', outline: 'none', fontSize: '16px', resize: 'none', height: '60px' }} placeholder="What's happening?" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                      <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb' }} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        <option value="question">❓ Q&A</option>
                        {userRole === 'admin' ? <option value="news">📢 News</option> : <option value="news" disabled>📢 News (Admin Only)</option>}
                        <option value="tip">💡 Tips</option>
                      </select>
                      <button onClick={handlePost} style={{ background: '#2563eb', color: 'white', padding: '8px 24px', borderRadius: '9999px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Post</button>
                    </div>
                  </div>
                </div>
              </div>
              {posts.filter(p => activeTab === "all" || p.type === activeTab).map((post) => (
                <div key={post.id} className="post-card card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb' }}></div>
                        <div><p style={{ fontWeight: 'bold', fontSize: '14px' }}>Student User</p><p style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(post.created_at).toLocaleDateString()}</p></div>
                      </div>
                      {getTypeBadge(post.type)}
                    </div>
                    <p style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '16px', paddingLeft: '52px' }}>{post.content}</p>
                    <div className="post-actions" style={{ paddingLeft: '52px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                      <button onClick={() => handleLikeToggle(post.id)} className={`action-btn ${post.has_liked ? 'liked' : ''}`} style={{ color: post.has_liked ? '#ef4444' : '#6b7280' }}>
                          <span>{post.has_liked ? '❤️' : '🤍'}</span> Like ({post.likes_count})
                      </button>
                      <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: !prev[post.id] }))} className="action-btn">
                          <span>💬</span> Comment ({post.comments.length})
                      </button>
                      {userRole === 'admin' && <button onClick={() => handleDeletePost(post.id)} style={{ marginLeft: 'auto', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>}
                    </div>
                    
                    {showCommentInput[post.id] && (
                        <div style={{ marginTop: '16px', paddingLeft: '52px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                {post.comments.length > 0 ? (
                                    post.comments.map(comment => (
                                        <div key={comment.id} style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
                                            <p style={{ margin: 0, color: '#1f2937' }}>{comment.content}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#9ca3af' }}>{new Date(comment.created_at).toLocaleString()}</p>
                                        </div>
                                    ))
                                ) : (<p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No comments yet.</p>)}
                            </div>
                            <textarea style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', resize: 'none', minHeight: '60px' }} placeholder="Comment..." value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button onClick={() => setShowCommentInput(prev => ({ ...prev, [post.id]: false }))} style={{ padding: '4px 12px', borderRadius: '9999px', border: 'none', background: '#e5e7eb', color: '#4b5563', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
                                <button onClick={() => handleCommentSubmit(post.id)} disabled={loading || !commentInputs[post.id]} style={{ padding: '4px 12px', borderRadius: '9999px', border: 'none', background: '#2563eb', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
                            </div>
                        </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </main>
        <aside className="hidden xl:block w-80 sticky top-8 shrink-0">
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '16px' }}>Your Profile</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(to top right, #4ade80, #3b82f6)' }}></div><div><p style={{ fontSize: '18px', fontWeight: 'bold' }}>You ({userRole})</p><p style={{ fontSize: '12px', color: '#6b7280' }}>{session?.user.email || email}</p></div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', background: '#f9fafb', padding: '12px', borderRadius: '12px' }}><div><p style={{ fontSize: '18px', fontWeight: 'bold' }}>12</p><p style={{ fontSize: '12px', color: '#9ca3af' }}>Posts</p></div><div><p style={{ fontSize: '18px', fontWeight: 'bold' }}>45</p><p style={{ fontSize: '12px', color: '#9ca3af' }}>Likes</p></div><div><p style={{ fontSize: '18px', fontWeight: 'bold' }}>3</p><p style={{ fontSize: '12px', color: '#9ca3af' }}>Files</p></div></div>
          </div>
          <div style={{ background: 'linear-gradient(to bottom right, #4f46e5, #7e22ce)', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>✨ Welcome!</h3>
            <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6', marginBottom: '16px' }}>This is the desktop version of Global Campus. Use the left menu to navigate.</p>
            <button onClick={startTour} style={{ width: '100%', background: 'white', color: '#4f46e5', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer' }}>Learn More (Tutorial)</button>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden" style={{ position: 'fixed', bottom: 0, width: '100%', background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 50 }}>
          {tutorialContent.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ background: 'none', border: 'none', fontSize: '24px', color: activeTab === item.id ? '#2563eb' : '#9ca3af' }}>
                  {item.icon}
              </button>
          ))}
      </div>
      
      <GuidedTourModal currentStep={currentTourStep} onNext={nextStep} onBack={backStep} onClose={endTour} onSetTab={setActiveTab} totalSteps={totalTourSteps} />
    </div>
  );
}