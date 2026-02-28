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
    status: 'lobby' | 'starting' | 'bidding' | 'sold' | 'unsold' | 'finished' | 'waiting_accelerated';
    currentPlayerIndex: number;
    currentBid: number;
    highestBidderId: string | null;
    timer: number;
    joinedPlayers: number;
    maxHumans: number;
    hostId: string;
    isAccelerated: boolean;
    skipInProgress?: boolean;
}
