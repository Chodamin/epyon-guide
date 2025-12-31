import React, { useEffect, useState } from "react";
import "./App.css";

// 알려주신 최신 URL로 수정했습니다.
const API_URL = "https://script.google.com/macros/s/AKfycbyAcqUSP-_5vayBtO4cxBMyg5b89d_ufKhZmRfVyb3euru_nWExOPzI0H0j-5cbBvih/exec";
const GUILD_PASSWORD = "epyoff1230";

function App() {
  const [isAuthorized, setIsAuthorized] = useState(false); // 추가
  const [passwordInput, setPasswordInput] = useState("");   // 추가

  const [view, setView] = useState("search"); // 'search' 또는 'upload'
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 검색용 상태
  const [search, setSearch] = useState({ def1: "", def2: "", def3: "" });

  // 업로드용 상태 (시트 구조에 맞춤)
  const [uploadForm, setUploadForm] = useState({
    기록자: "",
    방어1: "", 방어2: "", 방어3: "",
    공격1: "", 공격2: "", 공격3: "",
    스킬1: "", 스킬2: "", 스킬3: "",
    코멘트: ""
  });

  useEffect(() => {
    // 브라우저에 저장된 "비밀번호 값"을 가져옵니다.
    const savedPassword = localStorage.getItem("user_entered_password");
    
    // 저장된 비번이 현재 코드의 GUILD_PASSWORD와 정확히 일치하는지 비교
    if (savedPassword === GUILD_PASSWORD) {
      setIsAuthorized(true);
      loadData();
    } else {
      // 비번이 바뀌었거나 없으면 인증 해제
      setIsAuthorized(false);
      // 잘못된 예전 비번은 삭제 (선택사항)
      if (savedPassword) localStorage.removeItem("user_entered_password");
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === GUILD_PASSWORD) {
      // 맞췄을 때 "true" 대신 "입력한 비번 값"을 저장합니다.
      localStorage.setItem("user_entered_password", passwordInput);
      setIsAuthorized(true);
      loadData();
    } else {
      alert("비밀번호가 틀렸습니다!");
      setPasswordInput("");
    }
  };

const loadData = () => {
    setLoading(true);

    // 1. 캐시 방지를 위해 URL 뒤에 현재 시간(타임스탬프)을 붙입니다.
    const cacheBuster = `?t=${new Date().getTime()}`;

    fetch(API_URL + cacheBuster)
      .then((res) => res.json())
      .then((json) => {
        // 2. 기존의 데이터 정제 로직 (공백 제거 및 인덱스 부여)
        const cleanedData = json.map((item, index) => {
          const newItem = {};
          Object.keys(item).forEach(key => {
            newItem[key.trim()] = item[key];
          });
          newItem.originalIndex = index; 
          return newItem;
        });

        // 3. 방어1 컬럼이 있는 데이터만 필터링하여 상태 업데이트
        setAllData(cleanedData.filter(item => item["방어1"]));
        setLoading(false);
      })
      .catch((err) => {
        console.error("데이터 로드 실패:", err);
        setLoading(false);
      });
  };
  
  // 승률 계산 함수
  const calculateWinRate = (win, loss) => {
    const w = Number(win) || 0;
    const l = Number(loss) || 0;
    if (w + l === 0) return "0%";
    return Math.round((w / (w + l)) * 100) + "%";
  };

  // 승패 버튼 클릭 시 시트에 업데이트하는 함수
  const handleVote = (originalIndex, type) => {
    const confirmMsg = type === "win" ? "승리 기록을 반영할까요?" : "패배 기록을 반영할까요?";
    if (!window.confirm(confirmMsg)) return;

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateWinLoss",
        rowIndex: originalIndex,
        type: type
      }),
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result === "success") {
          alert("기록되었습니다!");
          loadData(); // 최신 승률 반영을 위해 데이터 새로고침
        } else {
          alert("오류 발생: " + data.error);
        }
      })
      .catch((err) => alert("연결 실패: " + err.message));
  };

  const handleSearch = () => {
    const inputs = [search.def1, search.def2, search.def3]
      .map(v => v.trim().toLowerCase())
      .filter(v => v !== "");

    if (inputs.length === 0) return alert("검색어를 입력하세요.");

    const result = allData.filter((item) => {
      const def1 = item["방어1"] ? item["방어1"].toString().toLowerCase() : "";
      const def2 = item["방어2"] ? item["방어2"].toString().toLowerCase() : "";
      const def3 = item["방어3"] ? item["방어3"].toString().toLowerCase() : "";
      const rowStr = `${def1} ${def2} ${def3}`;
      return inputs.every(input => rowStr.includes(input));
    });
    setFilteredData(result);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadForm.기록자 || !uploadForm.방어1 || !uploadForm.공격1) {
      return alert("필수 정보를 모두 입력해주세요.");
    }

    setLoading(true);
    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "upload",
        ...uploadForm
      }),
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result === "success") {
          alert("공략 등록 완료!");
          setUploadForm({
            기록자: "", 방어1: "", 방어2: "", 방어3: "",
            공격1: "", 공격2: "", 공격3: "",
            스킬1: "", 스킬2: "", 스킬3: "", 코멘트: ""
          });
          loadData();
          setView("search");
        }
      })
      .catch(() => alert("업로드 실패"))
      .finally(() => setLoading(false));
  };

  if (!isAuthorized) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🛡️ EPYON 공략집</h1>
          <p>길드원 전용 페이지입니다.<br/>비밀번호를 입력해주세요.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="input-field" 
              placeholder="비밀번호 입력"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
              style={{ width: '100%', marginBottom: '10px' }}
            />
            <button type="submit" className="search-button" style={{ width: '100%' }}>
              접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <button className={view === "search" ? "active" : ""} onClick={() => setView("search")}>🔍 공략 검색</button>
        <button className={view === "upload" ? "active" : ""} onClick={() => setView("upload")}>✍️ 공략 등록</button>
      </nav>

      <header className="header">
        <h1>🛡️ EPYON 길드전 공략집</h1>
      </header>

      {view === "search" ? (
        <div className="view-search">
          <div className="search-container">
            <input className="input-field" placeholder="방어1" value={search.def1} onChange={e => setSearch({...search, def1: e.target.value})} />
            <input className="input-field" placeholder="방어2" value={search.def2} onChange={e => setSearch({...search, def2: e.target.value})} />
            <input className="input-field" placeholder="방어3" value={search.def3} onChange={e => setSearch({...search, def3: e.target.value})} />
            <button onClick={handleSearch} className="search-button">검색</button>
          </div>
          
          <div className="result-section">
            {filteredData && (
              <div className="card-grid">
                {filteredData.map((row, idx) => (
                  <div key={idx} className="card">
                    <div className="card-header">
                      <div className="win-rate-badge">승률 {calculateWinRate(row["승"], row["패"])}</div>
                      <div className="row-info"><span className="badge badge-red">VS</span> {row["방어1"]} / {row["방어2"]} / {row["방어3"]}</div>
                      <div className="row-info"><span className="badge badge-green">ATK</span> {row["공격1"]} / {row["공격2"]} / {row["공격3"]}</div>
                    </div>
                    <div className="card-body">
                      <p><strong>⚡ 스킬:</strong> {row["스킬1"]} → {row["스킬2"]} → {row["스킬3"]}</p>
                      {row["코멘트"] && <div className="comment-box">💡 {row["코멘트"]}</div>}
                    </div>
                    
                    {/* 승패 투표 버튼 영역 */}
                    <div className="vote-container">
                      <button className="vote-btn win" onClick={() => handleVote(row.originalIndex, "win")}>👍 승리</button>
                      <button className="vote-btn loss" onClick={() => handleVote(row.originalIndex, "loss")}>👎 패배</button>
                    </div>

                    <div className="card-footer">
                      <span className="stats-text">{row["승"] || 0}승 {row["패"] || 0}패</span>
                      <span>By {row["기록자"]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="view-upload">
          {/* ... 업로드 폼 (기존과 동일하되 가독성을 위해 생략 가능하나 전문이므로 포함) ... */}
          <form className="upload-form" onSubmit={handleUpload}>
            <div className="form-group">
              <label>작성자</label>
              <input value={uploadForm.기록자} onChange={e => setUploadForm({...uploadForm, 기록자: e.target.value})} placeholder="치기리효마(필수)" required />
            </div>
            <div className="form-grid">
              <div className="form-section">
                <h3>🛡️ 방어덱</h3>
                <input value={uploadForm.방어1} onChange={e => setUploadForm({...uploadForm, 방어1: e.target.value})} placeholder="방어1(필수)" required />
                <input value={uploadForm.방어2} onChange={e => setUploadForm({...uploadForm, 방어2: e.target.value})} placeholder="방어2(필수)" required/>
                <input value={uploadForm.방어3} onChange={e => setUploadForm({...uploadForm, 방어3: e.target.value})} placeholder="방어3(필수)" required/>
              </div>
              <div className="form-section">
                <h3>⚔️ 공격덱</h3>
                <input value={uploadForm.공격1} onChange={e => setUploadForm({...uploadForm, 공격1: e.target.value})} placeholder="공격1(필수)" required />
                <input value={uploadForm.공격2} onChange={e => setUploadForm({...uploadForm, 공격2: e.target.value})} placeholder="공격2(필수)" required />
                <input value={uploadForm.공격3} onChange={e => setUploadForm({...uploadForm, 공격3: e.target.value})} placeholder="공격3(필수)" required />
              </div>
            </div>
            <div className="form-group">
              <label>스킬 순서</label>
              <div className="skill-inputs">
                <input value={uploadForm.스킬1} onChange={e => setUploadForm({...uploadForm, 스킬1: e.target.value})} placeholder="스킬1"/>
                <input value={uploadForm.스킬2} onChange={e => setUploadForm({...uploadForm, 스킬2: e.target.value})} placeholder="스킬2"/>
                <input value={uploadForm.스킬3} onChange={e => setUploadForm({...uploadForm, 스킬3: e.target.value})} placeholder="스킬3"/>
              </div>
            </div>
            <div className="form-group">
              <label>팁</label>
              <textarea value={uploadForm.코멘트} onChange={e => setUploadForm({...uploadForm, 코멘트: e.target.value})} placeholder="진영이나 펫, 세팅 등의 디테일한 팁들을 적어주시면 승률 상승에 도움이 됩니다"/>
            </div>
            <button type="submit" className="upload-button" disabled={loading}>
              {loading ? "등록 중..." : "🚀 공략 등록하기"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;