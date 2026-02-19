"use client";

import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Player, Team, AuctionState } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Wallet, Trophy, Gavel, CheckCircle2, X, Star, Users, Zap, TrendingUp } from "lucide-react";

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [myTeamId, setMyTeamId] = useState<string>("team_0");
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("Standings");
  const [isJoined, setIsJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSheetId, setTeamSheetId] = useState<string | null>(null);

  const socketRef = useRef<any>(null);

  const teamData = [
    { id: "team_0", name: "Chennai Super Kings", short: "CSK", color: "var(--csk-yellow)", secondary: "var(--csk-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/300px-Chennai_Super_Kings_Logo.svg.png", darkText: true },
    { id: "team_1", name: "Mumbai Indians", short: "MI", color: "var(--mi-blue)", secondary: "var(--mi-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/300px-Mumbai_Indians_Logo.svg.png", darkText: false },
    { id: "team_2", name: "Royal Challengers Bengaluru", short: "RCB", color: "var(--rcb-red)", secondary: "var(--rcb-secondary)", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/%E0%A4%B0%E0%A5%89%E0%A4%AF%E0%A4%B2_%E0%A4%9A%E0%A5%88%E0%A4%B2%E0%A5%87%E0%A4%82%E0%A4%9C%E0%A4%B0%E0%A5%8D%E0%A4%B8_%E0%A4%AC%E0%A5%87%E0%A4%82%E0%A4%97%E0%A4%B2%E0%A5%81%E0%A4%B0%E0%A5%81_%E0%A4%B2%E0%A5%8B%E0%A4%97%E0%A5%8B.png", darkText: false },
    { id: "team_3", name: "Kolkata Knight Riders", short: "KKR", color: "var(--kkr-purple)", secondary: "var(--kkr-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/300px-Kolkata_Knight_Riders_Logo.svg.png", darkText: false },
    { id: "team_4", name: "Delhi Capitals", short: "DC", color: "var(--dc-blue)", secondary: "var(--dc-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg", darkText: false },
    { id: "team_5", name: "Punjab Kings", short: "PBKS", color: "var(--pbks-red)", secondary: "var(--pbks-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/300px-Punjab_Kings_Logo.svg.png", darkText: false },
    { id: "team_6", name: "Rajasthan Royals", short: "RR", color: "var(--rr-pink)", secondary: "var(--rr-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/5/5c/This_is_the_logo_for_Rajasthan_Royals%2C_a_cricket_team_playing_in_the_Indian_Premier_League_%28IPL%29.svg", darkText: false },
    { id: "team_7", name: "Sunrisers Hyderabad", short: "SRH", color: "var(--srh-orange)", secondary: "var(--srh-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg", darkText: false },
    { id: "team_8", name: "Lucknow Super Giants", short: "LSG", color: "var(--lsg-teal)", secondary: "var(--lsg-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_IPL_Logo.svg", darkText: true },
    { id: "team_9", name: "Gujarat Titans", short: "GT", color: "var(--gt-blue)", secondary: "var(--gt-secondary)", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/300px-Gujarat_Titans_Logo.svg.png", darkText: false }
  ];

  useEffect(() => {
    if (isJoined) {
      const socket = io();
      socketRef.current = socket;

      if (selectedTeamId) setMyTeamId(selectedTeamId);

      socket.on("connect", () => socket.emit("join-auction", { userId: userName, teamId: selectedTeamId }));
      socket.on("assigned-team", (teamId: string) => setMyTeamId(teamId));
      socket.on("init-state", (data: any) => {
        setPlayers(data.players);
        setTeams(data.teams);
        setAuctionState(data.auctionState);
      });
      socket.on("new-round", (data: any) => {
        setCurrentPlayer(data.player);
        setAuctionState((prev: any) => ({ ...prev, currentBid: data.currentBid, timer: data.timer, status: 'bidding', highestBidderId: null }));
        setBidHistory([]);
      });
      socket.on("bid-updated", (data: any) => {
        setAuctionState((prev: any) => ({ ...prev, currentBid: data.currentBid, highestBidderId: data.highestBidderId, timer: data.timer }));
        setTeams((currentTeams: Team[]) => {
          const bidder = currentTeams.find(t => t.id === data.highestBidderId);
          setBidHistory((prev: any) => [{ teamName: bidder?.name, amount: data.currentBid }, ...prev].slice(0, 5));
          return currentTeams;
        });
      });
      socket.on("timer-tick", (time: number) => setAuctionState((prev: any) => ({ ...prev, timer: time })));
      socket.on("player-sold", (data: any) => {
        setAuctionState((prev: any) => ({ ...prev, status: 'sold' }));
        setTeams(prev => prev.map(t => t.id === data.team.id ? data.team : t));
        setPlayers(prev => prev.map(p => p.id === data.player.id ? data.player : p));
      });
      socket.on("player-unsold", (data: any) => {
        setAuctionState((prev: any) => ({ ...prev, status: 'unsold' }));
        setPlayers(prev => prev.map(p => p.id === data.player.id ? { ...p, status: 'unsold' } : p));
      });

      return () => { socket.disconnect(); };
    }
  }, [isJoined, userName, selectedTeamId]);

  const handleBid = () => {
    if (!currentPlayer || auctionState?.status !== 'bidding' || !socketRef.current) return;
    socketRef.current.emit("place-bid", { teamId: myTeamId, bidAmount: auctionState.currentBid + 0.5 });
  };

  const startNextAuction = () => {
    if (socketRef.current) {
      socketRef.current.emit("start-auction");
    }
  };

  const myTeam = teams.find(t => t.id === myTeamId);

  if (!isJoined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', padding: '60px 20px', position: 'relative' }}>
        {/* Background Decorative Blobs */}
        <div className="blob" style={{ background: 'var(--mi-blue)', top: '10%', left: '5%' }}></div>
        <div className="blob" style={{ background: 'var(--rcb-red)', bottom: '10%', right: '5%' }}></div>
        <div className="blob" style={{ background: 'var(--kkr-purple)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>

        <header style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <img
            src="/ipl.png"
            alt="TATA IPL AUCTION"
            style={{ height: '180px', width: 'auto', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.2))', marginBottom: '20px' }}
          />
        </header>

        <div className="glass" style={{ width: '100%', maxWidth: '850px', padding: '40px', marginBottom: '60px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px' }}>
            <div style={{ width: '100%' }}>
              <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '12px', display: 'block' }}>MANAGER NAME</label>
              <input
                type="text"
                placeholder="Enter your name..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '20px', color: '#fff', fontSize: '1.4rem', fontWeight: 700, outline: 'none' }}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <button className="btn-primary" disabled={!userName || !selectedTeamId} onClick={() => setIsJoined(true)} style={{ marginTop: 'auto', height: '72px' }}>ENTER ARENA</button>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '850px', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', color: '#94a3b8', marginBottom: '32px', letterSpacing: '4px' }}>CHOOSE YOUR FRANCHISE</h2>
          <div className="franchise-grid">
            {teamData.map((team) => (
              <motion.div
                key={team.id}
                whileHover={{ y: -8, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`team-card ${selectedTeamId === team.id ? 'selected' : ''}`}
                onClick={() => setSelectedTeamId(team.id)}
                style={{
                  background: `linear-gradient(135deg, ${team.color} 0%, rgba(0,0,0,0.4) 150%)`,
                  borderColor: selectedTeamId === team.id ? team.secondary : 'rgba(255,255,255,0.15)',
                  borderWidth: selectedTeamId === team.id ? '6px' : '2px',
                  boxShadow: selectedTeamId === team.id ? `0 0 50px ${team.secondary}aa` : '0 10px 20px rgba(0,0,0,0.1)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                } as any}
                onMouseEnter={(e) => {
                  if (selectedTeamId !== team.id) {
                    e.currentTarget.style.borderColor = team.secondary;
                    e.currentTarget.style.boxShadow = `0 15px 30px ${team.secondary}66`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTeamId !== team.id) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {/* Internal Shine Gradient Overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(255,255,255,0.15), transparent 50%)', zIndex: 1, pointerEvents: 'none' }}></div>

                {/* Selection Indicator Overlay */}
                <AnimatePresence>
                  {selectedTeamId === team.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'white', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
                    >
                      <CheckCircle2 size={24} color={team.secondary} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="team-logo-container" style={{ position: 'relative', zIndex: 2 }}>
                  <img src={team.logo} alt={team.short} className="team-logo-img" style={{ scale: selectedTeamId === team.id ? '1.25' : '1', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }} />
                </div>
                <p className="team-name-label" style={{
                  color: team.darkText ? '#000' : '#fff',
                  position: 'relative',
                  zIndex: 6,
                  opacity: selectedTeamId === team.id ? 1 : 0.8,
                  fontSize: selectedTeamId === team.id ? '18px' : '15px',
                  textShadow: team.darkText ? 'none' : '0 2px 4px rgba(0,0,0,0.2)'
                }}>{team.short}</p>

                {selectedTeamId === team.id && (
                  <motion.div
                    layoutId="selection-glow"
                    style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.12)', zIndex: 1 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sheetTeam = teams.find(t => t.id === teamSheetId);
  const sheetTeamInfo = teamData.find(t => t.id === teamSheetId);

  return (
    <main style={{ minHeight: '100vh', padding: '32px', maxWidth: '1400px', margin: '0 auto', background: 'transparent' }}>
      <AnimatePresence>
        {teamSheetId && sheetTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTeamSheetId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', zIndex: 1000 }}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{ width: '100%', maxWidth: '900px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: `2px solid ${sheetTeamInfo?.color}` }}
            >
              <div style={{ padding: '32px', background: `linear-gradient(135deg, ${sheetTeamInfo?.color} 0%, transparent 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <img src={sheetTeamInfo?.logo} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 950, color: sheetTeamInfo?.darkText ? 'black' : 'white' }}>{sheetTeam.name}</h2>
                    <p style={{ fontWeight: 800, color: sheetTeamInfo?.darkText ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>SQUAD SIZE: {sheetTeam.squad.length} / 21</p>
                  </div>
                </div>
                <button onClick={() => setTeamSheetId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '12px', cursor: 'pointer' }}>
                  <X size={32} color={sheetTeamInfo?.darkText ? 'black' : 'white'} />
                </button>
              </div>
              <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {sheetTeam.squad.length > 0 ? sheetTeam.squad.map(pid => {
                  const p = players.find(player => player.id === pid);
                  return p && (
                    <div key={pid} className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                      <div>
                        <p style={{ fontWeight: 900, fontSize: '1.2rem' }}>{p.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 800 }}>{p.role.toUpperCase()}</p>
                      </div>
                      <p style={{ fontSize: '1.4rem', fontWeight: 950 }}>{p.soldPrice?.toFixed(2)} Cr</p>
                    </div>
                  )
                }) : (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px', opacity: 0.3 }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>NO PLAYERS BOUGHT YET</h3>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decorative Blobs */}
      <div className="blob" style={{ background: 'var(--mi-blue)', top: '0%', right: '5%' }}></div>
      <div className="blob" style={{ background: 'var(--rcb-red)', bottom: '0%', left: '5%' }}></div>

      <header className="glass" style={{ padding: '32px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `12px solid ${myTeam?.color}`, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flex: 1 }}>
          <img
            src="/ipl.png"
            alt="TATA IPL AUCTION"
            style={{ height: '80px', width: 'auto', marginRight: '20px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={teamData.find(t => t.id === myTeamId)?.logo} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
            <div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 950, color: 'white' }}>{myTeam?.name}</h2>
              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '3px' }}>FRANCHISE MANAGER: {userName.toUpperCase()}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <Stat value={`${myTeam?.budget.toFixed(2)} Cr`} label="PURSE" color={myTeam?.color} />
          <Stat value={`${myTeam?.squad.length}/21`} label="SQUAD" color={myTeam?.color} />
          <Stat value={`${myTeam?.foreignCount}/8`} label="OVERSEAS" color={myTeam?.color} />
          <Stat value={`${auctionState?.timer}s`} label="TIMER" color="var(--accent)" />
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', position: 'relative', zIndex: 10 }}>
        <div className="glass" style={{ padding: '60px', textAlign: 'center', position: 'relative', border: `1px solid rgba(255,255,255,0.08)`, minHeight: '650px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: myTeam?.color, opacity: 0.05, zIndex: 0 }}></div>

          <AnimatePresence mode="wait">
            {auctionState?.status === 'bidding' && currentPlayer ? (
              <motion.div
                key={currentPlayer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px', alignItems: 'center', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <span style={{ background: 'var(--accent)', color: 'black', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>{currentPlayer.role}</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}>{currentPlayer.country}</span>
                    </div>
                    <h1 style={{ fontSize: '4.5rem', fontWeight: 950, lineHeight: 1, marginBottom: '24px' }}>{currentPlayer.name}</h1>

                    <div className="glass" style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', marginBottom: '32px' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent)', marginBottom: '20px', letterSpacing: '2px' }}>CAREER T20 STATS</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        <MiniStat label="MATCHES" value={currentPlayer.stats?.matches} icon={<Users size={14} />} />
                        {currentPlayer.stats?.runs && <MiniStat label="RUNS" value={currentPlayer.stats?.runs} icon={<TrendingUp size={14} />} />}
                        {currentPlayer.stats?.wickets && <MiniStat label="WICKETS" value={currentPlayer.stats?.wickets} icon={<Zap size={14} />} />}
                        <MiniStat label="STR RATE" value={currentPlayer.stats?.sr} icon={<Star size={14} />} />
                        {currentPlayer.stats?.avg && <MiniStat label="AVG" value={currentPlayer.stats?.avg} icon={<Star size={14} />} />}
                        {currentPlayer.stats?.eco && <MiniStat label="ECON" value={currentPlayer.stats?.eco} icon={<Star size={14} />} />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <p style={{ fontSize: '6rem', fontWeight: 950, color: 'white' }}>{auctionState.currentBid.toFixed(2)}</p>
                      <span style={{ fontSize: '2rem', color: 'var(--accent)', fontWeight: 900 }}>CR</span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', marginBottom: '32px' }}>CURRENT HIGHEST BID</p>

                    <button className="btn-primary" onClick={handleBid} style={{ width: '100%', fontSize: '2.4rem', height: '90px' }}>PLACE BID</button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: -20, background: `radial-gradient(circle, ${myTeam?.color}33 0%, transparent 70%)`, zIndex: -1 }}></div>
                    <motion.img
                      key={currentPlayer.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={currentPlayer.image || "https://www.iplt20.com/assets/images/default-player.png"}
                      alt={currentPlayer.name}
                      style={{ width: '100%', height: 'auto', maxHeight: '450px', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}
              >
                <div className="glass" style={{ padding: '60px', borderRadius: '40px', border: '2px solid var(--accent)', background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  {auctionState?.status === 'sold' ? (
                    <>
                      <Trophy size={100} color="var(--accent)" style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 0 20px var(--accent))' }} />
                      <h2 style={{ fontSize: '4rem', fontWeight: 950, color: 'white' }}>SOLD OUT!</h2>
                      <p style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 800, marginTop: '12px' }}>PREPARING FOR NEXT SUPERSTAR...</p>
                    </>
                  ) : auctionState?.status === 'unsold' ? (
                    <>
                      <Gavel size={100} color="#64748b" style={{ margin: '0 auto 24px' }} />
                      <h2 style={{ fontSize: '4rem', fontWeight: 950, color: '#64748b' }}>UNSOLD</h2>
                      <p style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 800, marginTop: '12px' }}>MOVING TO NEXT PLAYER...</p>
                    </>
                  ) : (
                    <>
                      <Timer size={100} color="var(--accent)" style={{ margin: '0 auto 24px', animation: 'pulse 2s infinite' }} />
                      <h2 style={{ fontSize: '3rem', fontWeight: 950, color: 'white' }}>AUCTION STARTING...</h2>
                      <p style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 800, marginTop: '12px' }}>FRANCHISES ARE JOINING THE ARENA</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Tab active={activeTab === 'Standings'} onClick={() => setActiveTab('Standings')} text="STANDINGS" />
            <Tab active={activeTab === 'Squad'} onClick={() => setActiveTab('Squad')} text="MY TEAM" />
          </div>
          <div style={{ padding: '24px 16px' }}>
            {activeTab === 'Standings' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teams.map(t => {
                  const tInfo = teamData.find(td => td.id === t.id);
                  return (
                    <motion.div
                      key={t.id}
                      whileHover={{ scale: 1.02, x: 5 }}
                      onClick={() => setTeamSheetId(t.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: `linear-gradient(90deg, ${tInfo?.color} 10%, rgba(0,0,0,0.4) 150%)`,
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Secondary Color Corner Indicator */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '24px',
                        height: '24px',
                        backgroundColor: tInfo?.secondary,
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                        opacity: 0.9,
                        boxShadow: `0 0 10px ${tInfo?.secondary}`
                      }}></div>

                      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
                        <span style={{ fontWeight: 950, fontSize: '14px', color: tInfo?.darkText ? 'black' : 'white' }}>{t.name}</span>
                        <span style={{ fontSize: '10px', color: tInfo?.darkText ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>{t.squad.length} Players</span>
                      </div>
                      <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                        <span style={{ fontWeight: 950, color: tInfo?.darkText ? 'black' : 'white', fontSize: '1.2rem' }}>{t.budget.toFixed(1)}</span>
                        <p style={{ fontSize: '8px', color: tInfo?.darkText ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', fontWeight: 900 }}>PURSE</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myTeam?.squad.map(id => {
                  const p = players.find(p => p.id === id);
                  return p && (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <span style={{ fontWeight: 800 }}>{p.name}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 950 }}>{p.soldPrice?.toFixed(2)} Cr</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function MiniStat({ label, value, icon }: any) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', marginBottom: '4px' }}>
        {icon}
        <span style={{ fontSize: '8px', fontWeight: 900 }}>{label}</span>
      </div>
      <p style={{ fontSize: '14px', fontWeight: 950, color: 'white' }}>{value || '-'}</p>
    </div>
  )
}

function Stat({ value, label, color }: any) {
  return (
    <div className="glass" style={{ textAlign: 'center', padding: '16px 24px', borderRadius: '20px', borderBottom: `5px solid ${color}`, minWidth: '120px', background: 'rgba(0,0,0,0.4)' }}>
      <p style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 950 }}>{value}</p>
    </div>
  );
}

function Tab({ active, onClick, text }: any) {
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '24px', border: 'none', background: active ? 'rgba(255,255,255,0.05)' : 'transparent', color: active ? 'var(--accent)' : '#fff', fontWeight: 950, cursor: 'pointer', transition: '0.3s', fontSize: '12px', letterSpacing: '2px', borderBottom: active ? '4px solid var(--accent)' : '4px solid transparent' }}>{text}</button>
  );
}
