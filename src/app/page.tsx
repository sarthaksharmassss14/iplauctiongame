"use client";

import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Player, Team, AuctionState } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Wallet, Trophy, Gavel, CheckCircle2, X, Star, Users, Zap, TrendingUp } from "lucide-react";
import { playAudioEffect } from "@/lib/audio";

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

  // Lobby State
  const [pageMode, setPageMode] = useState<'initial' | 'host' | 'join' | 'lobby' | 'auction'>('initial');
  const [roomId, setRoomId] = useState("");
  const [maxHumans, setMaxHumans] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [errorStatus, setErrorStatus] = useState("");
  const [takenTeamIds, setTakenTeamIds] = useState<string[]>([]);
  const [customAlert, setCustomAlert] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showPastModal, setShowPastModal] = useState(false);

  // Refs for socket listeners to avoid stale closures
  const stateRef = useRef({ userName, selectedTeamId, roomId, joinRoomId, isHost, maxHumans, isJoined });
  useEffect(() => {
    stateRef.current = { userName, selectedTeamId, roomId, joinRoomId, isHost, maxHumans, isJoined };
  }, [userName, selectedTeamId, roomId, joinRoomId, isHost, maxHumans, isJoined]);

  // Restore session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionStr = sessionStorage.getItem('auctionSession');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.roomId && session.userName && session.teamId) {
            setUserName(session.userName);
            setJoinRoomId(session.roomId);
            setRoomId(session.roomId);
            setSelectedTeamId(session.teamId);
            setIsJoined(true);
            setPageMode('join');
          }
        } catch (err) { }
      }
    }
  }, []);

  // Connection timeout logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isJoined && pageMode !== 'lobby' && pageMode !== 'auction') {
      timeout = setTimeout(() => {
        setCustomAlert({ show: true, message: "CONNECTION TIMED OUT. SERVER MIGHT BE DOWN. PLEASE TRY AGAIN!" });
        setIsJoined(false);
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }, 12000);
    }
    return () => clearTimeout(timeout);
  }, [isJoined, pageMode]);

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
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setJoinRoomId(room.toUpperCase());
      setPageMode('join');
    }
  }, []);

  useEffect(() => {
    if (pageMode === 'initial') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) return;

    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      // consolidation: Only emit if isJoined is true AND we haven't joined a room yet
      if (stateRef.current.isJoined) {
        if (stateRef.current.isHost) {
          console.log("Emitting create-room (on connect)");
          socket.emit("create-room", { userId: stateRef.current.userName, maxHumans: stateRef.current.maxHumans });
        } else {
          console.log("Emitting join-room (on connect)");
          socket.emit("join-room", {
            roomId: stateRef.current.roomId || stateRef.current.joinRoomId,
            userId: stateRef.current.userName,
            teamId: stateRef.current.selectedTeamId
          });
        }
      }

      if (stateRef.current.joinRoomId && stateRef.current.joinRoomId.length === 6) {
        socket.emit("check-room", { roomId: stateRef.current.joinRoomId });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setErrorStatus("Connection failed. Is the server running?");
      setIsJoined(false);
      socketRef.current = null;
    });

    socket.on("room-created", (id: string) => {
      console.log("Room created:", id);
      setRoomId(id);
      socket.emit("join-room", { roomId: id, userId: stateRef.current.userName, teamId: stateRef.current.selectedTeamId });
    });

    socket.on("room-info", (data: any) => {
      console.log("Room info received:", data);
      setTakenTeamIds(data.takenTeamIds || []);
    });

    socket.on("assigned-team", (teamId: string) => {
      setMyTeamId(teamId);
      setSelectedTeamId(teamId);
    });

    socket.on("init-state", (data: any) => {
      setPlayers(data.players);
      setTeams(data.teams);
      setAuctionState(data.auctionState);

      sessionStorage.setItem('auctionSession', JSON.stringify({
        roomId: stateRef.current.roomId || stateRef.current.joinRoomId,
        userName: stateRef.current.userName,
        teamId: stateRef.current.selectedTeamId
      }));

      // Set currentPlayer if the game is already in progress
      if (data.auctionState.status === 'bidding' || data.auctionState.status === 'sold' || data.auctionState.status === 'unsold') {
        const p = data.players[data.auctionState.currentPlayerIndex];
        setCurrentPlayer(p);
      }

      // Once we receive init-state, we are officially in. Stop the "isJoined" trigger.
      setIsJoined(false);
      if (data.auctionState.status !== 'lobby') {
        setPageMode('auction');
      } else {
        setPageMode('lobby');
      }
    });

    socket.on("player-joined", (data: any) => {
      setTeams(data.teams);
    });

    socket.on("player-left", (data: any) => {
      setTeams(prev => prev.map(t => t.id === data.teamId ? { ...t, socketId: null } : t));
    });

    socket.on("error-msg", (msg: string) => {
      setErrorStatus(msg);
      setIsJoined(false);
      setPageMode('join');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    });

    socket.on("new-round", (data: any) => {
      setPageMode('auction');
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
      if (data.highestBidderId) {
        playAudioEffect('coin');
      }
    });

    socket.on("timer-tick", (time: number) => {
      setAuctionState((prev: any) => ({ ...prev, timer: time }));
      if (time > 0 && time <= 3) {
        playAudioEffect('tick');
      }
    });

    socket.on("player-sold", (data: any) => {
      setAuctionState((prev: any) => ({ ...prev, status: 'sold' }));
      setTeams(prev => prev.map(t => t.id === data.team.id ? data.team : t));
      setPlayers(prev => prev.map(p => p.id === data.player.id ? data.player : p));
      playAudioEffect('gavel');
    });
    socket.on("player-unsold", (data: any) => {
      setAuctionState((prev: any) => ({ ...prev, status: 'unsold' }));
      setPlayers(prev => prev.map(p => p.id === data.player.id ? { ...p, status: 'unsold' } : p));
    });

    return () => {
      // Only disconnect if we are actually going back to start
      // Note: During Fast Refresh, this might run. In a real app we'd handle it better,
      // but for this lab, let's keep it simple.
    };
  }, [pageMode === 'initial']); // Only re-run if we explicitly go back to 'initial'

  // Effect to emit check-room when room code changes
  useEffect(() => {
    if (pageMode === 'join' && joinRoomId.length === 6 && socketRef.current) {
      socketRef.current.emit("check-room", { roomId: joinRoomId });
    } else if (joinRoomId.length < 6) {
      setTakenTeamIds([]);
    }
  }, [joinRoomId, pageMode]);

  // Consolidate room joining into the connect listener and manual handles
  useEffect(() => {
    if (isJoined && socketRef.current && socketRef.current.connected) {
      if (stateRef.current.isHost) {
        console.log("Emitting create-room (manual/effect)");
        socketRef.current.emit("create-room", {
          userId: stateRef.current.userName,
          maxHumans: stateRef.current.maxHumans
        });
      } else if (stateRef.current.roomId || stateRef.current.joinRoomId) {
        console.log("Emitting join-room (manual/effect)");
        socketRef.current.emit("join-room", {
          roomId: stateRef.current.roomId || stateRef.current.joinRoomId,
          userId: stateRef.current.userName,
          teamId: stateRef.current.selectedTeamId
        });
      }
    }
  }, [isJoined]);

  const handleCreateRoom = () => {
    if (!userName || !selectedTeamId) {
      setCustomAlert({ show: true, message: "PLEASE ENTER YOUR NAME AND SELECT A FRANCHISE!" });
      return;
    }
    setIsHost(true);
    setIsJoined(true);
  };

  const handleJoinRoom = () => {
    if (!userName || !selectedTeamId) {
      setCustomAlert({ show: true, message: "PLEASE ENTER YOUR NAME AND SELECT A FRANCHISE!" });
      return;
    }
    if (!joinRoomId) {
      setCustomAlert({ show: true, message: "PLEASE ENTER A VALID ROOM CODE!" });
      return;
    }
    setRoomId(joinRoomId);
    setIsJoined(true);
  };

  const handleBid = () => {
    if (!currentPlayer || auctionState?.status !== 'bidding' || !socketRef.current) return;
    if (auctionState.highestBidderId === myTeamId) return; // Prevent self-bidding

    // First bid acts as exactly the base price
    // Next bids are incremented by 0.25
    const incrementedBid = auctionState.highestBidderId === null ? auctionState.currentBid : auctionState.currentBid + 0.25;

    socketRef.current.emit("place-bid", { roomId, teamId: myTeamId, bidAmount: parseFloat(incrementedBid.toFixed(2)) });
  };

  const handleSkip = () => {
    if (!currentPlayer || auctionState?.status !== 'bidding' || !socketRef.current) return;
    socketRef.current.emit("skip-player", { roomId, teamId: myTeamId });
  };

  const startNextAuction = () => {
    if (socketRef.current) {
      socketRef.current.emit("start-auction-manually", { roomId });
    }
  };

  const myTeam = teams.find(t => t.id === myTeamId);

  const computePlayerSplits = () => {
    let currentIndex = 0;
    if (currentPlayer) {
      const foundIdx = players.findIndex(p => p.id === currentPlayer.id);
      if (foundIdx !== -1) currentIndex = foundIdx;
    } else {
      currentIndex = auctionState?.currentPlayerIndex || 0;
    }
    const isRoundOver = auctionState?.status === 'sold' || auctionState?.status === 'unsold';

    // Upcoming strictly after current index
    const upcomingPlayers = players.slice(currentIndex + 1).filter((p: any) => !currentPlayer || p.id !== currentPlayer.id);

    // Past strictly before current index (or includes current index if the round has finished completely)
    const pastPlayers = players.slice(0, isRoundOver ? currentIndex + 1 : currentIndex).reverse();

    return { upcomingPlayers, pastPlayers };
  };
  const { upcomingPlayers, pastPlayers } = computePlayerSplits();

  if (pageMode !== 'auction') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', padding: '60px 20px', position: 'relative' }}>
        <div className="blob" style={{ background: 'var(--mi-blue)', top: '10%', left: '5%', opacity: 0.15 }}></div>
        <div className="blob" style={{ background: 'var(--rcb-red)', bottom: '10%', right: '5%', opacity: 0.15 }}></div>

        <header style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <motion.img
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            src="/ipl.png"
            alt="TATA IPL AUCTION"
            style={{ height: '140px', width: 'auto', marginBottom: '20px' }}
          />
        </header>

        <AnimatePresence>
          {customAlert.show && (
            <motion.div key="custom-alert-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass"
                style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <X size={30} color="#ef4444" strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px', marginBottom: '12px' }}>ATTENTION REQUIRED</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', lineHeight: 1.4, marginBottom: '32px' }}>{customAlert.message}</p>
                <button
                  onClick={() => setCustomAlert({ ...customAlert, show: false })}
                  className="btn-primary"
                  style={{ width: '100%', padding: '16px' }}
                >
                  GOT IT, BOSS!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLeaveConfirm && (
            <motion.div key="leave-confirm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLeaveConfirm(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass"
                style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <X size={30} color="#ef4444" strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444', letterSpacing: '4px', marginBottom: '12px' }}>LEAVE AUCTION?</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: '32px' }}>Are you sure you want to exit? Your progress might be disrupted.</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="btn-secondary glass"
                    style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  >
                    RESUME
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('auctionSession');
                      setShowLeaveConfirm(false);
                      setPageMode('initial');
                      setIsJoined(false);
                      setJoinRoomId("");
                      setIsHost(false);
                      setErrorStatus("");
                    }}
                    className="btn-primary"
                    style={{ flex: 1, padding: '16px', background: '#ef4444', color: '#fff' }}
                  >
                    EXIT
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUpcomingModal && (
            <motion.div key="upcoming-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUpcomingModal(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass"
                style={{ position: 'relative', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px' }}>UPCOMING PLAYERS</h3>
                  <button onClick={() => setShowUpcomingModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingPlayers.map((p: any) => (
                    <div key={p.id} className="glass" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', padding: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800 }}>{p.role.toUpperCase()}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>{p.country.toUpperCase()}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 950, textAlign: 'right' }}>{(p.basePrice / 100).toFixed(2)} Cr</div>
                    </div>
                  ))}
                  {upcomingPlayers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>No upcoming players!</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPastModal && (
            <motion.div key="past-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPastModal(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass"
                style={{ position: 'relative', width: '100%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px' }}>SOLD & UNSOLD</h3>
                  <button onClick={() => setShowPastModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pastPlayers.map((p: any) => {
                    const soldTeam = p.teamId ? teams.find(t => t.id === p.teamId) : null;
                    return (
                      <div key={p.id} className="glass" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '12px', padding: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderLeft: p.status === 'sold' && soldTeam ? `4px solid ${soldTeam.color}` : '4px solid #ef4444' }}>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800 }}>{p.role.toUpperCase()}</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: p.status === 'sold' ? '#4ade80' : '#ef4444' }}>{p.status.toUpperCase()}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 950, textAlign: 'right' }}>
                          {p.status === 'sold' && soldTeam ? (
                            <span style={{ color: soldTeam.color }}>{soldTeam.name} ({p.soldPrice?.toFixed(2)} Cr)</span>
                          ) : '0 Cr'}
                        </div>
                      </div>
                    );
                  })}
                  {pastPlayers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>No players auctioned yet!</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {(pageMode === 'initial' || pageMode === 'host' || pageMode === 'join') && (
          <div style={{ width: '100%', maxWidth: '800px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Glowing Orbs for Glass Refraction */}
            <div style={{ position: 'absolute', top: '50%', left: '-20%', transform: 'translateY(-50%)', width: '350px', height: '350px', background: 'var(--csk-yellow)', filter: 'blur(100px)', opacity: 0.15, pointerEvents: 'none', zIndex: -1 }}></div>
            <div style={{ position: 'absolute', top: '50%', right: '-20%', transform: 'translateY(-50%)', width: '350px', height: '350px', background: 'var(--dc-blue)', filter: 'blur(100px)', opacity: 0.3, pointerEvents: 'none', zIndex: -1 }}></div>

            {pageMode === 'initial' ? (
              <div className="glass" style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '750px', padding: '25px', marginBottom: '40px' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, height: '180px', fontSize: '1.6rem', position: 'relative' }}
                  onClick={() => setPageMode('host')}
                >
                  <div style={{ fontSize: '10px', letterSpacing: '4px', marginBottom: '10px', opacity: 0.6 }}>START NEW</div>
                  HOST <br /> GAME
                </button>
                <button
                  className="btn-secondary glass"
                  style={{ flex: 1, height: '180px', fontSize: '1.6rem', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.05)', color: '#fff', transition: 'all 0.3s' }}
                  onClick={() => setPageMode('join')}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  <div style={{ fontSize: '10px', letterSpacing: '4px', marginBottom: '10px', opacity: 0.8, fontWeight: 900 }}>ENTER CODE</div>
                  JOIN <br /> GAME
                </button>
              </div>
            ) : (
              <>
                <div className="glass" style={{ width: '100%', maxWidth: '650px', padding: '70px 35px 25px', marginBottom: '30px', position: 'relative' }}>
                  <button
                    onClick={() => {
                      setPageMode('initial');
                      setIsJoined(false);
                      setJoinRoomId("");
                      setIsHost(false);
                      setErrorStatus("");
                    }}
                    style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 20 }}
                  >
                    <X size={14} /> BACK TO MENU
                  </button>

                  <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '4px', marginBottom: '12px', display: 'block' }}>MANAGER NAME</label>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <input
                      type="text"
                      placeholder="Enter your name..."
                      className="input-premium"
                      style={{ flex: 1 }}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>

                  {pageMode === 'host' && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '4px', marginBottom: '12px', display: 'block' }}>HUMAN ENTRANTS (1-10)</label>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                          onClick={() => setMaxHumans(Math.max(1, maxHumans - 1))}
                          className="btn-secondary"
                          style={{ width: '60px', height: '60px', padding: 0, borderRadius: '16px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          -
                        </button>
                        <div style={{ minWidth: '100px' }}>
                          <span style={{ fontSize: '3.5rem', fontWeight: 950, color: 'white', display: 'block', lineHeight: 1 }}>{maxHumans}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase' }}>Slots</span>
                        </div>
                        <button
                          onClick={() => setMaxHumans(Math.min(10, maxHumans + 1))}
                          className="btn-primary"
                          style={{ width: '60px', height: '60px', padding: 0, borderRadius: '16px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          +
                        </button>
                      </div>
                      <p style={{ fontSize: '10px', color: '#64748b', marginTop: '16px', fontWeight: 700, letterSpacing: '1px' }}>REMAINING SPOTS WILL BE FILLED BY ELITE BOTS</p>
                    </div>
                  )}

                  {pageMode === 'join' && (
                    <div style={{ marginTop: '20px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '4px', marginBottom: '12px', display: 'block' }}>ROOM CODE</label>
                      <input type="text" placeholder="EX: ABC123" className="input-premium" style={{ textAlign: 'center', letterSpacing: '8px' }} value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())} />
                      {errorStatus && <p style={{ color: '#ef4444', marginTop: '10px', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>{errorStatus}</p>}
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#fff', marginBottom: '20px', letterSpacing: '5px', opacity: 0.8 }}>CHOOSE YOUR FRANCHISE</h3>
                <div className="franchise-grid">
                  {teamData.map((team) => {
                    const isTaken = takenTeamIds.includes(team.id);
                    return (
                      <motion.div
                        key={team.id}
                        whileHover={!isTaken ? { y: -5 } : {}}
                        onClick={() => !isTaken && setSelectedTeamId(team.id)}
                        className={`team-card ${selectedTeamId === team.id ? 'selected' : ''}`}
                        style={{
                          background: `linear-gradient(135deg, ${team.color}, rgba(0,0,0,0.8))`,
                          '--team-secondary': team.secondary,
                          opacity: isTaken ? 0.3 : 1,
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          filter: isTaken ? 'grayscale(0.8)' : 'none'
                        } as any}
                      >
                        <div className="team-logo-container">
                          <img src={team.logo} className="team-logo-img" />
                        </div>
                        {isTaken && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '20px' }}>
                            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 950, letterSpacing: '2px', background: '#ef4444', padding: '4px 10px', borderRadius: '4px' }}>TAKEN</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '30px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn-primary"
                    style={{ padding: '20px 40px', width: '100%', maxWidth: '400px', fontSize: '1.4rem', opacity: (!selectedTeamId || isJoined) ? 0.5 : 1, pointerEvents: (!selectedTeamId || isJoined) ? 'none' : 'auto' }}
                    onClick={pageMode === 'join' || joinRoomId ? handleJoinRoom : handleCreateRoom}
                  >
                    {!selectedTeamId ? 'SELECT A FRANCHISE FIRST' : isJoined ? 'CONNECTING...' : 'ENTER ARENA'}
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {pageMode === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ width: '100%', maxWidth: '850px', padding: '50px', position: 'relative', zIndex: 10, textAlign: 'center' }}
          >
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '4rem', fontWeight: 950, marginBottom: '8px' }}>ARENA</h1>
              <p style={{ color: 'var(--accent)', fontWeight: 800, letterSpacing: '4px' }}>ROOM ID: {roomId}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '50px' }}>
              {teams.map(t => (
                <div key={t.id} className="stat-card" style={{ padding: '20px 12px', borderTop: `4px solid ${teamData.find(td => td.id === t.id)?.color}`, opacity: t.isBot ? 0.4 : 1 }}>
                  <img src={t.logo} style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '12px' }} />
                  <p style={{ fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}>{t.short}</p>
                  <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 800 }}>{t.isBot ? 'BOT' : t.owner.toUpperCase()}</span>
                </div>
              ))}
            </div>

            <div className="glass" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', marginBottom: '4px' }}>WAITING FOR HUMANS</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 950 }}>{auctionState?.maxHumans - auctionState?.joinedPlayers} MORE SLOTS</h2>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '12px 24px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    setCustomAlert({ show: true, message: "ROOM CODE COPIED TO CLIPBOARD!" });
                  }}
                >
                  COPY CODE
                </button>
                {isHost && (
                  <button className="btn-primary glimmer-btn" style={{ padding: '12px 32px' }} onClick={startNextAuction}>START NOW</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  const sheetTeam = teams.find(t => t.id === teamSheetId);
  const sheetTeamInfo = teamData.find(t => t.id === teamSheetId);

  return (
    <main style={{ minHeight: '100vh', padding: '32px', maxWidth: '1400px', margin: '0 auto', background: 'transparent' }}>
      <AnimatePresence>
        {customAlert.show && (
          <motion.div key="custom-alert-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomAlert({ ...customAlert, show: false })}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <X size={30} color="#ef4444" strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px', marginBottom: '12px' }}>ATTENTION REQUIRED</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', lineHeight: 1.4, marginBottom: '32px' }}>{customAlert.message}</p>
              <button
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                className="btn-primary"
                style={{ width: '100%', padding: '16px' }}
              >
                GOT IT, BOSS!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div key="leave-confirm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveConfirm(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <X size={30} color="#ef4444" strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444', letterSpacing: '4px', marginBottom: '12px' }}>LEAVE AUCTION?</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: '32px' }}>Are you sure you want to exit? Your progress might be disrupted.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="btn-secondary glass"
                  style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                >
                  RESUME
                </button>
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    setPageMode('initial');
                    setIsJoined(false);
                    setJoinRoomId("");
                    setIsHost(false);
                    setErrorStatus("");
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '16px', background: '#ef4444', color: '#fff' }}
                >
                  EXIT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpcomingModal && (
          <motion.div key="upcoming-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpcomingModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px' }}>UPCOMING PLAYERS</h3>
                <button onClick={() => setShowUpcomingModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingPlayers.map((p: any) => (
                  <div key={p.id} className="glass" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', padding: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800 }}>{p.role.toUpperCase()}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>{p.country.toUpperCase()}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 950, textAlign: 'right' }}>{(p.basePrice / 100).toFixed(2)} Cr</div>
                  </div>
                ))}
                {upcomingPlayers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>No upcoming players!</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPastModal && (
          <motion.div key="past-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPastModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass"
              style={{ position: 'relative', width: '100%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '4px' }}>SOLD & UNSOLD</h3>
                <button onClick={() => setShowPastModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastPlayers.map((p) => {
                  const soldTeam = p.teamId ? teams.find(t => t.id === p.teamId) : null;
                  return (
                    <div key={p.id} className="glass" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '12px', padding: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderLeft: p.status === 'sold' && soldTeam ? `4px solid ${soldTeam.color}` : '4px solid #ef4444' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800 }}>{p.role.toUpperCase()}</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: p.status === 'sold' ? '#4ade80' : '#ef4444' }}>{p.status.toUpperCase()}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 950, textAlign: 'right' }}>
                        {p.status === 'sold' && soldTeam ? (
                          <span style={{ color: soldTeam.color }}>{soldTeam.short} ({p.soldPrice?.toFixed(2)} Cr)</span>
                        ) : '0 Cr'}
                      </div>
                    </div>
                  );
                })}
                {pastPlayers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>No players auctioned yet!</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {teamSheetId && sheetTeam && (
          <motion.div
            key="team-sheet-overlay"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <Stat value={`${myTeam?.budget.toFixed(2)} Cr`} label="PURSE" color={myTeam?.color} />
          <Stat value={`${myTeam?.squad.length}/21`} label="SQUAD" color={myTeam?.color} />
          <Stat value={`${myTeam?.foreignCount}/8`} label="OVERSEAS" color={myTeam?.color} />
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', position: 'relative', zIndex: 10 }}>
        <div className="glass" style={{ minWidth: 0, padding: auctionState?.status === 'bidding' && currentPlayer ? '85px 60px 40px' : '70px 60px 40px', textAlign: 'center', position: 'relative', border: `1px solid rgba(255,255,255,0.08)`, minHeight: '650px', display: 'flex', flexDirection: 'column', justifyContent: auctionState?.status === 'bidding' && currentPlayer ? 'flex-start' : 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: myTeam?.color, opacity: 0.05, zIndex: 0, borderRadius: '24px' }}></div>

          <button
            onClick={() => setShowLeaveConfirm(true)}
            style={{ position: 'absolute', top: '25px', left: '25px', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 20 }}
          >
            <X size={14} /> BACK TO MENU
          </button>

          <AnimatePresence mode="wait">
            {auctionState?.status === 'finished' ? (
              <PostAuctionScreen key="post-auction" teams={teams} players={players} teamData={teamData} />
            ) : auctionState?.status === 'bidding' && currentPlayer ? (
              <motion.div
                key={currentPlayer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '50px', alignItems: 'center', textAlign: 'left' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ background: 'var(--accent)', color: 'black', padding: '4px 12px', borderRadius: '30px', fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px' }}>{currentPlayer.role}</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '30px', fontSize: '10px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px' }}>{currentPlayer.country}</span>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ef4444', letterSpacing: '1px', marginLeft: '2px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>⚠ YOU NEED MIN 15 PLAYERS</span>
                      <motion.div
                        animate={auctionState?.timer <= 3 ? { scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(239,68,68,0)", "0px 0px 30px rgba(239,68,68,0.8)", "0px 0px 0px rgba(239,68,68,0)"] } : {}}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: auctionState?.timer <= 3 ? '#ef4444' : 'rgba(255,255,255,0.05)', color: auctionState?.timer <= 3 ? '#fff' : 'var(--accent)', border: `1px solid ${auctionState?.timer <= 3 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, padding: '4px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: 950, letterSpacing: '1px', transition: auctionState?.timer <= 3 ? 'none' : 'all 0.3s' }}>
                        <Timer size={14} />
                        {auctionState?.timer <= 3 ? `FINAL CALL : ${auctionState?.timer}S` : `${auctionState?.timer}S`}
                      </motion.div>
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 4rem)', fontWeight: 950, lineHeight: 1.1, marginBottom: '32px', letterSpacing: '-2px' }}>{currentPlayer.name}</h1>

                    <div className="glass" style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', marginBottom: '40px', borderRadius: '30px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 950, color: 'var(--accent)', marginBottom: '24px', letterSpacing: '4px' }}>ARENA STATISTICS</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <MiniStat label="MATCHES" value={currentPlayer.stats?.matches} icon={<Users size={14} />} />
                        {currentPlayer.stats?.runs && <MiniStat label="RUNS" value={currentPlayer.stats?.runs} icon={<TrendingUp size={14} />} />}
                        {currentPlayer.stats?.wickets && <MiniStat label="WKTS" value={currentPlayer.stats?.wickets} icon={<Zap size={14} />} />}
                        <MiniStat label="STR RATE" value={currentPlayer.stats?.sr} icon={<Star size={14} />} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <span style={{ fontSize: '2.5rem', color: 'var(--accent)', fontWeight: 950 }}>₹</span>
                      <p className="glow-text" style={{ fontSize: 'clamp(4rem, 6vw, 5.5rem)', fontWeight: 950, lineHeight: 1 }}>{auctionState.currentBid.toFixed(2)}</p>
                      <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 900 }}>CR</span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 900, color: '#94a3b8', letterSpacing: '4px', marginBottom: '40px', marginTop: '10px' }}>CURRENT MARKET VALUATION</p>

                    <button
                      onClick={handleBid}
                      disabled={auctionState.highestBidderId === myTeamId}
                      className={`btn-primary ${auctionState.highestBidderId !== myTeamId ? 'glimmer-btn' : ''}`}
                      style={{
                        width: '100%',
                        fontSize: '1.8rem',
                        height: '90px',
                        borderRadius: '28px',
                        background: auctionState.highestBidderId === myTeamId ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
                        opacity: 1,
                        cursor: auctionState.highestBidderId === myTeamId ? 'not-allowed' : 'pointer',
                        color: auctionState.highestBidderId === myTeamId ? '#fff' : '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        fontWeight: 950,
                        letterSpacing: '2px'
                      }}
                    >
                      {auctionState.highestBidderId === myTeamId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CheckCircle2 size={32} /> HOLDING
                        </div>
                      ) : 'BID'}
                    </button>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                      <button
                        onClick={() => setShowUpcomingModal(true)}
                        className="btn-secondary glass"
                        style={{ flex: 1, padding: '16px 0', fontSize: '11px', fontWeight: 950, letterSpacing: '2px', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        UPCOMING
                      </button>
                      <button
                        onClick={() => setShowPastModal(true)}
                        className="btn-secondary glass"
                        style={{ flex: 1, padding: '16px 0', fontSize: '11px', fontWeight: 950, letterSpacing: '2px', background: 'rgba(255,255,255,0.05)', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        SOLD / UNSOLD
                      </button>
                    </div>

                    {teams.filter(t => !t.isBot).length === 1 && (
                      <button
                        onClick={handleSkip}
                        className="btn-secondary glass glimmer-btn"
                        style={{ width: '100%', marginTop: '15px', padding: '16px 0', fontSize: '12px', fontWeight: 950, letterSpacing: '2px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: '0.3s' }}
                      >
                        SKIP PLAYER (AUTO-ASSIGN)
                      </button>
                    )}
                  </div>

                  <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <AnimatePresence mode="popLayout">
                      {auctionState.highestBidderId ? (
                        (() => {
                          const bidder = teams.find(t => t.id === auctionState.highestBidderId);
                          return (
                            <motion.div
                              key={bidder?.id}
                              initial={{ scale: 0.9, opacity: 0, rotateY: 20 }}
                              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                              exit={{ scale: 1.1, opacity: 0, rotateY: -20 }}
                              className="card-glimmer"
                              style={{
                                background: `linear-gradient(135deg, ${bidder?.color} 0%, rgba(0,0,0,0.95) 100%)`,
                                padding: '50px 30px',
                                borderRadius: '40px',
                                border: `2px solid rgba(255,255,255,0.2)`,
                                boxShadow: `0 30px 60px ${bidder?.color}33`,
                                textAlign: 'center',
                                width: '100%',
                                height: '520px', // Fixed height for consistency
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
                              <p style={{ fontSize: '12px', fontWeight: 950, color: 'rgba(255,255,255,0.8)', letterSpacing: '5px', zIndex: 2 }}>DOMINANT BIDDER</p>

                              {bidder?.logo && (
                                <motion.div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, margin: '20px 0' }}>
                                  <motion.img
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    src={bidder.logo}
                                    style={{ width: '100%', maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                                  />
                                </motion.div>
                              )}

                              <div>
                                <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3.2rem)', fontWeight: 950, color: 'white', lineHeight: 1.1 }}>{bidder?.name || 'UNKNOWN'}</h2>
                                <p style={{ fontSize: '1.8rem', marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>{bidder?.short?.toUpperCase() || ''}</p>
                              </div>
                            </motion.div>
                          )
                        })()
                      ) : (
                        <div style={{ textAlign: 'center', width: '100%', opacity: 0.3 }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                          >
                            <Gavel size={160} color="white" />
                          </motion.div>
                          <p style={{ marginTop: '30px', fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '4px' }}>WAITING FOR OPENING BID</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '700px', margin: '0 auto' }}
              >
                <div className="glass" style={{ padding: '80px', borderRadius: '50px', border: '2px solid var(--accent)', background: 'rgba(5, 5, 5, 0.4)', textAlign: 'center' }}>
                  {auctionState?.status === 'sold' ? (
                    (() => {
                      const winner = teams.find(t => t.id === auctionState.highestBidderId);
                      return (
                        <motion.div initial={{ y: 20 }} animate={{ y: 0 }}>
                          <Trophy size={100} color={winner?.color || "var(--accent)"} style={{ margin: '0 auto 32px', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))' }} />
                          <h2 style={{ fontSize: '5rem', fontWeight: 950, color: 'white', marginBottom: '12px', letterSpacing: '-2px' }}>ACQUIRED!</h2>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', margin: '32px 0' }}>
                            {winner?.logo && <img src={winner.logo} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />}
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>JOINING SQUAD</p>
                              <p style={{ fontSize: '2.5rem', fontWeight: 950, color: winner?.color || 'white' }}>{winner?.name.toUpperCase()}</p>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px 40px', borderRadius: '24px', display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '3rem', fontWeight: 950, color: 'white' }}>{auctionState.currentBid.toFixed(2)}</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>CR</span>
                          </div>
                        </motion.div>
                      );
                    })()
                  ) : auctionState?.status === 'unsold' ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                      <Gavel size={120} color="#475569" style={{ margin: '0 auto 32px' }} />
                      <h2 style={{ fontSize: '5rem', fontWeight: 950, color: '#475569', letterSpacing: '-2px' }}>UNSOLD</h2>
                      <p style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: 800, marginTop: '16px', letterSpacing: '4px' }}>REMAINING IN POOL</p>
                    </motion.div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ position: 'relative', marginBottom: '40px' }}>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ position: 'absolute', inset: -20, background: 'var(--accent)', opacity: 0.1, borderRadius: '50%', filter: 'blur(30px)' }}
                        />
                        <Timer size={120} color="var(--accent)" />
                        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.5rem', fontWeight: 950, color: 'white' }}>
                          {auctionState?.timer || ''}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '4rem', fontWeight: 950, color: 'white', marginBottom: '16px', letterSpacing: '-1px' }}>PREPARING ARENA</h2>
                      <p style={{ fontSize: '1.3rem', color: '#94a3b8', fontWeight: 800, marginBottom: '40px', letterSpacing: '4px' }}>FRANCHISES ARE ASSEMBLING</p>
                      {isHost && (
                        <button className="btn-primary glimmer-btn" style={{ padding: '24px 60px', fontSize: '1.4rem' }} onClick={startNextAuction}>
                          COMMENCE AUCTION
                        </button>
                      )}
                    </div>
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

function PostAuctionScreen({ teams, players, teamData }: any) {
  // Score calculation
  const scoredTeams = teams.map((team: any) => {
    let score = team.squad.length * 2.0; // Up to ~42 points for 21 players

    let wkCount = 0;
    let batCount = 0;
    let bowlCount = 0;
    let arCount = 0;
    let starCount = 0;

    team.squad.forEach((playerId: number) => {
      const p = players.find((p: any) => p.id === playerId);
      if (p) {
        if (p.role === "Wicketkeeper") wkCount++;
        else if (p.role === "Batsman") batCount++;
        else if (p.role === "Bowler") bowlCount++;
        else if (p.role === "All-rounder") arCount++;

        if (p.basePrice >= 100) starCount++; // Star player (>= 1.0Cr base)
      }
    });

    // Balance points
    if (wkCount >= 1) score += 5;
    if (wkCount >= 2) score += 4;

    if (batCount >= 5) score += 10;
    else if (batCount >= 3) score += 5;

    if (bowlCount >= 5) score += 10;
    else if (bowlCount >= 3) score += 5;

    if (arCount >= 2) score += 10;
    else if (arCount >= 1) score += 5;

    score += (starCount * 4); // Up to 20-30 pts for star players

    // Formatting score to be out of 100 max
    score = Math.min(100, score);

    // Penalty for failing minimum squad requirement
    if (team.squad.length < 15) {
      score = 0;
    }

    const info = teamData.find((td: any) => td.id === team.id);

    return { ...team, score: Math.round(score), info };
  }).sort((a: any, b: any) => b.score - a.score);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(5, 5, 5, 0.95)', padding: '40px', borderRadius: '24px', overflowY: 'auto' }}>
      <Trophy size={80} color="var(--accent)" style={{ margin: '0 auto 20px' }} />
      <h1 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: '10px' }}>GAME OVER</h1>
      <p style={{ color: '#94a3b8', letterSpacing: '4px', fontWeight: 900, marginBottom: '40px' }}>FINAL SQUAD RATINGS ACCORDING TO OUR EXPERT AI ENGINE</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {scoredTeams.map((t: any, idx: number) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: idx === 0 ? `2px solid ${t.info?.color}` : '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '40px', fontSize: '2.5rem', fontWeight: 950, color: idx === 0 ? t.info?.color : '#94a3b8' }}>#{idx + 1}</div>
            <img src={t.info?.logo} style={{ width: '50px', height: '50px', objectFit: 'contain', margin: '0 20px' }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white' }}>{t.name}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800 }}>{t.squad.length} Players</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--accent)' }}>{t.score} ⭐</span>
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 900 }}>RATING</p>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary glimmer-btn"
        style={{ marginTop: '40px', padding: '20px 40px', fontSize: '1.2rem', width: '100%' }}
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: 'IPL Auction Results',
              text: `I just built my IPL Squad! Scored ${scoredTeams.find((t: any) => !t.isBot)?.score || 0}/100 rating points on the Live IPL Mock Auction!`,
              url: window.location.href,
            }).catch(console.error);
          } else {
            alert('Share feature is not supported on this browser context. Please take a screenshot to share on Twitter/Instagram!');
          }
        }}
      >
        SHARE RATING TO SOCIALS
      </button>
    </motion.div>
  );
}
