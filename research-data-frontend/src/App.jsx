import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * 优化版 - 更大气美观的设计
 */

/********************** 主题 & 工具 *************************/
const THEME = {
  primary: "#0c4a6e",     // 深蓝 - 主色
  secondary: "#0369a1",   // 中蓝
  accent: "#0891b2",      // 青色强调
  light: "#e0f2fe",       // 浅蓝背景
  text:   "#1e293b",      // 深灰文字
  sub:    "#64748b",      // 次要文字
  card:   "#ffffff",
  bg:     "#f8fafc",
  border: "#e2e8f0",
  gold:   "#d97706",      // 金色强调
  gradientPrimary: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)",
  gradientGold: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
};

function resolveApiBase() {
  // 优先使用运行时配置
  if (typeof window !== "undefined" && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  
  // 生产环境使用实际的 API 地址
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    // 如果是通过域名访问，使用相同的域名但端口8000
    // 例如：https://app.cjznjcsys.xin -> https://api.cjznjcsys.xin
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // 如果你的 API 和前端在同一个域名下
    return "https://api.cjznjcsys.xin";
    
    // 如果你的 API 有独立域名，取消下面这行的注释并修改
    // return "https://api.cjznjcsys.xin";
  }
  
  // 开发环境默认使用本地
  return "http://127.0.0.1:8000";
}
const API = resolveApiBase();
const CHUNK_SIZE = 8 * 1024 * 1024;

async function apiJson(path, options = {}) {
  const headers = {
    ...options.headers,
  };
  
  // 从内存中获取 token（如果有的话）
  if (window.__AUTH_TOKEN__) {
    headers['Authorization'] = `Bearer ${window.__AUTH_TOKEN__}`;
  }
  
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) throw new Error(`${options?.method || 'GET'} ${path} -> ${res.status}`);
  return res.json();
}

function prettyBytes(n) {
  if (n == null) return "-"; 
  const u=["B","KB","MB","GB","TB"]; 
  let i=0, v=n; 
  while(v>=1024 && i<u.length-1){v/=1024;i++;} 
  return `${v.toFixed(2)} ${u[i]}`;
}

/********************** 顶栏与导航 *************************/
const NAVS = [
  { key: "home",  label: "首页" },
  { key: "data",  label: "数据中心" },
  { key: "learn", label: "学习中心" },
  { key: "code",  label: "程序中心" },
  { key: "survey",label: "问卷中心" },
  { key: "mydata",label: "我的数据" },
];

function TopBar({ active, onNav, onLoginClick, authedUser, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logoSrc = (typeof window !== 'undefined' && window.__LOGO_URL__) || '/logo.png';
  
  return (
    <header style={{
      background: scrolled ? 'rgba(255, 255, 255, 0.98)' : '#ffffff',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      borderBottom: `1px solid ${THEME.border}`,
      position: 'sticky', 
      top: 0, 
      zIndex: 20,
      transition: 'all 0.3s ease',
      boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.04)' : 'none',
    }}>
      <div style={{ 
        maxWidth: '100%', 
        margin: '0 auto', 
        padding: '14px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        {/* 左侧：Logo + 实验室名称 */}
        <div style={{ display:'flex', alignItems:'center', gap:16, flex: 1 }}>
          <div style={{
            width: 56, 
            height: 56, 
            borderRadius: 8, 
            background: THEME.gradientPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(12, 74, 110, 0.2)',
            transition: 'transform 0.3s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => onNav('home')}
          >
            <img src={logoSrc} alt="logo" style={{ width: 44, height: 44, borderRadius: 6, objectFit:'cover' }} />
          </div>
          
          <div style={{ cursor: 'pointer' }} onClick={() => onNav('home')}>
            <div style={{ 
              fontWeight: 700, 
              fontSize: 22,
              letterSpacing: 0.5,
              color: THEME.primary,
              fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
              lineHeight: 1.3,
            }}>
              长江三峡数字化管理与智能决策实验室
            </div>
            <div style={{ 
              fontSize: 11, 
              color: THEME.sub, 
              marginTop: 2,
              letterSpacing: 1,
              fontFamily: "'Arial', sans-serif",
              textTransform: 'uppercase',
            }}>
              Digital Management & Intelligent Decision Lab
            </div>
          </div>
        </div>
        
        {/* 右侧：导航菜单 + 用户信息 */}
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAVS.map(n => (
            <button 
              key={n.key} 
              onClick={() => onNav(n.key)} 
              style={{
                padding: '10px 20px',
                border: 'none',
                background: active===n.key ? THEME.light : 'transparent',
                cursor: 'pointer',
                color: active===n.key ? THEME.primary : THEME.text,
                borderRadius: 8,
                fontWeight: active===n.key ? 600 : 500,
                fontSize: 15,
                transition: 'all 0.2s ease',
                position: 'relative',
                fontFamily: "'Microsoft YaHei', sans-serif",
              }}
              onMouseEnter={e => {
                if (active !== n.key) {
                  e.currentTarget.style.background = 'rgba(12, 74, 110, 0.05)';
                  e.currentTarget.style.color = THEME.primary;
                }
              }}
              onMouseLeave={e => {
                if (active !== n.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = THEME.text;
                }
              }}
            >
              {n.label}
              {active === n.key && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 3,
                  background: THEME.primary,
                  borderRadius: 999,
                }}/>
              )}
            </button>
          ))}
          
          <div style={{ width: 1, height: 24, background: THEME.border, margin: '0 8px' }}/>
          
          {authedUser ? (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ 
                padding: '8px 16px', 
                background: THEME.light,
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
              }}>
                <span style={{ fontSize:14, color:THEME.primary, fontWeight: 500 }}>
                  👤 {authedUser}
                </span>
              </div>
              <button 
                onClick={onLogout} 
                style={{ 
                  padding:'9px 18px', 
                  borderRadius:8, 
                  border:`1px solid ${THEME.border}`, 
                  background:'#fff', 
                  cursor:'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                  color: THEME.text,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = THEME.primary;
                  e.currentTarget.style.color = THEME.primary;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = THEME.border;
                  e.currentTarget.style.color = THEME.text;
                }}
              >
                退出
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick} 
              style={{ 
                padding:'10px 24px', 
                border:'none', 
                borderRadius:8, 
                cursor:'pointer', 
                color:'#fff', 
                background: THEME.gradientPrimary,
                boxShadow:'0 2px 8px rgba(12, 74, 110, 0.25)',
                fontWeight: 600,
                fontSize: 15,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(12, 74, 110, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(12, 74, 110, 0.25)';
              }}
            >
              登录
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/********************** 认证 *************************/
function useAuth() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState("");

  async function login(username, password) {
    const res = await apiJson("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const tk = res?.token || ""; 
    const u = res?.user || username;
    setToken(tk); 
    setUser(u);
    // 保存到全局变量供 API 调用使用
    window.__AUTH_TOKEN__ = tk;
    return res;
  }
  
  function logout(){ 
    setToken(""); 
    setUser(""); 
    window.__AUTH_TOKEN__ = "";
  }

  return { token, user, login, logout, authed: !!token };
}

/********************** 分片上传核心 *************************/
async function initUpload(filename, datasetId, version) {
  return apiJson(`/uploads/init?filename=${encodeURIComponent(filename)}&dataset_id=${datasetId}&version=${encodeURIComponent(version)}`, { method: "POST" });
}

async function getPartUrl(key, uploadId, partNumber) {
  return apiJson(`/uploads/part-url?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`);
}

async function completeUpload(key, uploadId, parts) {
  return apiJson(`/uploads/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, uploadId, parts }) });
}

async function uploadBlobToSignedUrl(url, blob){
  const r = await fetch(url, { method: "PUT", body: blob });
  if (!r.ok) throw new Error(`PUT part failed: ${r.status}`);
  const raw = r.headers.get("ETag") || r.headers.get("etag") || "";
  return (raw||"").replaceAll('"', "");
}

async function uploadFileViaMultipart({ file, prefix, datasetId, version, onPart, onStatus }){
  const filename = `${prefix}__${file.name}`;
  onStatus?.(`init ${file.name}`);
  const { key, uploadId } = await initUpload(filename, datasetId, version);
  const parts = [];
  const partCount = Math.ceil(file.size / CHUNK_SIZE) || 1;
  for(let partNumber=1; partNumber<=partCount; partNumber++){
    const start = (partNumber-1)*CHUNK_SIZE; 
    const end = Math.min(start+CHUNK_SIZE, file.size);
    const blob = file.slice(start,end);
    onStatus?.(`part-url ${partNumber}/${partCount}`);
    const { url } = await getPartUrl(key, uploadId, partNumber);
    const etag = await uploadBlobToSignedUrl(url, blob);
    parts.push({ ETag: etag, PartNumber: partNumber });
    onPart?.(partNumber, partCount, blob.size);
  }
  onStatus?.("complete");
  await completeUpload(key, uploadId, parts);
  return { key, name: file.name, size: file.size, etag: parts.at(-1)?.ETag || "" };
}

/********************** 首页 *************************/
function HomePage({ onEnterData, onEnterLearn }){
  const images = [
    (typeof window !== 'undefined' && window.__HERO_1__) || '/hero1.jpg',
    (typeof window !== 'undefined' && window.__HERO_2__) || '/hero2.jpg',
    (typeof window !== 'undefined' && window.__HERO_3__) || '/hero3.jpg',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=> setIdx(i=> (i+1)%images.length), 4000);
    return ()=> clearInterval(t);
  },[images.length]);

  const stats = [
    { k: '数据集', v: '28+', icon: '📊', color: THEME.gradientPrimary },
    { k: '累计文件', v: '120K+', icon: '📁', color: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' },
    { k: '容量', v: '3.4 TB', icon: '💾', color: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' },
    { k: '访问用户', v: '60+', icon: '👥', color: THEME.gradientGold },
  ];

  return (
    <div>
      <section style={{ position:'relative', overflow:'hidden', marginBottom: 48 }}>
        <div style={{ height: 480, background:'#000', position: 'relative' }}>
          {images.map((src,i)=> (
            <img key={i} src={src} alt={`hero-${i}`} style={{
              position:'absolute', inset:0, width:'100%', height:480, objectFit:'cover',
              opacity: i===idx? 1 : 0, transition:'opacity 1s ease', filter:'brightness(.75)'
            }} />
          ))}
          
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)',
          }} />
          
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#fff',
            zIndex: 1,
            width: '100%',
            maxWidth: 800,
            padding: '0 24px',
          }}>
            <h1 style={{
              fontSize: 48,
              fontWeight: 800,
              margin: 0,
              marginBottom: 16,
              textShadow: '0 4px 24px rgba(0,0,0,0.5)',
              letterSpacing: 1,
            }}>长江三峡数字化实验室</h1>
            <p style={{
              fontSize: 20,
              margin: 0,
              opacity: 0.95,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}>数据驱动决策 · 智能引领未来</p>
          </div>
          
          <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', display:'flex', gap:10, zIndex: 2 }}>
            {images.map((_,i)=> (
              <span key={i} onClick={()=> setIdx(i)} style={{ 
                width:12, 
                height:12, 
                borderRadius:999, 
                background: i===idx? '#fff' : 'rgba(255,255,255,.4)', 
                cursor:'pointer',
                transition: 'all 0.3s ease',
                boxShadow: i===idx ? '0 0 12px rgba(255,255,255,0.8)' : 'none',
              }} />
            ))}
          </div>
        </div>
      </section>

      <Section title="实验室概况" subtitle="Laboratory Overview">
        <div style={{ 
          color:THEME.text, 
          lineHeight:1.9, 
          fontSize: 16,
          padding: '24px 32px',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
        }}>
          本实验室围绕<strong style={{ color: THEME.brandA }}>内河航运</strong>与<strong style={{ color: THEME.brandA }}>流域管理</strong>的重大需求,聚焦数据汇聚与治理、知识组织、智能优化与决策三个方向,建设"数据中心 + 学习中心 + 应用示范"一体化平台。
          当前已形成 AIS 船舶轨迹、港口运行、气象水文等多源数据资产,并服务于船舶调度优化、绿色能源评估、库区综合管理等典型场景。
        </div>
        
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:20, marginTop:32 }}>
          {stats.map((s,i)=> (
            <div key={i} style={{ 
              background:'#fff', 
              border:`1px solid ${THEME.border}`, 
              borderRadius:12, 
              padding:'32px 24px', 
              textAlign:'center', 
              boxShadow:'0 4px 16px rgba(0,0,0,.04)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.04)';
            }}
            >
              <div style={{ fontSize: 42, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ 
                fontSize:36, 
                fontWeight:800, 
                background: s.color,
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>{s.v}</div>
              <div style={{ color:THEME.sub, marginTop:8, fontWeight: 500, fontSize: 15 }}>{s.k}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="快捷入口" subtitle="Quick Access">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:20 }}>
          <QuickCard 
            title="数据中心" 
            desc="上传科研数据与附件,自动生成元数据" 
            icon="📊"
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            onClick={onEnterData} 
          />
          <QuickCard 
            title="学习中心" 
            desc="分析教程、Handbook 与工具指引" 
            icon="📚"
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            onClick={onEnterLearn} 
          />
          <QuickCard 
            title="程序中心" 
            desc="上传学生代码/软件,支持文件夹级上传" 
            icon="💻"
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            onClick={()=>window.alert('在上方导航进入"程序中心"')} 
          />
          <QuickCard 
            title="问卷中心" 
            desc="上传项目问卷与调查表,集中存档管理" 
            icon="📋"
            gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            onClick={()=>window.alert('在上方导航进入"问卷中心"')} 
          />
        </div>
      </Section>
    </div>
  );
}

function QuickCard({ title, desc, onClick, icon, gradient }){
  return (
    <div onClick={onClick} style={{ 
      cursor:'pointer', 
      padding: 32, 
      background:'#fff', 
      border:`1px solid ${THEME.border}`, 
      borderRadius:20, 
      boxShadow:'0 8px 32px rgba(59,130,246,.08)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform='translateY(-8px)';
      e.currentTarget.style.boxShadow='0 16px 48px rgba(59,130,246,.15)';
    }} 
    onMouseLeave={e => {
      e.currentTarget.style.transform='translateY(0)';
      e.currentTarget.style.boxShadow='0 8px 32px rgba(59,130,246,.08)';
    }}>
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 120,
        height: 120,
        background: gradient,
        borderRadius: '50%',
        opacity: 0.1,
        filter: 'blur(40px)',
      }} />
      
      <div style={{ fontSize: 48, marginBottom: 16, position: 'relative' }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize: 20, color:THEME.text, marginBottom: 12, position: 'relative' }}>{title}</div>
      <div style={{ color:THEME.sub, lineHeight: 1.6, position: 'relative' }}>{desc}</div>
    </div>
  );
}

/********************** 通用 UI 组件 *************************/
function Section({ title, subtitle, children }){
  return (
    <section style={{ maxWidth: 1400, margin: "32px auto 48px", padding:"0 32px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: 32, 
          fontWeight: 700, 
          color: THEME.primary,
          marginBottom: 8,
          fontFamily: "'Microsoft YaHei', sans-serif",
        }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, color: THEME.sub, fontSize: 15 }}>{subtitle}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function L({ label, children }){ 
  return (
    <label style={{ display:'grid', gap:8 }}>
      <span style={{ fontWeight: 600, color: THEME.text }}>{label}</span>
      {children}
    </label>
  ); 
}

function Progress({ status, progress }){
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ 
        height: 12, 
        background: "#e2e8f0", 
        borderRadius: 999, 
        overflow: "hidden",
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ 
          width: `${progress}%`, 
          height: "100%", 
          background: THEME.gradientBlue,
          transition: "width .3s ease",
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
        }} />
      </div>
      <div style={{ marginTop: 10, fontSize: 14, color: THEME.text, fontWeight: 500 }}>
        状态: {status} ({progress}%)
      </div>
    </div>
  );
}

function Logs({ logs }){ 
  return (
    <textarea 
      readOnly 
      rows={10} 
      value={logs.join("\n")} 
      style={{ 
        width:'100%', 
        marginTop:16, 
        fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas', 
        fontSize:13, 
        border:`1px solid ${THEME.border}`, 
        borderRadius:12, 
        padding:16,
        background: '#f8fafc',
        color: THEME.text,
      }} 
    />
  ); 
}

const inputStyle = { 
  height:44, 
  padding:"0 16px", 
  background:'#fff', 
  border:`2px solid ${THEME.border}`, 
  borderRadius:12, 
  outline:"none",
  fontSize: 15,
  transition: 'all 0.2s ease',
};

const textareaStyle = { 
  padding:16, 
  background:'#fff', 
  border:`2px solid ${THEME.border}`, 
  borderRadius:12, 
  outline:"none",
  fontSize: 15,
  lineHeight: 1.6,
  transition: 'all 0.2s ease',
};

const primaryBtn = { 
  padding:"12px 28px", 
  background: THEME.gradientPrimary,
  color:"#fff", 
  border:"none", 
  borderRadius:8, 
  cursor:"pointer", 
  boxShadow:'0 2px 8px rgba(12, 74, 110, 0.25)',
  fontWeight: 600,
  fontSize: 15,
  transition: 'all 0.3s ease',
  fontFamily: "'Microsoft YaHei', sans-serif",
};

const secondaryBtn = { 
  padding:"10px 20px", 
  background: THEME.secondary,
  color:"#fff", 
  border:"none", 
  borderRadius:8, 
  cursor:"pointer",
  fontWeight: 500,
  fontSize: 14,
  transition: 'all 0.2s ease',
  fontFamily: "'Microsoft YaHei', sans-serif",
};

const dangerBtn = { 
  padding:"10px 20px", 
  background:"#dc2626", 
  color:"#fff", 
  border:"none", 
  borderRadius:8, 
  cursor:"pointer",
  fontWeight: 500,
  fontSize: 14,
  transition: 'all 0.2s ease',
  fontFamily: "'Microsoft YaHei', sans-serif",
};

const card = { 
  background:'#fff', 
  border:`1px solid ${THEME.border}`, 
  borderRadius:12, 
  padding:24, 
  boxShadow:'0 4px 16px rgba(0,0,0,.04)',
};

const badge = { 
  fontSize:12, 
  padding:'4px 12px', 
  background: THEME.light,
  borderRadius:6, 
  color: THEME.primary,
  fontWeight: 500,
  border: `1px solid ${THEME.border}`,
};

const pre = { 
  background:'#f8fafc', 
  border:`1px solid ${THEME.border}`, 
  padding:12, 
  borderRadius:12, 
  fontSize:13,
  overflow: 'auto',
};

/********************** 页面:数据中心 *************************/
function DataCenter({ authedUser }){
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploader, setUploader] = useState(authedUser||"");
  const [datasetId, setDatasetId] = useState(1);
  const [version, setVersion] = useState("v1");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const totalRef = useRef(0);
  const doneRef = useRef(0);

  function pushLog(s){ setLogs(prev=>[s,...prev].slice(0,200)); }

  const prefix = useMemo(()=>{
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = (title.trim()||"untitled").replace(/[^\w\-\u4e00-\u9fa5]+/g,"_").slice(0,60);
    return `${datasetId}/${version}/${stamp}_${safe}`;
  },[title,datasetId,version]);

  async function handleSubmit(e){
    e.preventDefault();
    if(!title.trim()) return alert("请填写标题");
    if(!uploader.trim()) return alert("请填写上传者");
    if(!files.length) return alert("请选择附件");

    totalRef.current = files.reduce((s,f)=>s+f.size,0);
    doneRef.current = 0; 
    setProgress(0); 
    setLogs([]); 
    setStatus("开始上传");

    const uploaded = [];
    try{
      for(let i=0;i<files.length;i++){
        const f = files[i]; 
        pushLog(`start ${f.name}`);
        const r = await uploadFileViaMultipart({ 
          file:f, 
          prefix, 
          datasetId, 
          version, 
          onPart:(n,c,sz)=>{
            doneRef.current += sz; 
            setProgress(Math.round(doneRef.current*100/Math.max(1,totalRef.current))); 
            pushLog(`part ${n}/${c} ${f.name}`);
          }, 
          onStatus:setStatus 
        });
        uploaded.push(r);
      }
      const meta = { 
        site:"长江三峡实验室数据中心", 
        title:title.trim(), 
        content:content.trim(), 
        uploader:uploader.trim(), 
        datasetId, 
        version, 
        createdAt:new Date().toISOString(), 
        files:uploaded 
      };
      const blob = new Blob([JSON.stringify(meta,null,2)], { type:"application/json" });
      const metaFile = new File([blob], `metadata.json`, { type:"application/json" });
      await uploadFileViaMultipart({ 
        file: metaFile, 
        prefix, 
        datasetId, 
        version, 
        onPart:(n,c,sz)=>{ 
          doneRef.current += sz; 
          setProgress(Math.round(doneRef.current*100/Math.max(1,totalRef.current))); 
        }, 
        onStatus:setStatus 
      });
      setStatus("完成"); 
      pushLog("全部完成");
      alert("上传成功!");
    }catch(err){ 
      console.error(err); 
      setStatus(`失败: ${err.message||err}`); 
      alert(`失败: ${err.message||err}`); 
    }
  }

  return (
    <Section title="数据中心" subtitle="Data Center">
      <p style={{ color: THEME.sub, marginTop: 4, fontSize: 15 }}>上传科研数据与附件,自动生成元数据 JSON 写入 MinIO。只有登录用户可见。</p>
      <form onSubmit={handleSubmit} style={{ display:"grid", gap:16, marginTop: 20 }}>
        <L label="标题 *">
          <input 
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
            placeholder="如: AIS-三峡-2021Q1" 
            style={inputStyle} 
            required
          />
        </L>
        <L label="内容 / 摘要">
          <textarea 
            value={content} 
            onChange={e=>setContent(e.target.value)} 
            rows={4} 
            placeholder="来源、时间范围、字段、处理过程..." 
            style={textareaStyle}
          />
        </L>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 16 }}>
          <L label="上传者 *">
            <input 
              value={uploader} 
              onChange={e=>setUploader(e.target.value)} 
              style={inputStyle} 
              required
            />
          </L>
          <L label="数据集 ID *">
            <input 
              type="number" 
              value={datasetId} 
              onChange={e=>setDatasetId(Number(e.target.value))} 
              style={inputStyle} 
              required
            />
          </L>
          <L label="版本 *">
            <input 
              value={version} 
              onChange={e=>setVersion(e.target.value)} 
              style={inputStyle} 
              required
            />
          </L>
        </div>
        <L label="选择附件(可多选) *">
          <input 
            type="file" 
            multiple 
            onChange={e=>setFiles(Array.from(e.target.files||[]))}
          />
          {!!files.length && (
            <div style={{ fontSize:13, color:THEME.sub, marginTop: 8 }}>
              已选 {files.length} 个,共 {prettyBytes(files.reduce((s,f)=>s+f.size,0))}; 对象前缀: {prefix}
            </div>
          )}
        </L>
        <button type="submit" style={primaryBtn}>开始上传</button>
      </form>

      <Progress status={status} progress={progress}/>
      <Logs logs={logs}/>
    </Section>
  );
}

/********************** 页面:学习中心 *************************/
function LearningCenter(){
  const guides = [
    { h:"分析教程: AIS 数据清洗与匹配", d:"含缺失值处理、坐标纠偏、时间聚合。", k:["Python","Pandas","Geo"] },
    { h:"软件教程: QGIS 入门", d:"基础图层、投影、矢量/栅格操作。", k:["QGIS","GIS"] },
    { h:"Handbook: 课题组数据命名规范", d:"文件/文件夹/版本/标签统一规范。", k:["规范","命名"] },
    { h:"数据处理教程: 船舶轨迹压缩", d:"Douglas-Peucker 与速度阈值结合实践。", k:["算法","压缩"] },
  ];
  
  return (
    <Section title="学习中心" subtitle="Learning Center">
      <p style={{ color: THEME.sub, fontSize: 15 }}>这里放置参考教程与 Handbook(当前为示例卡片,后续可接数据库/Markdown 渲染)。</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:20, marginTop: 24 }}>
        {guides.map((g,i)=>(
          <div key={i} style={{
            ...card,
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,.12)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,.08)';
          }}
          >
            <div style={{ fontWeight:700, fontSize: 18, marginBottom: 12 }}>{g.h}</div>
            <div style={{ fontSize:14, color:THEME.sub, margin:"8px 0 16px", lineHeight: 1.6 }}>{g.d}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {g.k.map((t,j)=>(<span key={j} style={badge}>{t}</span>))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/********************** 页面:程序中心 *************************/
function CodeCenter(){
  const [datasetId, setDatasetId] = useState(100);
  const [version, setVersion] = useState("v1");
  const [rootTitle, setRootTitle] = useState("student-code");
  const [fileList, setFileList] = useState([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const totalRef = useRef(0); 
  const doneRef = useRef(0);

  function pushLog(s){ setLogs(prev=>[s,...prev].slice(0,200)); }

  function onPickDirectory(e){
    const files = Array.from(e.target.files||[]);
    setFileList(files);
  }

  async function onUploadAll(e){
    e.preventDefault();
    if(!fileList.length) return alert("请选择文件夹");
    totalRef.current = fileList.reduce((s,f)=>s+f.size,0); 
    doneRef.current=0; 
    setProgress(0); 
    setStatus("开始上传"); 
    setLogs([]);

    const stamp = new Date().toISOString().replace(/[:.]/g,"-");
    const prefixBase = `${datasetId}/${version}/${stamp}_${rootTitle.replace(/[^\w\-\u4e00-\u9fa5]+/g,"_")}`;
    try{
      for(let i=0;i<fileList.length;i++){
        const f = fileList[i];
        const rel = f.webkitRelativePath?.split("/").slice(1).join("__") || f.name;
        const filename = `${prefixBase}__${rel}`;
        const fileAs = new File([f], filename, { type: f.type });
        const r = await uploadFileViaMultipart({ 
          file:fileAs, 
          prefix:"", 
          datasetId, 
          version, 
          onPart:(n,c,sz)=>{ 
            doneRef.current+=sz; 
            setProgress(Math.round(doneRef.current*100/Math.max(1,totalRef.current))); 
          }, 
          onStatus:setStatus 
        });
        pushLog(`OK ${rel} -> ${r.key}`);
      }
      setStatus("全部完成"); 
      alert("文件夹上传完成");
    }catch(err){ 
      console.error(err); 
      setStatus(`失败: ${err.message||err}`); 
      alert(`失败: ${err.message||err}`); 
    }
  }

  return (
    <Section title="程序中心" subtitle="Code Center">
      <p style={{ color:THEME.sub, fontSize: 15 }}>用于学生上传代码/软件等,一次性选择文件夹。</p>
      <form onSubmit={onUploadAll} style={{ display:'grid', gap:16, marginTop: 20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          <L label="数据集ID">
            <input 
              type="number" 
              value={datasetId} 
              onChange={e=>setDatasetId(Number(e.target.value))} 
              style={inputStyle}
            />
          </L>
          <L label="版本">
            <input 
              value={version} 
              onChange={e=>setVersion(e.target.value)} 
              style={inputStyle}
            />
          </L>
          <L label="根目录标识">
            <input 
              value={rootTitle} 
              onChange={e=>setRootTitle(e.target.value)} 
              style={inputStyle}
            />
          </L>
        </div>
        <L label="选择文件夹">
          <input type="file" webkitdirectory="" directory="" onChange={onPickDirectory} />
          {!!fileList.length && (
            <div style={{ fontSize:13, color:THEME.sub, marginTop: 8 }}>
              共 {fileList.length} 个文件, {prettyBytes(fileList.reduce((s,f)=>s+f.size,0))}
            </div>
          )}
        </L>
        <button type="submit" style={primaryBtn}>开始上传</button>
      </form>
      <Progress status={status} progress={progress}/>
      <Logs logs={logs}/>
    </Section>
  );
}

/********************** 页面:问卷中心 *************************/
function SurveyCenter(){
  const [datasetId, setDatasetId] = useState(200);
  const [version, setVersion] = useState("v1");
  const [uploader, setUploader] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const totalRef = useRef(0); 
  const doneRef = useRef(0);
  
  function pushLog(s){ setLogs(prev=>[s,...prev].slice(0,200)); }

  const prefix = useMemo(()=>{
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = (title.trim()||"questionnaire").replace(/[^\w\-\u4e00-\u9fa5]+/g,"_").slice(0,60);
    return `${datasetId}/${version}/${stamp}_${safe}`;
  },[title,datasetId,version]);

  async function submit(e){
    e.preventDefault();
    if(!title.trim()) return alert("请填写问卷标题");
    if(!uploader.trim()) return alert("请填写上传者");
    if(!files.length) return alert("请选择文件");

    totalRef.current = files.reduce((s,f)=>s+f.size,0); 
    doneRef.current=0; 
    setProgress(0); 
    setLogs([]); 
    setStatus("开始上传");
    
    try{
      for(const f of files){
        await uploadFileViaMultipart({ 
          file:f, 
          prefix, 
          datasetId, 
          version, 
          onPart:(n,c,sz)=>{ 
            doneRef.current+=sz; 
            setProgress(Math.round(doneRef.current*100/Math.max(1,totalRef.current))); 
          }, 
          onStatus:setStatus 
        });
      }
      const meta = { 
        title, 
        uploader, 
        datasetId, 
        version, 
        createdAt:new Date().toISOString(), 
        count: files.length 
      };
      const blob = new Blob([JSON.stringify(meta,null,2)], { type:"application/json" });
      const metaFile = new File([blob], `index.json`, { type:"application/json" });
      await uploadFileViaMultipart({ 
        file: metaFile, 
        prefix, 
        datasetId, 
        version, 
        onPart:(n,c,sz)=>{}, 
        onStatus:setStatus 
      });
      setStatus("完成"); 
      alert("问卷上传完成");
    }catch(err){ 
      console.error(err); 
      setStatus(`失败: ${err.message||err}`); 
      alert(`失败: ${err.message||err}`); 
    }
  }

  return (
    <Section title="问卷中心" subtitle="Survey Center">
      <form onSubmit={submit} style={{ display:'grid', gap:16, marginTop: 20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          <L label="问卷标题 *">
            <input 
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              style={inputStyle} 
              required
            />
          </L>
          <L label="上传者 *">
            <input 
              value={uploader} 
              onChange={e=>setUploader(e.target.value)} 
              style={inputStyle} 
              required
            />
          </L>
          <L label="版本">
            <input 
              value={version} 
              onChange={e=>setVersion(e.target.value)} 
              style={inputStyle}
            />
          </L>
        </div>
        <L label="数据集ID">
          <input 
            type="number" 
            value={datasetId} 
            onChange={e=>setDatasetId(Number(e.target.value))} 
            style={inputStyle}
          />
        </L>
        <L label="问卷文件(可多选,如 PDF/CSV/DOCX) *">
          <input 
            type="file" 
            multiple 
            onChange={e=>setFiles(Array.from(e.target.files||[]))} 
          />
          {!!files.length && (
            <div style={{ fontSize:13, color:THEME.sub, marginTop: 8 }}>
              已选 {files.length} 个,共 {prettyBytes(files.reduce((s,f)=>s+f.size,0))}; 对象前缀: {prefix}
            </div>
          )}
        </L>
        <button type="submit" style={primaryBtn}>开始上传</button>
      </form>
      <Progress status={status} progress={progress}/>
      <Logs logs={logs}/>
    </Section>
  );
}

/********************** 页面:我的数据 *************************/
function MyDataPage({ authedUser }){
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  const [filter, setFilter] = useState("all"); // all, data, code, survey
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (authedUser) {
      loadMyData();
    }
  }, [authedUser]);

  async function loadMyData() {
    setLoading(true);
    try {
      // 调用真实的 API
      const res = await apiJson(`/uploads/my-data`);
      setDataList(res);
    } catch (err) {
      console.error(err);
      alert("加载数据失败: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const filteredData = dataList.filter(item => {
    const matchType = filter === "all" || item.type === filter;
    const matchSearch = !searchText || 
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.files.some(f => f.toLowerCase().includes(searchText.toLowerCase()));
    return matchType && matchSearch;
  });

  const getTypeLabel = (type) => {
    const labels = { data: "数据中心", code: "程序中心", survey: "问卷中心" };
    return labels[type] || type;
  };

  const getTypeBadgeStyle = (type) => {
    const styles = {
      data: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#fff" },
      code: { background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", color: "#fff" },
      survey: { background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", color: "#fff" },
    };
    return styles[type] || {};
  };

  return (
    <Section title="我的数据" subtitle="My Data">
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: THEME.sub, fontSize: 15, marginBottom: 20 }}>
          查看你上传的所有数据记录（仅查看，不提供下载功能）
        </p>
        
        {/* 筛选和搜索 */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: "all", label: "全部" },
              { key: "data", label: "数据中心" },
              { key: "code", label: "程序中心" },
              { key: "survey", label: "问卷中心" }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "8px 20px",
                  border: filter === f.key ? `2px solid ${THEME.brandA}` : `1px solid ${THEME.border}`,
                  background: filter === f.key ? 'rgba(59, 130, 246, 0.1)' : '#fff',
                  color: filter === f.key ? THEME.brandA : THEME.text,
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontWeight: filter === f.key ? 600 : 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <input
            type="text"
            placeholder="搜索标题或文件名..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              ...inputStyle,
              flex: 1,
              minWidth: 200,
            }}
          />
          
          <button onClick={loadMyData} style={secondaryBtn}>
            🔄 刷新
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: THEME.sub }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div>加载中...</div>
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: THEME.sub }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div>暂无数据记录</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredData.map(item => (
            <div
              key={item.id}
              style={{
                ...card,
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,.08)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{
                      ...badge,
                      ...getTypeBadgeStyle(item.type),
                      padding: '4px 12px',
                    }}>
                      {getTypeLabel(item.type)}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: THEME.text }}>
                      {item.title}
                    </h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 14, color: THEME.sub }}>
                      📁 文件数: <strong style={{ color: THEME.text }}>{item.fileCount}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: THEME.sub }}>
                      💾 总大小: <strong style={{ color: THEME.text }}>{prettyBytes(item.totalSize)}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: THEME.sub }}>
                      🆔 数据集: <strong style={{ color: THEME.text }}>{item.datasetId}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: THEME.sub }}>
                      📌 版本: <strong style={{ color: THEME.text }}>{item.version}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: THEME.sub }}>
                      🕐 上传时间: <strong style={{ color: THEME.text }}>{new Date(item.createdAt).toLocaleString('zh-CN')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 文件列表 */}
              <div style={{
                marginTop: 16,
                padding: 16,
                background: '#f8fafc',
                borderRadius: 12,
                border: `1px solid ${THEME.border}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
                  📄 包含文件 ({item.files.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {item.files.slice(0, 10).map((file, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        background: '#fff',
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 6,
                        color: THEME.sub,
                      }}
                    >
                      {file}
                    </span>
                  ))}
                  {item.files.length > 10 && (
                    <span style={{ fontSize: 12, color: THEME.sub, padding: '4px 10px' }}>
                      ... 还有 {item.files.length - 10} 个文件
                    </span>
                  )}
                </div>
              </div>

              {/* 底部提示 */}
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 8,
                fontSize: 13,
                color: THEME.brandA,
                textAlign: 'center',
              }}>
                🔒 数据仅供查看，如需下载请联系管理员
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/********************** 页面:设置 *************************/
function SettingsPage({ auth }){
  const [health, setHealth] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function testHealth(){ 
    try{ 
      const r = await apiJson("/healthz"); 
      setHealth(r); 
      alert("/healthz OK: "+JSON.stringify(r)); 
    }catch(e){ 
      setHealth({ ok:false, error:e.message }); 
      alert("/healthz 失败: "+e.message);
    } 
  }
  
  async function doLogin(e){ 
    e.preventDefault(); 
    try{ 
      await auth.login(username, password); 
      alert("登录成功"); 
    }catch(e){ 
      alert("登录失败: "+e.message);
    } 
  }

  return (
    <Section title="设置 / 工具" subtitle="Settings & Tools">
      <div style={{ display:'grid', gap:20 }}>
        <div style={card}>
          <div style={{ fontWeight:700, fontSize: 18, marginBottom: 8 }}>后端健康检查</div>
          <div style={{ fontSize:14, color:THEME.sub, marginBottom: 16 }}>调用 /healthz,检查 MinIO 桶连通性。</div>
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={testHealth} style={secondaryBtn}>测试 /healthz</button>
            <button onClick={()=>{ 
              window.__API_BASE__ = prompt("覆盖 API 基址", API) || API; 
              alert("已设置 window.__API_BASE__,刷新后生效。"); 
            }} style={secondaryBtn}>覆盖 API 地址</button>
          </div>
          {health && (<pre style={{...pre, marginTop: 16}}>{JSON.stringify(health,null,2)}</pre>)}
        </div>

        <div style={card}>
          <div style={{ fontWeight:700, fontSize: 18, marginBottom: 8 }}>登录(获得上传权限)</div>
          <form onSubmit={doLogin} style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:16 }}>
            <input 
              placeholder="用户名" 
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              style={inputStyle}
            />
            <input 
              type="password" 
              placeholder="密码" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>登录</button>
            {auth.authed && <button type="button" onClick={auth.logout} style={dangerBtn}>退出</button>}
          </form>
          <div style={{ fontSize:14, color:THEME.sub, marginTop:12 }}>
            当前用户: {auth.user || "(未登录)"}
          </div>
        </div>
      </div>
    </Section>
  );
}

/********************** 根组件 *************************/
export default function App(){
  const [tab, setTab] = useState("home");
  const auth = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [u,setU]=useState(""); 
  const [p,setP]=useState("");
  
  useEffect(()=>{ 
    document.title = "长江三峡实验室—数据中心"; 
  },[]);

  async function quickLogin(e){ 
    e?.preventDefault?.();
    
    if (!u || !p) {
      alert('请输入用户名和密码');
      return;
    }
    
    try { 
      console.log('开始登录...', { username: u, api: API });
      const result = await auth.login(u, p);
      console.log('登录成功', result);
      setShowLogin(false);
      setU('');
      setP('');
      alert('登录成功');
    } catch(err) {
      console.error('登录失败', err);
      alert('登录失败: ' + (err?.message || err));
    }
  }

  const gateNav = (k)=>{
    const needAuth = (k==='data' || k==='code' || k==='survey' || k==='mydata');
    if(needAuth && !auth.authed){ 
      setShowLogin(true); 
      return; 
    }
    setTab(k);
  }

  return (
    <div style={{ minHeight:"100vh", background: THEME.bg }}>
      <TopBar 
        active={tab} 
        onNav={gateNav} 
        onLoginClick={()=> setShowLogin(true)} 
        authedUser={auth.user} 
        onLogout={auth.logout} 
      />

      {tab==='home'  && <HomePage onEnterData={()=> gateNav('data')} onEnterLearn={()=> gateNav('learn')} />}
      {tab==='data'  && <DataCenter authedUser={auth.user} />}
      {tab==='learn' && <LearningCenter />}
      {tab==='code'  && <CodeCenter />}
      {tab==='survey'&& <SurveyCenter />}
      {tab==='mydata'&& <MyDataPage authedUser={auth.user} />}
      {tab==='settings' && <SettingsPage auth={auth} />}

      {showLogin && (
        <div 
          style={{ 
            position:'fixed', 
            inset:0, 
            background:'rgba(0,0,0,.5)', 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            zIndex:50,
            backdropFilter: 'blur(4px)',
          }} 
          onClick={()=> setShowLogin(false)}
        >
          <div 
            style={{ 
              background:'#fff', 
              padding:32, 
              borderRadius:20, 
              width:400,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }} 
            onClick={e=> e.stopPropagation()}
          >
            <div style={{ fontWeight:800, fontSize: 24, marginBottom:20, color: THEME.text }}>登录</div>
            <form onSubmit={quickLogin} style={{ display:'grid', gap:16 }}>
              <input 
                placeholder="用户名" 
                value={u} 
                onChange={e=>setU(e.target.value)} 
                style={inputStyle} 
              />
              <input 
                type="password" 
                placeholder="密码" 
                value={p} 
                onChange={e=>setP(e.target.value)} 
                style={inputStyle} 
              />
              <button type="submit" style={primaryBtn}>立即登录</button>
            </form>
          </div>
        </div>
      )}

      <footer style={{ 
        maxWidth:1280, 
        margin:"40px auto 20px", 
        padding:"20px 24px", 
        color:THEME.sub, 
        fontSize:13,
        textAlign: 'center',
        borderTop: `1px solid ${THEME.border}`,
      }}>
        © 长江三峡数字化管理与智能决策实验室 · 数据驱动决策 智能引领未来
      </footer>
    </div>
  );
}