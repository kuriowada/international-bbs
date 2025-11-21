"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 投稿の型
type Post = {
  id: number;
  content: string;
  type: string;
  user_email?: string;
};

// 資料の型（新しく追加！）
type Material = {
  id: number;
  title: string;
  file_url: string;
  subject?: string;
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // データを入れる箱
  const [posts, setPosts] = useState<Post[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]); // 資料用

  // 入力用
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState("question");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'news', 'question', 'materials'

  // ログイン用
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // アップロード用（新しく追加！）
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // 初期化処理
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPosts();
        fetchMaterials(); // 資料も取得
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

  // データを取得
  const fetchPosts = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (data) setMaterials(data);
  };

  // ▼ ファイルアップロード機能
  const handleUpload = async () => {
    if (!uploadFile || !materialTitle) return alert("タイトルとファイルを選択してください");
    setLoading(true);

    try {
      // 1. ファイル名を決める（重複しないように時間を足す）
      const fileName = `${Date.now()}_${uploadFile.name}`;
      
      // 2. Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // 3. 画像の公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from("materials")
        .getPublicUrl(fileName);

      // 4. データベースに保存
      const { error: dbError } = await supabase.from("materials").insert([
        {
          title: materialTitle,
          file_url: publicUrl,
          subject: "general",
        },
      ]);

      if (dbError) throw dbError;

      alert("アップロード完了！");
      setMaterialTitle("");
      setUploadFile(null);
      fetchMaterials(); // リスト更新
    } catch (error: any) {
      alert("エラー: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 投稿機能
  const handlePost = async () => {
    if (!inputText) return;
    await supabase.from("posts").insert([{ content: inputText, type: selectedType }]);
    setInputText("");
    fetchPosts();
  };

  // ログイン・ログアウト
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("登録完了！ログインしてください。");
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ------------------------------------
  // ログイン画面
  // ------------------------------------
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-black">
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">ログイン</h1>
          <input className="w-full p-2 border mb-4" type="email" placeholder="メール" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full p-2 border mb-4" type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={handleLogin} className="flex-1 bg-blue-600 text-white py-2 rounded">ログイン</button>
            <button onClick={handleSignUp} className="flex-1 bg-gray-500 text-white py-2 rounded">登録</button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // メイン画面
  // ------------------------------------
  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🌏 留学生ひろば</h1>
        <button onClick={handleLogout} className="text-sm text-red-500">ログアウト</button>
      </div>

      {/* タブメニュー */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {["all", "question", "news", "materials"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold capitalize whitespace-nowrap px-4 ${
              activeTab === tab ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
            }`}
          >
            {tab === "materials" ? "📚 資料共有" : tab}
          </button>
        ))}
      </div>

      {/* ▼▼▼ 資料共有タブの場合 ▼▼▼ */}
      {activeTab === "materials" ? (
        <div>
          {/* アップロードフォーム */}
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-6">
            <h3 className="font-bold mb-2 text-yellow-800">資料をアップロード</h3>
            <input
              type="text"
              className="w-full p-2 border rounded mb-2 text-black"
              placeholder="資料のタイトル (例: N2文法ノート)"
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
            />
            <input
              type="file"
              className="w-full mb-4 text-sm text-gray-600"
              onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
            />
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full bg-yellow-600 text-white py-2 rounded font-bold"
            >
              {loading ? "アップロード中..." : "アップロードする"}
            </button>
          </div>

          {/* 資料リスト（画像表示） */}
          <div className="grid grid-cols-2 gap-4">
            {materials.map((mat) => (
              <div key={mat.id} className="border rounded overflow-hidden shadow bg-white">
                {/* 画像を表示！ */}
                <div className="h-32 bg-gray-200 overflow-hidden">
                   <img src={mat.file_url} alt={mat.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="font-bold text-sm truncate text-black">{mat.title}</p>
                  <a href={mat.file_url} target="_blank" className="text-blue-500 text-xs underline">
                    ダウンロード
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ▼▼▼ 通常の掲示板タブの場合 ▼▼▼ */
        <div>
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded text-black"
              placeholder="投稿する..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button onClick={handlePost} className="bg-blue-600 text-white px-4 rounded font-bold">送信</button>
          </div>
          <div className="space-y-4">
            {posts
              .filter(p => activeTab === "all" || p.type === activeTab)
              .map((post) => (
              <div key={post.id} className="border p-4 rounded shadow-sm bg-white text-black">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded mr-2">{post.type}</span>
                <span className="text-lg">{post.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}