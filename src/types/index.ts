export interface Player {
    id: number;
    name: string;
    role: string;
    country: string;
    basePrice: number;
    isForeign: boolean;
    status: 'sold' | 'unsold' | 'current' | 'upcoming' | 'pending';
    soldPrice: number;
    teamId: string | null;
    image?: string;
    rating?: number;
    stats?: {
        matches: number;
        runs?: number;
        wickets?: number;
        avg?: number;
        sr: number;
        eco?: number;
    };
}

export interface Team {
    id: string;
    name: string;
    owner: string;
    budget: number; // In Crores
    squad: number[]; // Player IDs
    foreignCount: number;
    color: string;
    secondaryColor: string;
    isBot: boolean;
    logo?: string;
    short?: string;
    darkText?: boolean;
    socketId: string | null;
}

export interface AuctionState {
    currentPlayerIndex: number;
    currentBid: number;
    highestBidderId: string | null;
    timer: number;
    status: 'idle' | 'bidding' | 'sold' | 'unsold' | 'finished' | 'lobby' | 'starting' | 'waiting_accelerated';
    joinedPlayers: number;
    roomId?: string;
    maxHumans?: number;
    hostId?: string;
    isAccelerated: boolean;
}
